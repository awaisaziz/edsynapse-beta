import { Pool, type PoolClient } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";

/**
 * Aurora PostgreSQL connection pool using IAM auth (no static password).
 * SERVER ONLY. The auth token is minted on demand by the RDS signer.
 */

const region = process.env.AWS_REGION as string;
const host = process.env.PGHOST as string;
const user = process.env.PGUSER || "postgres";
const database = process.env.PGDATABASE || "postgres";

const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN as string,
    clientConfig: { region },
  }),
  region,
  hostname: host,
  username: user,
  port: 5432,
});

// RDS IAM auth tokens are valid for ~15 minutes. Minting one means an OIDC
// credential resolution + SigV4 signing round-trip, which the pg pool would
// otherwise pay on *every* new connection. Cache the token and reuse it across
// connections within a conservative window so opening a connection is fast.
const TOKEN_TTL_MS = 10 * 60 * 1000; // refresh well before the 15-min expiry
let cachedToken: { value: string; expiresAt: number } | null = null;
let inFlightToken: Promise<string> | null = null;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;
  // Coalesce concurrent refreshes so a burst of new connections mints one token.
  if (!inFlightToken) {
    inFlightToken = signer
      .getAuthToken()
      .then((value) => {
        cachedToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
        return value;
      })
      .finally(() => {
        inFlightToken = null;
      });
  }
  return inFlightToken;
}

declare global {
  // eslint-disable-next-line no-var
  var __edsynapsePool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    host,
    database,
    port: 5432,
    user,
    password: getAuthToken,
    ssl: { rejectUnauthorized: false },
    max: 10,
    // Keep connections warm so reads reuse an open socket instead of paying the
    // TLS + IAM handshake again. keepAlive prevents idle TCP teardown; a longer
    // idle timeout keeps a connection around between requests on a warm instance.
    keepAlive: true,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
  });
  attachDatabasePool(pool);
  return pool;
}

// Reuse the pool across hot-reloads in dev.
const pool = global.__edsynapsePool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__edsynapsePool = pool;

/**
 * Aurora Serverless scales down / pauses when idle, so the *first* connection
 * after an idle period can time out or be dropped while the cluster wakes. These
 * are transient — a quick retry succeeds once it's up. We only retry connection
 * establishment failures, never query errors (which would be unsafe to repeat).
 */
function isTransientConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Connection terminated|connection timeout|timeout exceeded|ECONNRESET|ETIMEDOUT|ENOTFOUND|server closed the connection/i.test(
      msg,
    )
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await pool.query(text, params as never);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isTransientConnectionError(err)) break;
      // Brief backoff to give the cluster a moment to finish waking.
      await sleep(attempt * 750);
    }
  }
  throw lastErr;
}

/** Convenience: first row or null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Multi-statement transaction helper. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
