"use client"

import * as React from "react"

interface SupportRefuteChartProps {
  support: number
  refute: number
  neutral: number
}

export function SupportRefuteChart({
  support,
  refute,
  neutral,
}: SupportRefuteChartProps) {
  const total = support + refute + neutral
  const safeTotal = total === 0 ? 1 : total

  const makeWidth = (value: number) => {
    const pct = (value / safeTotal) * 100
    // make sure 0 values still show a tiny grey bar
    return value === 0 ? 4 : Math.max(pct, 8)
  }

  const Row = ({
    label,
    value,
    className,
  }: {
    label: string
    value: number
    className: string
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>
          {value} {total > 0 && (
            <span className="ml-1 text-[10px] opacity-75">
              ({Math.round((value / safeTotal) * 100)}%)
            </span>
          )}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${makeWidth(value)}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Support vs Refute</h4>
        <p className="text-xs text-muted-foreground">
          Shows how many sources support, refute, or stay neutral about this
          claim.
        </p>
      </div>

      <Row
        label="Support"
        value={support}
        className="bg-gradient-to-r from-emerald-400 to-green-500"
      />
      <Row
        label="Refute"
        value={refute}
        className="bg-gradient-to-r from-rose-400 to-red-500"
      />
      <Row
        label="Neutral"
        value={neutral}
        className="bg-gradient-to-r from-slate-300 to-slate-500"
      />
    </div>
  )
}
