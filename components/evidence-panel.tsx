"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EvidenceGraph } from "@/components/evidence-graph"
import { EvidenceTable } from "@/components/evidence-table"
import type { VerifyResponse } from "@/lib/types"

interface EvidencePanelProps {
  verificationResult: VerifyResponse | null
}

export function EvidencePanel({ verificationResult }: EvidencePanelProps) {
  const handleNodeClick = (nodeId: string, url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  if (!verificationResult) {
    return (
      <Card className="card-gradient border-2 border-primary/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Evidence Graph & Details
          </CardTitle>
          <CardDescription>Verify claims to see evidence visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            No verification results yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-gradient border-2 border-primary/10 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Evidence Graph & Details
        </CardTitle>
        <CardDescription>Interactive visualization of claim relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">Evidence Graph</h3>
          <EvidenceGraph graph={verificationResult.graph} onNodeClick={handleNodeClick} />
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm" />
              <span>Claim</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm" />
              <span>Support</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-sm" />
              <span>Refute</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 shadow-sm" />
              <span>Neutral</span>
            </div>
          </div>
        </div>

        <EvidenceTable evidence={verificationResult.evidence} />
      </CardContent>
    </Card>
  )
}
