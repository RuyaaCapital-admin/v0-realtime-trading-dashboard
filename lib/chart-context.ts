import { create } from "zustand"
import { indicatorManager } from "./indicators"
import { createEODHDClient } from "./eodhd-api"

export interface Bar {
  t: number // timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
}

export interface Indicators {
  rsi?: number
  ema20?: number
  ema50?: number
  macd?: {
    macd: number
    signal: number
    hist: number
  }
  atr?: number
}

export interface Drawing {
  id: string
  points: { t: number; y: number }[]
  type: "trendline"
  color?: string
  lineWidth?: number
}

export interface Signal {
  signal: "BUY" | "SELL" | null
  entry: number
  sl?: number
  tp?: number
  reasons: string[]
  rr?: number
  atr?: number
}

export interface IndicatorSettings {
  showEMA: boolean
  showRSI: boolean
  showMACD: boolean
  showVolume: boolean
  autoSignals: boolean
}

export interface ChartContext {
  symbol: string
  timeframe: "1m" | "5m" | "1h" | "1d"
  recent: Bar[]
  lastCandle?: Bar
  indicators: Indicators
  drawings: Drawing[]
  signal?: Signal
  isConnected: boolean
  isLoading: boolean
  isDrawingMode: boolean
  drawingTool: "trendline" | null
  pendingDrawing: { points: { t: number; y: number }[] } | null
  indicatorSettings: IndicatorSettings

  // Actions
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: "1m" | "5m" | "1h" | "1d") => void
  updateBars: (bars: Bar[]) => void
  updateLastCandle: (candle: Bar) => void
  updateIndicators: (indicators: Partial<Indicators>) => void
  addDrawing: (drawing: Drawing) => void
  removeDrawing: (id: string) => void
  clearDrawings: () => void
  setSignal: (signal: Signal) => void
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setDrawingMode: (enabled: boolean) => void
  setDrawingTool: (tool: "trendline" | null) => void
  setPendingDrawing: (drawing: { points: { t: number; y: number }[] } | null) => void
  updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => void

  // Data management actions
  loadHistoricalData: (symbol?: string, timeframe?: "1m" | "5m" | "1h" | "1d", bars?: number) => Promise<void>
  generateSignal: () => Signal | null
}

export const useChartContext = create<ChartContext>((set, get) => ({
  symbol: "AAPL",
  timeframe: "1m",
  recent: [],
  lastCandle: undefined,
  indicators: {},
  drawings: [],
  signal: undefined,
  isConnected: false,
  isLoading: false,
  isDrawingMode: false,
  drawingTool: null,
  pendingDrawing: null,
  indicatorSettings: {
    showEMA: true,
    showRSI: true,
    showMACD: true,
    showVolume: true,
    autoSignals: true,
  },

  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  updateBars: (bars) => {
    set({ recent: bars })
    // Update indicators with new bars
    const indicators = indicatorManager.seedWithBars(bars)
    set({ indicators })

    // Auto-generate signal if enabled
    const state = get()
    if (state.indicatorSettings.autoSignals && bars.length > 0) {
      const signal = indicatorManager.generateSignal(bars[bars.length - 1].c, indicators)
      if (signal.signal) {
        set({ signal })
      }
    }
  },
  updateLastCandle: (candle) => {
    set({ lastCandle: candle })
    // Update indicators with forming candle
    const indicators = indicatorManager.updateFormingCandle(candle)
    set({ indicators })

    // Auto-generate signal if enabled
    const state = get()
    if (state.indicatorSettings.autoSignals) {
      const signal = indicatorManager.generateSignal(candle.c, indicators)
      if (signal.signal) {
        set({ signal })
      }
    }
  },
  updateIndicators: (indicators) => set((state) => ({ indicators: { ...state.indicators, ...indicators } })),
  addDrawing: (drawing) => set((state) => ({ drawings: [...state.drawings, drawing] })),
  removeDrawing: (id) => set((state) => ({ drawings: state.drawings.filter((d) => d.id !== id) })),
  clearDrawings: () => set({ drawings: [] }),
  setSignal: (signal) => set({ signal }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDrawingMode: (enabled) => set({ isDrawingMode: enabled }),
  setDrawingTool: (tool) => set({ drawingTool: tool }),
  setPendingDrawing: (drawing) => set({ pendingDrawing: drawing }),
  updateIndicatorSettings: (settings) =>
    set((state) => ({
      indicatorSettings: { ...state.indicatorSettings, ...settings },
    })),

  // Data management methods
  loadHistoricalData: async (symbol, timeframe, bars = 100) => {
    const state = get()
    const targetSymbol = symbol || state.symbol
    const targetTimeframe = timeframe || state.timeframe

    set({ isLoading: true })

    try {
      const apiClient = createEODHDClient()
      const historicalBars = await apiClient.fetchIntradayData(targetSymbol, targetTimeframe, bars)

      // Update state with new data
      set({
        recent: historicalBars,
        symbol: targetSymbol,
        timeframe: targetTimeframe,
        lastCandle: undefined, // Clear last candle when loading new data
      })

      // Update indicators
      const indicators = indicatorManager.seedWithBars(historicalBars)
      set({ indicators })

      console.log(`[v0] Loaded ${historicalBars.length} bars for ${targetSymbol}`)
    } catch (error) {
      console.error("[v0] Error loading historical data:", error)
    } finally {
      set({ isLoading: false })
    }
  },

  generateSignal: () => {
    const state = get()
    const currentPrice = state.lastCandle?.c || state.recent[state.recent.length - 1]?.c

    if (!currentPrice || !state.indicators) {
      return null
    }

    const signal = indicatorManager.generateSignal(currentPrice, state.indicators)
    set({ signal })
    return signal
  },
}))
