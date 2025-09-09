"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, type IChartApi, type ISeriesApi, LineStyle, type MouseEventParams } from "lightweight-charts"
import { useChartContext } from "@/lib/chart-context"
import type { Drawing } from "@/lib/chart-context"

export function ChartPanel() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const drawingSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map())

  const {
    recent,
    lastCandle,
    symbol,
    timeframe,
    indicators,
    signal,
    isLoading,
    drawings,
    isDrawingMode,
    pendingDrawing,
    indicatorSettings,
    addDrawing,
    setPendingDrawing,
  } = useChartContext()

  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart with enhanced styling
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: "#d1d5db",
        fontSize: 12,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: {
          color: "#374151",
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: "#374151",
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#6b7280",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "#6b7280",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: "#4b5563",
        textColor: "#9ca3af",
      },
      timeScale: {
        borderColor: "#4b5563",
        textColor: "#9ca3af",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    })

    // Create volume series (conditionally)
    let volumeSeries: ISeriesApi<"Histogram"> | null = null
    if (indicatorSettings.showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: "#6b7280",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "",
      })

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
    }

    // Create EMA series (conditionally)
    let ema20Series: ISeriesApi<"Line"> | null = null
    let ema50Series: ISeriesApi<"Line"> | null = null

    if (indicatorSettings.showEMA) {
      ema20Series = chart.addLineSeries({
        color: "#3b82f6",
        lineWidth: 2,
        title: "EMA 20",
        priceLineVisible: false,
        lastValueVisible: true,
      })

      ema50Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        title: "EMA 50",
        priceLineVisible: false,
        lastValueVisible: true,
      })
    }

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries
    ema20SeriesRef.current = ema20Series
    ema50SeriesRef.current = ema50Series

    const handleChartClick = (param: MouseEventParams) => {
      if (!isDrawingMode || !param.time || param.point === undefined) return

      const time = param.time as number
      const price = param.point.y

      // Convert screen coordinates to price
      const priceValue = candlestickSeries.coordinateToPrice(price)
      if (priceValue === null) return

      const point = { t: time, y: priceValue }

      if (!pendingDrawing) {
        // Start new drawing
        setPendingDrawing({ points: [point] })
        setIsDrawing(true)
      } else if (pendingDrawing.points.length === 1) {
        // Complete the drawing
        const newDrawing: Drawing = {
          id: `trendline_${Date.now()}`,
          type: "trendline",
          points: [...pendingDrawing.points, point],
          color: "#3b82f6",
          lineWidth: 2,
        }

        addDrawing(newDrawing)
        setPendingDrawing(null)
        setIsDrawing(false)
      }
    }

    chart.subscribeClick(handleChartClick)

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.unsubscribeClick(handleChartClick)
      chart.remove()
    }
  }, [isDrawingMode, pendingDrawing, addDrawing, setPendingDrawing, indicatorSettings])

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current) return

    const candleData = recent.map((bar) => ({
      time: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
    }))

    candlestickSeriesRef.current.setData(candleData)

    // Update volume if enabled
    if (volumeSeriesRef.current && indicatorSettings.showVolume) {
      const volumeData = recent.map((bar) => ({
        time: bar.t,
        value: bar.v,
        color: bar.c >= bar.o ? "#10b981" : "#ef4444",
      }))
      volumeSeriesRef.current.setData(volumeData)
    }

    // Update EMA lines if enabled
    if (ema20SeriesRef.current && ema50SeriesRef.current && indicatorSettings.showEMA) {
      // For now, we'll show EMA values only where we have indicator data
      // In a real implementation, you'd calculate EMA for all historical bars
      const ema20Data = recent
        .filter((_, index) => index >= 19) // EMA20 needs at least 20 bars
        .map((bar, index) => ({
          time: bar.t,
          value: indicators.ema20 || bar.c, // Simplified - use current EMA or close
        }))

      const ema50Data = recent
        .filter((_, index) => index >= 49) // EMA50 needs at least 50 bars
        .map((bar, index) => ({
          time: bar.t,
          value: indicators.ema50 || bar.c, // Simplified - use current EMA or close
        }))

      if (ema20Data.length > 0) ema20SeriesRef.current.setData(ema20Data)
      if (ema50Data.length > 0) ema50SeriesRef.current.setData(ema50Data)
    }
  }, [recent, indicators, indicatorSettings])

  // Update last candle
  useEffect(() => {
    if (!candlestickSeriesRef.current || !lastCandle) return

    const candlePoint = {
      time: lastCandle.t,
      open: lastCandle.o,
      high: lastCandle.h,
      low: lastCandle.l,
      close: lastCandle.c,
    }

    candlestickSeriesRef.current.update(candlePoint)

    // Update volume if enabled
    if (volumeSeriesRef.current && indicatorSettings.showVolume) {
      const volumePoint = {
        time: lastCandle.t,
        value: lastCandle.v,
        color: lastCandle.c >= lastCandle.o ? "#10b981" : "#ef4444",
      }
      volumeSeriesRef.current.update(volumePoint)
    }

    // Update EMA lines if enabled
    if (ema20SeriesRef.current && indicators.ema20 && indicatorSettings.showEMA) {
      ema20SeriesRef.current.update({
        time: lastCandle.t,
        value: indicators.ema20,
      })
    }

    if (ema50SeriesRef.current && indicators.ema50 && indicatorSettings.showEMA) {
      ema50SeriesRef.current.update({
        time: lastCandle.t,
        value: indicators.ema50,
      })
    }
  }, [lastCandle, indicators, indicatorSettings])

  useEffect(() => {
    if (!chartRef.current) return

    const chart = chartRef.current
    const currentSeries = drawingSeriesRef.current

    // Remove old drawing series
    currentSeries.forEach((series) => {
      chart.removeSeries(series)
    })
    currentSeries.clear()

    // Add new drawing series
    drawings.forEach((drawing) => {
      if (drawing.type === "trendline" && drawing.points.length >= 2) {
        const lineSeries = chart.addLineSeries({
          color: drawing.color || "#3b82f6",
          lineWidth: drawing.lineWidth || 2,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })

        const lineData = drawing.points.map((point) => ({
          time: point.t,
          value: point.y,
        }))

        lineSeries.setData(lineData)
        currentSeries.set(drawing.id, lineSeries)
      }
    })
  }, [drawings])

  // Update signal markers and price lines
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current || !signal) return

    const chart = chartRef.current
    const series = candlestickSeriesRef.current

    // Clear existing markers
    series.setMarkers([])

    // Add entry marker
    if (signal.signal && lastCandle) {
      const marker = {
        time: lastCandle.t,
        position: signal.signal === "BUY" ? "belowBar" : "aboveBar",
        color: signal.signal === "BUY" ? "#10b981" : "#ef4444",
        shape: signal.signal === "BUY" ? "arrowUp" : "arrowDown",
        text: `${signal.signal} @ ${signal.entry.toFixed(2)}`,
        size: 2,
      }

      series.setMarkers([marker])

      // Add price lines for SL and TP
      if (signal.sl) {
        chart.addPriceLine({
          price: signal.sl,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL: ${signal.sl.toFixed(2)}`,
        })
      }

      if (signal.tp) {
        chart.addPriceLine({
          price: signal.tp,
          color: "#10b981",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP: ${signal.tp.toFixed(2)}`,
        })
      }
    }
  }, [signal, lastCandle])

  return (
    <div className="flex-1 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      )}

      {isDrawingMode && (
        <div className="absolute top-16 left-4 z-10 bg-primary/10 border border-primary/20 backdrop-blur-sm rounded-lg p-2">
          <div className="text-xs text-primary font-medium">
            {isDrawing ? "Click second point to complete trendline" : "Click first point to start drawing"}
          </div>
        </div>
      )}

      {/* Chart Info Panel */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 min-w-52 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg font-bold">{symbol}</div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{timeframe}</div>
          {drawings.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {drawings.length} drawing{drawings.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {lastCandle && (
          <div className="text-xs space-y-1 border-t border-border pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">O:</span>
                <span className="font-mono">{lastCandle.o.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">H:</span>
                <span className="font-mono text-green-400">{lastCandle.h.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">L:</span>
                <span className="font-mono text-red-400">{lastCandle.l.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">C:</span>
                <span className={`font-mono ${lastCandle.c >= lastCandle.o ? "text-green-400" : "text-red-400"}`}>
                  {lastCandle.c.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Vol:</span>
              <span className="font-mono text-xs">{lastCandle.v.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Indicators Panel */}
        {(indicators.rsi || indicators.ema20 || indicators.ema50) && (
          <div className="text-xs space-y-1 mt-2 border-t border-border pt-2">
            <div className="font-medium text-muted-foreground mb-1">Technical Indicators</div>
            {indicators.rsi && indicatorSettings.showRSI && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">RSI(14):</span>
                <span
                  className={`font-mono ${
                    indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-green-400" : "text-foreground"
                  }`}
                >
                  {indicators.rsi.toFixed(1)}
                </span>
              </div>
            )}
            {indicators.ema20 && indicatorSettings.showEMA && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">EMA20:</span>
                <span className="font-mono text-blue-400">{indicators.ema20.toFixed(2)}</span>
              </div>
            )}
            {indicators.ema50 && indicatorSettings.showEMA && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">EMA50:</span>
                <span className="font-mono text-amber-400">{indicators.ema50.toFixed(2)}</span>
              </div>
            )}
            {indicators.atr && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ATR(14):</span>
                <span className="font-mono">{indicators.atr.toFixed(2)}</span>
              </div>
            )}
            {indicators.macd && indicatorSettings.showMACD && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MACD:</span>
                  <span className="font-mono text-xs">{indicators.macd.macd.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signal:</span>
                  <span className="font-mono text-xs">{indicators.macd.signal.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hist:</span>
                  <span className={`font-mono text-xs ${indicators.macd.hist > 0 ? "text-green-400" : "text-red-400"}`}>
                    {indicators.macd.hist.toFixed(3)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signal Panel */}
        {signal && signal.signal && (
          <div className="text-xs space-y-1 mt-2 border-t border-border pt-2">
            <div className="font-medium text-muted-foreground mb-1">Trading Signal</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action:</span>
              <span className={`font-mono font-bold ${signal.signal === "BUY" ? "text-green-400" : "text-red-400"}`}>
                {signal.signal}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entry:</span>
              <span className="font-mono">{signal.entry.toFixed(2)}</span>
            </div>
            {signal.sl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stop Loss:</span>
                <span className="font-mono text-red-400">{signal.sl.toFixed(2)}</span>
              </div>
            )}
            {signal.tp && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Take Profit:</span>
                <span className="font-mono text-green-400">{signal.tp.toFixed(2)}</span>
              </div>
            )}
            {signal.confidence && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-mono">{(signal.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  )
}
