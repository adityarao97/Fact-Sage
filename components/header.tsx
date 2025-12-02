"use client"

import { CheckCircle2, Sparkles } from "lucide-react"
import { SettingsPopover } from "@/components/settings-popover"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function Header() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark"

  return (
    <header
      className={cn(
        "border-b border-border/50 sticky top-0 z-50 backdrop-blur-sm bg-gradient-to-r from-purple-50 via-blue-50 to-pink-50",
        isDark && "bg-gradient-to-r from-slate-900 via-purple-950 to-slate-950"
      )}
    >
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <CheckCircle2 className="h-8 w-8 text-primary relative z-10" />
              <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                fact-sage
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Fact Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SettingsPopover />
          </div>
        </div>
      </div>
    </header>
  )
}
