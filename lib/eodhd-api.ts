import type { Bar } from "./chart-context"

export interface EODHDConfig {
  useMock: boolean
}

export class EODHDApiClient {
  private config: EODHDConfig

  constructor(config: EODHDConfig) {
    this.config = config
  }

  async fetchIntradayData(symbol: string, interval: "1m" | "5m" | "1h" | "1d" = "1m", barsCount = 100): Promise<Bar[]> {
    if (this.config.useMock) {
      return this.generateMockData(barsCount)
    }

    try {
      const params = new URLSearchParams({
        symbol: `${symbol}.${this.getExchangeForSymbol(symbol)}`,
        period: interval,
      })

      const url = `/api/eodhd/historical?${params.toString()}`
      console.log(`[v0] Fetching intraday data via server: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Server API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format from server API")
      }

      // Convert EODHD format to our Bar format
      const bars: Bar[] = data
        .slice(-barsCount) // Get last N bars
        .map((item: any) => ({
          t: Math.floor(new Date(item.datetime).getTime() / 1000), // Convert to Unix timestamp
          o: Number.parseFloat(item.open),
          h: Number.parseFloat(item.high),
          l: Number.parseFloat(item.low),
          c: Number.parseFloat(item.close),
          v: Number.parseInt(item.volume) || 0,
        }))
        .filter((bar) => !Number.isNaN(bar.o)) // Filter out invalid bars

      console.log(`[v0] Fetched ${bars.length} bars for ${symbol}`)
      return bars
    } catch (error) {
      console.error("[v0] Error fetching EODHD data:", error)
      // Fallback to mock data on error
      console.log("[v0] Falling back to mock data")
      return this.generateMockData(barsCount)
    }
  }

  private getExchangeForSymbol(symbol: string): string {
    // Simple exchange mapping - in production you'd want a more comprehensive mapping
    const exchangeMap: Record<string, string> = {
      AAPL: "US",
      GOOGL: "US",
      MSFT: "US",
      TSLA: "US",
      AMZN: "US",
      NVDA: "US",
      META: "US",
      NFLX: "US",
    }

    return exchangeMap[symbol.toUpperCase()] || "US"
  }

  private generateMockData(barsCount: number): Bar[] {
    const mockBars: Bar[] = []
    const now = Date.now()
    const oneMinute = 60 * 1000

    let price = 150 + Math.random() * 50 // Random starting price between 150-200

    for (let i = barsCount - 1; i >= 0; i--) {
      const timestamp = Math.floor((now - i * oneMinute) / 1000)

      // Generate realistic OHLCV data
      const open = price
      const volatility = 0.02 // 2% volatility
      const change = (Math.random() - 0.5) * price * volatility

      const close = Math.max(0.01, open + change)
      const high = Math.max(open, close) + Math.random() * price * volatility * 0.5
      const low = Math.min(open, close) - Math.random() * price * volatility * 0.5
      const volume = Math.floor(Math.random() * 10000) + 1000

      mockBars.push({
        t: timestamp,
        o: Number.parseFloat(open.toFixed(2)),
        h: Number.parseFloat(high.toFixed(2)),
        l: Number.parseFloat(low.toFixed(2)),
        c: Number.parseFloat(close.toFixed(2)),
        v: volume,
      })

      price = close // Next bar starts where this one ended
    }

    console.log(`[v0] Generated ${mockBars.length} mock bars`)
    return mockBars
  }

  // Get WebSocket feed type based on symbol
  getWebSocketFeed(symbol: string): "us" | "us-quote" | "forex" | "crypto" {
    // Simple classification - in production you'd want more sophisticated logic
    const forexSymbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"]
    const cryptoSymbols = ["BTCUSD", "ETHUSD", "ADAUSD", "DOTUSD"]

    if (forexSymbols.includes(symbol.toUpperCase())) {
      return "forex"
    }
    if (cryptoSymbols.includes(symbol.toUpperCase())) {
      return "crypto"
    }
    return "us" // Default to US stocks
  }
}

// Create API client instance
export const createEODHDClient = (): EODHDApiClient => {
  const config: EODHDConfig = {
    useMock: process.env.NEXT_PUBLIC_USE_MOCK === "true",
  }

  if (config.useMock) {
    console.log("[v0] Using mock data mode")
  } else {
    console.log("[v0] Using EODHD API via server")
  }

  return new EODHDApiClient(config)
}
