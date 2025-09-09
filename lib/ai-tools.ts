import { z } from "zod"
import { useChartContext } from "./chart-context"
import { webSocketManager } from "./websocket-manager"

// Tool schemas for AI agent
export const toolSchemas = {
  seed_intraday: z.object({
    symbol: z.string().describe("Stock symbol (e.g., AAPL, GOOGL)"),
    interval: z.enum(["1m", "5m", "1h", "1d"]).default("1m").describe("Chart timeframe interval"),
    bars: z.number().default(100).describe("Number of historical bars to load"),
  }),

  subscribe_live: z.object({
    feed: z.enum(["us", "us-quote", "forex", "crypto"]).default("us").describe("WebSocket feed type"),
    symbol: z.string().describe("Symbol to subscribe to for live data"),
  }),

  chart_context: z.object({}).describe("Get current chart context and indicators for analysis"),

  make_signal: z.object({
    riskPct: z.number().optional().default(2).describe("Risk percentage for position sizing"),
  }),
}

// Tool implementations
export const toolImplementations = {
  seed_intraday: async ({ symbol, interval, bars }: z.infer<typeof toolSchemas.seed_intraday>) => {
    try {
      console.log(`[v0] AI Tool: Loading ${bars} bars of ${symbol} ${interval} data`)

      const chartContext = useChartContext.getState()
      await chartContext.loadHistoricalData(symbol, interval, bars)

      const loadedBars = chartContext.recent.length

      return {
        success: true,
        loaded: loadedBars,
        symbol,
        interval,
        message: `Successfully loaded ${loadedBars} bars of ${symbol} ${interval} data`,
      }
    } catch (error) {
      console.error("[v0] AI Tool Error - seed_intraday:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load historical data",
      }
    }
  },

  subscribe_live: async ({ feed, symbol }: z.infer<typeof toolSchemas.subscribe_live>) => {
    try {
      console.log(`[v0] AI Tool: Connecting to ${feed} feed for ${symbol}`)

      const connected = await webSocketManager.connect(symbol)

      return {
        success: connected,
        feed,
        symbol,
        message: connected
          ? `Successfully connected to ${feed} live feed for ${symbol}`
          : `Failed to connect to ${feed} live feed for ${symbol}`,
      }
    } catch (error) {
      console.error("[v0] AI Tool Error - subscribe_live:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to live feed",
      }
    }
  },

  chart_context: async ({}: z.infer<typeof toolSchemas.chart_context>) => {
    try {
      const chartContext = useChartContext.getState()
      const { symbol, timeframe, lastCandle, indicators, recent, isConnected } = chartContext

      // Get latest price data
      const currentCandle = lastCandle || recent[recent.length - 1]
      const previousCandle = recent[recent.length - 2]

      // Calculate price change
      const priceChange =
        currentCandle && previousCandle ? ((currentCandle.c - previousCandle.c) / previousCandle.c) * 100 : 0

      const context = {
        symbol,
        timeframe,
        isConnected,
        currentPrice: currentCandle?.c,
        priceChange: Number.parseFloat(priceChange.toFixed(2)),
        volume: currentCandle?.v,
        indicators: {
          rsi: indicators.rsi ? Number.parseFloat(indicators.rsi.toFixed(1)) : undefined,
          ema20: indicators.ema20 ? Number.parseFloat(indicators.ema20.toFixed(2)) : undefined,
          ema50: indicators.ema50 ? Number.parseFloat(indicators.ema50.toFixed(2)) : undefined,
          atr: indicators.atr ? Number.parseFloat(indicators.atr.toFixed(2)) : undefined,
          macd: indicators.macd
            ? {
                macd: Number.parseFloat(indicators.macd.macd.toFixed(3)),
                signal: Number.parseFloat(indicators.macd.signal.toFixed(3)),
                histogram: Number.parseFloat(indicators.macd.hist.toFixed(3)),
              }
            : undefined,
        },
        barsCount: recent.length,
        timestamp: currentCandle?.t ? new Date(currentCandle.t * 1000).toISOString() : undefined,
      }

      console.log("[v0] AI Tool: Providing chart context", context)
      return context
    } catch (error) {
      console.error("[v0] AI Tool Error - chart_context:", error)
      return {
        error: error instanceof Error ? error.message : "Failed to get chart context",
      }
    }
  },

  make_signal: async ({ riskPct }: z.infer<typeof toolSchemas.make_signal>) => {
    try {
      console.log(`[v0] AI Tool: Generating trading signal with ${riskPct}% risk`)

      const chartContext = useChartContext.getState()
      const signal = chartContext.generateSignal()

      if (!signal) {
        return {
          signal: null,
          message: "Insufficient data to generate signal",
        }
      }

      // Set the signal in context to display on chart
      chartContext.setSignal(signal)

      const result = {
        signal: signal.signal,
        entry: signal.entry,
        stopLoss: signal.sl,
        takeProfit: signal.tp,
        riskReward: signal.rr,
        atr: signal.atr,
        reasons: signal.reasons,
        riskPercent: riskPct,
        message: signal.signal
          ? `Generated ${signal.signal} signal at ${signal.entry.toFixed(2)}`
          : "No clear trading signal at this time",
      }

      console.log("[v0] AI Tool: Generated signal", result)
      return result
    } catch (error) {
      console.error("[v0] AI Tool Error - make_signal:", error)
      return {
        signal: null,
        error: error instanceof Error ? error.message : "Failed to generate signal",
      }
    }
  },
}

// Helper function to execute tools (used by API route)
export async function executeTool(toolName: string, args: any) {
  switch (toolName) {
    case "seed_intraday":
      return await toolImplementations.seed_intraday(args)
    case "subscribe_live":
      return await toolImplementations.subscribe_live(args)
    case "chart_context":
      return await toolImplementations.chart_context(args)
    case "make_signal":
      return await toolImplementations.make_signal(args)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
