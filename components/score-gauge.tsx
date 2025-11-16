"use client"

interface ScoreGaugeProps {
  score: number
  size?: number
}

export function ScoreGauge({ score, size = 140 }: ScoreGaugeProps) {
  const percentage = Math.round(score * 100)
  const circumference = 2 * Math.PI * 50
  const offset = circumference - score * circumference

  const getColor = () => {
    if (score >= 0.7) return "text-emerald-500"
    if (score >= 0.4) return "text-amber-500"
    return "text-rose-500"
  }

  const getGradient = () => {
    if (score >= 0.7) return "from-emerald-400 to-green-500"
    if (score >= 0.4) return "from-amber-400 to-orange-500"
    return "from-rose-400 to-red-500"
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative rounded-full shadow-lg`} style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={50}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-purple-100"
          />
          {/* Progress circle with gradient */}
          <defs>
            <linearGradient id={`gauge-gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={getColor()} stopOpacity="1" />
              <stop offset="100%" className={getColor()} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={50}
            stroke={`url(#gauge-gradient-${score})`}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={getColor()}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: "drop-shadow(0 2px 8px currentColor)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold bg-gradient-to-br ${getGradient()} bg-clip-text text-transparent`}>
            {percentage}%
          </span>
          <span className="text-xs text-muted-foreground mt-1">Score</span>
        </div>
      </div>
      <span className="text-sm font-medium text-foreground">Authenticity Score</span>
    </div>
  )
}
