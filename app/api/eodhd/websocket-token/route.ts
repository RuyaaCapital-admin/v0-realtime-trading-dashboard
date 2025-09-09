import { NextResponse } from "next/server"

export async function GET() {
  const apiToken = process.env.EODHD_API_TOKEN

  if (!apiToken) {
    return NextResponse.json({ error: "EODHD API token not configured" }, { status: 500 })
  }

  // Return the token for WebSocket connection
  // Note: In production, you might want to implement additional security measures
  return NextResponse.json({ token: apiToken })
}
