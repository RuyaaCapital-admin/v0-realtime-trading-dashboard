"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { IndicatorPanel } from "./indicator-panel"
import { useChartContext } from "@/lib/chart-context"
import { webSocketManager } from "@/lib/websocket-manager"
import { useState, useEffect } from "react"
import { Activity, Wifi, WifiOff, Play, Square, RotateCcw, Pencil, Trash2, MousePointer, Zap } from "lucide-react"
import { toast } from "sonner"

export function Toolbar() {
  const {
    symbol,
    timeframe,
    isConnected,
    isLoading,
    isDrawingMode,
    drawingTool,
    drawings,
    indicatorSettings,
    setSymbol,
    setTimeframe,
    loadHistoricalData,
    setDrawingMode,
    setDrawingTool,
    clearDrawings,
    generateSignal,
  } = useChartContext()

  const [symbolInput, setSymbolInput] = useState(symbol)
  const [isConnecting, setIsConnecting] = useState(false)

  // Update symbol input when context changes
  useEffect(() => {
    setSymbolInput(symbol)
  }, [symbol])

  const handleSymbolChange = async () => {
    if (symbolInput.trim()) {
      const newSymbol = symbolInput.trim().toUpperCase()
      setSymbol(newSymbol)

      // Load historical data for new symbol
      await loadHistoricalData(newSymbol, timeframe)

      // Reconnect WebSocket if currently connected
      if (isConnected) {
        await handleConnect(newSymbol)
      }

      toast.success(`Loaded data for ${newSymbol}`)
    }
  }

  const handleConnect = async (targetSymbol?: string) => {
    const connectSymbol = targetSymbol || symbol
    setIsConnecting(true)

    try {
      const connected = await webSocketManager.connect(connectSymbol)
      if (connected) {
        toast.success(`Connected to live feed for ${connectSymbol}`)
      } else {
        toast.error("Failed to connect to live feed")
      }
    } catch (error) {
      console.error("[v0] Connection error:", error)
      toast.error("Connection failed")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await webSocketManager.disconnect()
    toast.info("Disconnected from live feed")
  }

  const handleReconnect = async () => {
    setIsConnecting(true)
    try {
      const reconnected = await webSocketManager.reconnect()
      if (reconnected) {
        toast.success("Reconnected to live feed")
      } else {
        toast.error("Failed to reconnect")
      }
    } catch (error) {
      console.error("[v0] Reconnection error:", error)
      toast.error("Reconnection failed")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTimeframeChange = async (newTimeframe: "1m" | "5m" | "1h" | "1d") => {
    setTimeframe(newTimeframe)

    // Reload historical data with new timeframe
    await loadHistoricalData(symbol, newTimeframe)

    // Note: WebSocket typically provides tick data, so timeframe changes
    // mainly affect historical data loading. Real-time updates continue as ticks.
    toast.info(`Switched to ${newTimeframe} timeframe`)
  }

  const handleLoadData = async () => {
    await loadHistoricalData(symbol, timeframe)
    toast.success("Historical data reloaded")
  }

  const handleDrawingModeToggle = () => {
    const newMode = !isDrawingMode
    setDrawingMode(newMode)

    if (newMode) {
      setDrawingTool("trendline")
      toast.info("Drawing mode enabled - Click two points to draw a trendline")
    } else {
      setDrawingTool(null)
      toast.info("Drawing mode disabled")
    }
  }

  const handleClearDrawings = () => {
    clearDrawings()
    toast.success("All drawings cleared")
  }

  const handleQuickSignal = () => {
    const signal = generateSignal()
    if (signal?.signal) {
      toast.success(`Generated ${signal.signal} signal at ${signal.entry.toFixed(2)}`)
    } else {
      toast.info("No clear signal at current market conditions")
    }
  }

  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center gap-4">
        {/* Symbol Input */}
        <div className="flex items-center gap-2">
          <Input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSymbolChange()}
            placeholder="Symbol (e.g., AAPL)"
            className="w-32"
            disabled={isLoading}
          />
          <Button onClick={handleSymbolChange} size="sm" disabled={isLoading}>
            {isLoading ? "Loading..." : "Load"}
          </Button>
        </div>

        {/* Timeframe Selector */}
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1m</SelectItem>
            <SelectItem value="5m">5m</SelectItem>
            <SelectItem value="1h">1h</SelectItem>
            <SelectItem value="1d">1d</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* WebSocket Connection Controls */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="flex items-center gap-1 text-green-500">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">Live</span>
              </div>
              <Button onClick={handleDisconnect} variant="outline" size="sm" disabled={isConnecting}>
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
              <Button onClick={handleReconnect} variant="outline" size="sm" disabled={isConnecting}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reconnect
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs">Offline</span>
              </div>
              <Button onClick={() => handleConnect()} variant="outline" size="sm" disabled={isConnecting || isLoading}>
                <Play className="w-4 h-4 mr-1" />
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Drawing Tools */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDrawingModeToggle}
            variant={isDrawingMode ? "default" : "outline"}
            size="sm"
            className="relative"
          >
            {isDrawingMode ? <Pencil className="w-4 h-4 mr-1" /> : <MousePointer className="w-4 h-4 mr-1" />}
            {isDrawingMode ? "Drawing" : "Select"}
          </Button>

          <Button onClick={handleClearDrawings} variant="outline" size="sm" disabled={drawings.length === 0}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear ({drawings.length})
          </Button>
        </div>

        {/* Analysis Tools */}
        <div className="flex items-center gap-2 ml-auto">
          <Button onClick={handleQuickSignal} variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-1" />
            Quick Signal
          </Button>

          <Button onClick={handleLoadData} variant="outline" size="sm" disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Refresh Data
          </Button>

          <IndicatorPanel />

          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            {isLoading && "Loading historical data..."}
            {isConnecting && "Connecting to live feed..."}
            {isConnected && `Connected to ${webSocketManager.getCurrentSymbol()} live feed`}
            {!isConnected && !isConnecting && !isLoading && "Ready - Click Connect for live data"}
          </div>

          {/* Indicator status display */}
          <div className="flex items-center gap-2">
            {indicatorSettings.showEMA && <span className="text-blue-400">EMA</span>}
            {indicatorSettings.showRSI && <span className="text-purple-400">RSI</span>}
            {indicatorSettings.showMACD && <span className="text-cyan-400">MACD</span>}
            {indicatorSettings.autoSignals && <span className="text-green-400">Auto-Signals</span>}
          </div>
        </div>

        {isDrawingMode && (
          <div className="flex items-center gap-2 text-primary">
            <Pencil className="w-3 h-3" />
            <span>Drawing Mode: Click two points to draw trendline</span>
          </div>
        )}
      </div>
    </div>
  )
}
