import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import SkipLink from "@/components/skip-link";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { MuiThemeProvider } from "@/components/mui-theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Fact-Sage - AI Fact Verification",
  description: "Verify claims with AI-powered fact checking",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-background text-foreground font-sans antialiased",
          inter.className
        )}
      >
        {/* Accessible skip link (only renders when page is scrollable) */}
        <SkipLink />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MuiThemeProvider>{children}</MuiThemeProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
