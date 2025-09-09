"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, TrendingUp, Activity, Zap, BarChart3 } from "lucide-react"
import { useChartContext } from "@/lib/chart-context"

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    maxSteps: 5,
  })

  const { symbol, isConnected } = useChartContext()

  // Quick action handlers
  const handleQuickAction = (message: string) => {
    handleSubmit(undefined, {
      data: { message },
    })
  }

  const quickActions = [
    {
      label: "Analyze Chart",
      message:
        "Please analyze the current chart and provide insights on the market conditions and potential trading opportunities.",
      icon: BarChart3,
      variant: "default" as const,
    },
    {
      label: "Generate Signal",
      message: "Generate a trading signal based on current technical indicators and market conditions.",
      icon: Zap,
      variant: "secondary" as const,
    },
    {
      label: "Load Data",
      message: `Load the latest 200 bars of ${symbol} 1-minute data and connect to live feed.`,
      icon: Activity,
      variant: "outline" as const,
    },
    {
      label: "Market Overview",
      message: "Provide an overview of current market conditions and key levels to watch.",
      icon: TrendingUp,
      variant: "outline" as const,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Trading Assistant</h3>
              <p className="text-sm mb-4">
                I can analyze charts, generate trading signals, and provide market insights using real-time data.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Live Data" : "Historical Data"}
                </Badge>
                <Badge variant="outline">{symbol}</Badge>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                </div>
                <div
                  className={`rounded-lg px-4 py-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>

                  {/* Render tool calls */}
                  {message.toolInvocations?.map((tool) => (
                    <div key={tool.toolCallId} className="mt-3 p-3 bg-background/50 rounded-md border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {tool.toolName.replace("_", " ").toUpperCase()}
                        </span>
                      </div>

                      {tool.args && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            {JSON.stringify(tool.args, null, 2)}
                          </code>
                        </div>
                      )}

                      {tool.result && (
                        <div className="text-xs">
                          {typeof tool.result === "object" ? (
                            <div className="space-y-1">
                              {tool.result.success !== undefined && (
                                <Badge variant={tool.result.success ? "default" : "destructive"} className="text-xs">
                                  {tool.result.success ? "Success" : "Failed"}
                                </Badge>
                              )}
                              {tool.result.message && <p className="text-foreground">{tool.result.message}</p>}
                              {tool.result.signal && (
                                <div className="mt-2 p-2 bg-background rounded border">
                                  <div className="font-medium">
                                    Signal:{" "}
                                    <span className={tool.result.signal === "BUY" ? "text-green-500" : "text-red-500"}>
                                      {tool.result.signal}
                                    </span>
                                  </div>
                                  {tool.result.entry && <div>Entry: ${tool.result.entry}</div>}
                                  {tool.result.stopLoss && <div>Stop Loss: ${tool.result.stopLoss}</div>}
                                  {tool.result.takeProfit && <div>Take Profit: ${tool.result.takeProfit}</div>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-foreground">{String(tool.result)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Quick Actions:</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                onClick={() => handleQuickAction(action.message)}
                variant={action.variant}
                size="sm"
                disabled={isLoading}
                className="justify-start text-xs h-8"
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about the chart, request analysis, or generate signals..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
