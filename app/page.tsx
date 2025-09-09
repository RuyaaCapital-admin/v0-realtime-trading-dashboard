"use client"

import { ChatPanel } from "@/components/chat-panel"
import { ChartPanel } from "@/components/chart-panel"
import { Toolbar } from "@/components/toolbar"
import { useChartContext } from "@/lib/chart-context"
import { useEffect } from "react"
import { Toaster } from "sonner"

export default function TradingApp() {
  const { loadHistoricalData } = useChartContext()

  // Load initial data on mount
  useEffect(() => {
    loadHistoricalData("AAPL", "1m", 100)
  }, [loadHistoricalData])

  return (
    <>
      <div className="flex h-screen bg-background">
        {/* Left Panel - Chat */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Trading Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered trading analysis and signals</p>
          </div>
          <ChatPanel />
        </div>

        {/* Right Panel - Chart */}
        <div className="flex-1 flex flex-col">
          <Toolbar />
          <ChartPanel />
        </div>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </>
  )
}
