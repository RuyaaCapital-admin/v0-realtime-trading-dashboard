import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const period = searchParams.get("period") || "1d"
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const apiToken = process.env.EODHD_API_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "EODHD API token not configured" }, { status: 500 })
  }

  try {
    const params = new URLSearchParams({
      api_token: apiToken,
      period,
      fmt: "json",
    })

    if (from) params.append("from", from)
    if (to) params.append("to", to)

    const response = await fetch(`https://eodhd.com/api/intraday/${symbol}?${params.toString()}`, {
      headers: {
        "User-Agent": "TradingApp/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`EODHD API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("EODHD API error:", error)
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 })
  }
}
