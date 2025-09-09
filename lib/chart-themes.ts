export const chartThemes = {
  dark: {
    layout: {
      background: { color: "transparent" },
      textColor: "#d1d5db",
      fontSize: 12,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    },
    grid: {
      vertLines: { color: "#374151" },
      horzLines: { color: "#374151" },
    },
    crosshair: {
      vertLine: { color: "#6b7280" },
      horzLine: { color: "#6b7280" },
    },
    priceScale: {
      borderColor: "#4b5563",
      textColor: "#9ca3af",
    },
    timeScale: {
      borderColor: "#4b5563",
      textColor: "#9ca3af",
    },
    candlestick: {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    },
    indicators: {
      ema20: "#3b82f6",
      ema50: "#f59e0b",
      rsi: "#8b5cf6",
      macd: "#06b6d4",
      volume: "#6b7280",
    },
  },
  light: {
    layout: {
      background: { color: "#ffffff" },
      textColor: "#374151",
      fontSize: 12,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    },
    grid: {
      vertLines: { color: "#e5e7eb" },
      horzLines: { color: "#e5e7eb" },
    },
    crosshair: {
      vertLine: { color: "#9ca3af" },
      horzLine: { color: "#9ca3af" },
    },
    priceScale: {
      borderColor: "#d1d5db",
      textColor: "#6b7280",
    },
    timeScale: {
      borderColor: "#d1d5db",
      textColor: "#6b7280",
    },
    candlestick: {
      upColor: "#059669",
      downColor: "#dc2626",
      borderDownColor: "#dc2626",
      borderUpColor: "#059669",
      wickDownColor: "#dc2626",
      wickUpColor: "#059669",
    },
    indicators: {
      ema20: "#2563eb",
      ema50: "#d97706",
      rsi: "#7c3aed",
      macd: "#0891b2",
      volume: "#6b7280",
    },
  },
}

export type ChartTheme = keyof typeof chartThemes
