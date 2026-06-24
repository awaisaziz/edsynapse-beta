// Runs the numbered .sql files in this directory against Aurora PostgreSQL.
// Usage: node --env-file-if-exists=../.env.development.local scripts/run-sql.mjs [file.sql ...]
// With no args, runs every *.sql file in ascending order.
//
// Aurora uses IAM auth — there is no DATABASE_URL. We mint a short-lived auth
// token with the RDS signer, the same way the app's lib/db.ts does.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const region = process.env.AWS_REGION;
const host = process.env.PGHOST;
const user = process.env.PGUSER || "postgres";
const database = process.env.PGDATABASE || "postgres";

if (!host || !region) {
  console.error("[run-sql] Missing PGHOST/AWS_REGION. Ensure Aurora env vars are loaded.");
  process.exit(1);
}

const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region },
  }),
  region,
  hostname: host,
  username: user,
  port: 5432,
});

const client = new pg.Client({
  host,
  database,
  port: 5432,
  user,
  password: await signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
});

const args = process.argv.slice(2);
const files = (args.length > 0 ? args : readdirSync(__dirname).filter((f) => f.endsWith(".sql")).sort());

await client.connect();
console.log(`[run-sql] connected to ${host}/${database}`);

for (const f of files) {
  const path = f.includes("/") ? f : join(__dirname, f);
  const sql = readFileSync(path, "utf8");
  process.stdout.write(`[run-sql] applying ${f} ... `);
  try {
    await client.query(sql);
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("[run-sql] done");
