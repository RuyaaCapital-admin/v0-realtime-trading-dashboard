import { useChartContext } from "./chart-context"
import { indicatorManager } from "./indicators"
import type { Bar } from "./chart-context"

export class EODHDWebSocketClient {
  private ws: WebSocket | null = null
  private currentCandle: Partial<Bar> | null = null
  private candleStartTime = 0
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(
    private apiToken: string,
    private feed: "us" | "us-quote" | "forex" | "crypto" = "us",
  ) {}

  connect(symbol: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://ws.eodhistoricaldata.com/ws/${this.feed}?api_token=${this.apiToken}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("[v0] WebSocket connected")
          this.reconnectAttempts = 0
          useChartContext.getState().setConnected(true)

          // Subscribe to symbol
          this.subscribe(symbol)
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error("[v0] Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = () => {
          console.log("[v0] WebSocket disconnected")
          useChartContext.getState().setConnected(false)
          this.attemptReconnect(symbol)
        }

        this.ws.onerror = (error) => {
          console.error("[v0] WebSocket error:", error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private subscribe(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        action: "subscribe",
        symbols: symbol,
      }
      this.ws.send(JSON.stringify(subscribeMessage))
      console.log(`[v0] Subscribed to ${symbol}`)
    }
  }

  private handleMessage(data: any) {
    if (data.s && data.p && data.t) {
      // Real-time tick data
      const tick = {
        symbol: data.s,
        price: Number.parseFloat(data.p),
        timestamp: data.t * 1000, // Convert to milliseconds
        volume: data.v || 0,
      }

      this.updateCandle(tick)
    }
  }

  private updateCandle(tick: any) {
    const now = tick.timestamp
    const candleTime = Math.floor(now / 60000) * 60000 // Round to minute

    // If this is a new candle period
    if (candleTime !== this.candleStartTime) {
      // Finalize previous candle if exists
      if (this.currentCandle && this.candleStartTime > 0) {
        const completedCandle: Bar = {
          t: this.candleStartTime / 1000,
          o: this.currentCandle.o!,
          h: this.currentCandle.h!,
          l: this.currentCandle.l!,
          c: this.currentCandle.c!,
          v: this.currentCandle.v!,
        }

        // Add to recent bars and update indicators
        const state = useChartContext.getState()
        const newBars = [...state.recent, completedCandle].slice(-500) // Keep last 500 bars
        state.updateBars(newBars)

        const indicators = indicatorManager.updateWithBar(completedCandle)
        state.updateIndicators(indicators)
      }

      // Start new candle
      this.candleStartTime = candleTime
      this.currentCandle = {
        o: tick.price,
        h: tick.price,
        l: tick.price,
        c: tick.price,
        v: tick.volume,
      }
    } else {
      // Update current candle
      if (this.currentCandle) {
        this.currentCandle.h = Math.max(this.currentCandle.h!, tick.price)
        this.currentCandle.l = Math.min(this.currentCandle.l!, tick.price)
        this.currentCandle.c = tick.price
        this.currentCandle.v = (this.currentCandle.v || 0) + tick.volume
      }
    }

    // Update last candle in context
    if (this.currentCandle) {
      const lastCandle: Bar = {
        t: this.candleStartTime / 1000,
        o: this.currentCandle.o!,
        h: this.currentCandle.h!,
        l: this.currentCandle.l!,
        c: this.currentCandle.c!,
        v: this.currentCandle.v!,
      }
      useChartContext.getState().updateLastCandle(lastCandle)
    }
  }

  private attemptReconnect(symbol: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[v0] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect(symbol)
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    useChartContext.getState().setConnected(false)
  }
}

// Mock WebSocket for development
export class MockWebSocketClient {
  private interval: NodeJS.Timeout | null = null
  private currentPrice = 150 + Math.random() * 50
  private currentCandle: Partial<Bar> | null = null
  private candleStartTime = 0

  connect(symbol: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log("[v0] Mock WebSocket connected")
      useChartContext.getState().setConnected(true)

      // Generate mock ticks every 1-3 seconds
      this.interval = setInterval(
        () => {
          this.generateMockTick()
        },
        1000 + Math.random() * 2000,
      )

      resolve(true)
    })
  }

  private generateMockTick() {
    // Random walk price movement
    const change = (Math.random() - 0.5) * 2
    this.currentPrice += change
    this.currentPrice = Math.max(100, Math.min(300, this.currentPrice))

    const tick = {
      symbol: "AAPL",
      price: this.currentPrice,
      timestamp: Date.now(),
      volume: Math.floor(Math.random() * 1000) + 100,
    }

    this.updateCandle(tick)
  }

  private updateCandle(tick: any) {
    const now = tick.timestamp
    const candleTime = Math.floor(now / 60000) * 60000

    // If this is a new candle period
    if (candleTime !== this.candleStartTime) {
      // Finalize previous candle if exists
      if (this.currentCandle && this.candleStartTime > 0) {
        const completedCandle: Bar = {
          t: this.candleStartTime / 1000,
          o: this.currentCandle.o!,
          h: this.currentCandle.h!,
          l: this.currentCandle.l!,
          c: this.currentCandle.c!,
          v: this.currentCandle.v!,
        }

        // Add to recent bars and update indicators
        const state = useChartContext.getState()
        const newBars = [...state.recent, completedCandle].slice(-500)
        state.updateBars(newBars)

        const indicators = indicatorManager.updateWithBar(completedCandle)
        state.updateIndicators(indicators)
      }

      // Start new candle
      this.candleStartTime = candleTime
      this.currentCandle = {
        o: tick.price,
        h: tick.price,
        l: tick.price,
        c: tick.price,
        v: tick.volume,
      }
    } else {
      // Update current candle
      if (this.currentCandle) {
        this.currentCandle.h = Math.max(this.currentCandle.h!, tick.price)
        this.currentCandle.l = Math.min(this.currentCandle.l!, tick.price)
        this.currentCandle.c = tick.price
        this.currentCandle.v = (this.currentCandle.v || 0) + tick.volume
      }
    }

    // Update last candle in context
    if (this.currentCandle) {
      const lastCandle: Bar = {
        t: this.candleStartTime / 1000,
        o: this.currentCandle.o!,
        h: this.currentCandle.h!,
        l: this.currentCandle.l!,
        c: this.currentCandle.c!,
        v: this.currentCandle.v!,
      }
      useChartContext.getState().updateLastCandle(lastCandle)
    }
  }

  disconnect() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    useChartContext.getState().setConnected(false)
  }
}
