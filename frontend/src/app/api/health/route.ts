import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await query("SELECT 1 AS ok")
    return NextResponse.json({
      status: "ok",
      service: "edsynapse",
      database: result.rows[0]?.ok === 1 ? "connected" : "unknown",
      time: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Health check DB error:", error)
    return NextResponse.json(
      { status: "error", database: "disconnected", message: (error as Error).message },
      { status: 500 },
    )
  }
}
