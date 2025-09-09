import { EODHDWebSocketClient, MockWebSocketClient } from "./ws-client"
import { createEODHDClient } from "./eodhd-api"
import { useChartContext } from "./chart-context"

export class WebSocketManager {
  private wsClient: EODHDWebSocketClient | MockWebSocketClient | null = null
  private currentSymbol: string | null = null
  private isConnecting = false

  async connect(symbol: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log("[v0] WebSocket connection already in progress")
      return false
    }

    if (this.wsClient) {
      await this.disconnect()
    }

    this.isConnecting = true

    try {
      const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true"

      if (useMock) {
        console.log("[v0] Using mock WebSocket client")
        this.wsClient = new MockWebSocketClient()
      } else {
        console.log("[v0] Using EODHD WebSocket client")

        // Fetch API token from server
        const tokenResponse = await fetch("/api/eodhd/websocket-token")
        if (!tokenResponse.ok) {
          throw new Error("Failed to get WebSocket token from server")
        }

        const { token, error } = await tokenResponse.json()
        if (error) {
          throw new Error(error)
        }

        const apiClient = createEODHDClient()
        const feed = apiClient.getWebSocketFeed(symbol)
        this.wsClient = new EODHDWebSocketClient(token, feed)
      }

      const connected = await this.wsClient.connect(symbol)

      if (connected) {
        this.currentSymbol = symbol
        console.log(`[v0] WebSocket connected for ${symbol}`)
      }

      return connected
    } catch (error) {
      console.error("[v0] WebSocket connection failed:", error)
      console.log("[v0] Falling back to mock WebSocket client")
      this.wsClient = new MockWebSocketClient()
      const connected = await this.wsClient.connect(symbol)
      if (connected) {
        this.currentSymbol = symbol
      }
      return connected
    } finally {
      this.isConnecting = false
    }
  }

  async disconnect(): Promise<void> {
    if (this.wsClient) {
      this.wsClient.disconnect()
      this.wsClient = null
      this.currentSymbol = null
      console.log("[v0] WebSocket disconnected")
    }
  }

  async reconnect(): Promise<boolean> {
    if (this.currentSymbol) {
      return await this.connect(this.currentSymbol)
    }
    return false
  }

  isConnected(): boolean {
    return this.wsClient !== null && useChartContext.getState().isConnected
  }

  getCurrentSymbol(): string | null {
    return this.currentSymbol
  }
}

// Global WebSocket manager instance
export const webSocketManager = new WebSocketManager()
