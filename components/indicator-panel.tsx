"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useChartContext } from "@/lib/chart-context"
import { TrendingUp, Zap } from "lucide-react"

export function IndicatorPanel() {
  const { indicatorSettings, updateIndicatorSettings, generateSignal } = useChartContext()

  const handleToggle = (key: keyof typeof indicatorSettings) => {
    updateIndicatorSettings({ [key]: !indicatorSettings[key] })
  }

  const handleGenerateSignal = () => {
    generateSignal()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          Indicators
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Technical Indicators</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ema-toggle" className="text-sm">
                  EMA Lines (20/50)
                </Label>
                <Switch
                  id="ema-toggle"
                  checked={indicatorSettings.showEMA}
                  onCheckedChange={() => handleToggle("showEMA")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="rsi-toggle" className="text-sm">
                  RSI (14)
                </Label>
                <Switch
                  id="rsi-toggle"
                  checked={indicatorSettings.showRSI}
                  onCheckedChange={() => handleToggle("showRSI")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="macd-toggle" className="text-sm">
                  MACD (12,26,9)
                </Label>
                <Switch
                  id="macd-toggle"
                  checked={indicatorSettings.showMACD}
                  onCheckedChange={() => handleToggle("showMACD")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="volume-toggle" className="text-sm">
                  Volume
                </Label>
                <Switch
                  id="volume-toggle"
                  checked={indicatorSettings.showVolume}
                  onCheckedChange={() => handleToggle("showVolume")}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-sm mb-3">Signal Generation</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-signals" className="text-sm">
                  Auto Signals
                </Label>
                <Switch
                  id="auto-signals"
                  checked={indicatorSettings.autoSignals}
                  onCheckedChange={() => handleToggle("autoSignals")}
                />
              </div>

              <Button onClick={handleGenerateSignal} size="sm" className="w-full">
                <Zap className="w-4 h-4 mr-1" />
                Generate Signal Now
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Signals based on EMA crossover + RSI confirmation</p>
            <p className="mt-1">• BUY: EMA20 &gt; EMA50 + RSI &lt; 30</p>
            <p>• SELL: EMA20 &lt; EMA50 + RSI &gt; 70</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
