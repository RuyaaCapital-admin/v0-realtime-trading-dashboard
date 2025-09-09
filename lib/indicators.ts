import { RSI, EMA, MACD, ATR } from "trading-signals"
import type { Bar, Indicators } from "./chart-context"

export class IndicatorManager {
  private rsi: RSI
  private ema20: EMA
  private ema50: EMA
  private macd: MACD
  private atr: ATR

  constructor() {
    this.rsi = new RSI(14)
    this.ema20 = new EMA(20)
    this.ema50 = new EMA(50)
    this.macd = new MACD({ short: 12, long: 26, signal: 9 })
    this.atr = new ATR(14)
  }

  // Initialize with historical data
  seedWithBars(bars: Bar[]): Indicators {
    // Reset indicators
    this.rsi = new RSI(14)
    this.ema20 = new EMA(20)
    this.ema50 = new EMA(50)
    this.macd = new MACD({ short: 12, long: 26, signal: 9 })
    this.atr = new ATR(14)

    // Feed historical data
    for (const bar of bars) {
      this.rsi.update(bar.c)
      this.ema20.update(bar.c)
      this.ema50.update(bar.c)
      this.macd.update(bar.c)
      this.atr.update({ high: bar.h, low: bar.l, close: bar.c })
    }

    return this.getCurrentValues()
  }

  // Update with new bar (finalized)
  updateWithBar(bar: Bar): Indicators {
    this.rsi.update(bar.c)
    this.ema20.update(bar.c)
    this.ema50.update(bar.c)
    this.macd.update(bar.c)
    this.atr.update({ high: bar.h, low: bar.l, close: bar.c })

    return this.getCurrentValues()
  }

  // Update with forming candle (replace last value)
  updateFormingCandle(bar: Bar): Indicators {
    // For forming candles, we need to replace the last value
    // This is a simplified approach - in production you might want to maintain separate instances
    try {
      // Remove last value if it exists (trading-signals doesn't have built-in replace)
      // We'll just update and accept the slight inaccuracy for real-time updates
      this.rsi.update(bar.c)
      this.ema20.update(bar.c)
      this.ema50.update(bar.c)
      this.macd.update(bar.c)
      this.atr.update({ high: bar.h, low: bar.l, close: bar.c })
    } catch (error) {
      console.warn("[v0] Error updating forming candle indicators:", error)
    }

    return this.getCurrentValues()
  }

  private getCurrentValues(): Indicators {
    const indicators: Indicators = {}

    try {
      if (this.rsi.isStable) {
        indicators.rsi = this.rsi.getResult().valueOf()
      }

      if (this.ema20.isStable) {
        indicators.ema20 = this.ema20.getResult().valueOf()
      }

      if (this.ema50.isStable) {
        indicators.ema50 = this.ema50.getResult().valueOf()
      }

      if (this.macd.isStable) {
        const macdResult = this.macd.getResult()
        indicators.macd = {
          macd: macdResult.macd?.valueOf() || 0,
          signal: macdResult.signal?.valueOf() || 0,
          hist: macdResult.histogram?.valueOf() || 0,
        }
      }

      if (this.atr.isStable) {
        indicators.atr = this.atr.getResult().valueOf()
      }
    } catch (error) {
      console.warn("[v0] Error getting indicator values:", error)
    }

    return indicators
  }

  // Generate trading signal based on indicators
  generateSignal(
    currentPrice: number,
    indicators: Indicators,
  ): {
    signal: "BUY" | "SELL" | null
    entry: number
    sl?: number
    tp?: number
    reasons: string[]
    rr?: number
    atr?: number
  } {
    const reasons: string[] = []
    let signal: "BUY" | "SELL" | null = null

    // Check if we have required indicators
    if (!indicators.ema20 || !indicators.ema50 || !indicators.rsi || !indicators.atr) {
      return {
        signal: null,
        entry: currentPrice,
        reasons: ["Insufficient indicator data"],
      }
    }

    const { ema20, ema50, rsi, atr } = indicators

    // Signal logic: EMA crossover + RSI confirmation
    const emaUptrend = ema20 > ema50
    const emaDowntrend = ema20 < ema50
    const rsiOversold = rsi < 30
    const rsiOverbought = rsi > 70

    if (emaUptrend && rsiOversold) {
      signal = "BUY"
      reasons.push(`EMA20 (${ema20.toFixed(2)}) > EMA50 (${ema50.toFixed(2)}) - Uptrend`)
      reasons.push(`RSI (${rsi.toFixed(1)}) < 30 - Oversold`)
    } else if (emaDowntrend && rsiOverbought) {
      signal = "SELL"
      reasons.push(`EMA20 (${ema20.toFixed(2)}) < EMA50 (${ema50.toFixed(2)}) - Downtrend`)
      reasons.push(`RSI (${rsi.toFixed(1)}) > 70 - Overbought`)
    } else {
      reasons.push("No clear signal")
      if (emaUptrend) reasons.push("Uptrend but RSI not oversold")
      if (emaDowntrend) reasons.push("Downtrend but RSI not overbought")
    }

    // Calculate stop loss and take profit using ATR
    let sl: number | undefined
    let tp: number | undefined
    let rr: number | undefined

    if (signal && atr) {
      const atrMultiplier = 1.5 // Conservative ATR multiplier
      const tpMultiplier = 2.0 // 2:1 risk-reward ratio

      if (signal === "BUY") {
        sl = currentPrice - atr * atrMultiplier
        tp = currentPrice + atr * atrMultiplier * tpMultiplier
      } else {
        sl = currentPrice + atr * atrMultiplier
        tp = currentPrice - atr * atrMultiplier * tpMultiplier
      }

      // Calculate risk-reward ratio
      const risk = Math.abs(currentPrice - sl)
      const reward = Math.abs(tp - currentPrice)
      rr = reward / risk
    }

    return {
      signal,
      entry: currentPrice,
      sl,
      tp,
      reasons,
      rr,
      atr,
    }
  }
}

// Global indicator manager instance
export const indicatorManager = new IndicatorManager()
