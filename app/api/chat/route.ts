import { openai } from "@ai-sdk/openai"
import { streamText, createUIMessageStreamResponse } from "ai"
import { toolSchemas, executeTool } from "@/lib/ai-tools"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  try {
    const result = await streamText({
      model: openai("gpt-4o-mini"), // Cost-aware model choice
      messages,
      maxSteps: 5, // Allow multiple tool calls
      tools: {
        seed_intraday: {
          description: "Load historical intraday data for a symbol to seed the chart and indicators",
          parameters: toolSchemas.seed_intraday,
          execute: async (args) => await executeTool("seed_intraday", args),
        },
        subscribe_live: {
          description: "Connect to live WebSocket feed for real-time price updates",
          parameters: toolSchemas.subscribe_live,
          execute: async (args) => await executeTool("subscribe_live", args),
        },
        chart_context: {
          description: "Get current chart context including price, indicators, and market data for analysis",
          parameters: toolSchemas.chart_context,
          execute: async (args) => await executeTool("chart_context", args),
        },
        make_signal: {
          description: "Generate trading signal based on current technical indicators and market conditions",
          parameters: toolSchemas.make_signal,
          execute: async (args) => await executeTool("make_signal", args),
        },
      },
      system: `You are a professional trading assistant with expertise in technical analysis and market insights.

CAPABILITIES:
- Analyze real-time and historical market data
- Generate trading signals using technical indicators (RSI, EMA, MACD, ATR)
- Provide risk management guidance
- Explain market conditions and trading opportunities

TOOLS AVAILABLE:
1. seed_intraday: Load historical data for analysis
2. subscribe_live: Connect to live market feeds
3. chart_context: Get current market data and indicators
4. make_signal: Generate trading signals with entry/exit points

TRADING SIGNAL LOGIC:
- BUY: EMA20 > EMA50 (uptrend) + RSI < 30 (oversold)
- SELL: EMA20 < EMA50 (downtrend) + RSI > 70 (overbought)
- Stop Loss: 1.5x ATR from entry
- Take Profit: 2x ATR from entry (1:2 risk/reward)

GUIDELINES:
- Always check chart_context before analysis
- Explain your reasoning clearly
- Include risk warnings
- Provide actionable insights
- Use professional trading terminology
- Be concise but thorough

RISK DISCLAIMER: Trading involves substantial risk. All signals are for educational purposes only.`,
    })

    return createUIMessageStreamResponse(result)
  } catch (error) {
    console.error("[v0] Chat API Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
