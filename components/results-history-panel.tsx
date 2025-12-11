"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Claim, VerifyResponse } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  result: VerifyResponse;
  primaryClaim: Claim;
  timestamp: string;
}

interface ResultsHistoryPanelProps {
  history: HistoryEntry[];
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ResultsHistoryPanel({ history }: ResultsHistoryPanelProps) {
  if (!history.length) {
    return (
      <Card className="card-gradient border-2 border-primary/10 dark:border-border shadow-xl mt-4 dark:bg-card">
        <CardHeader className="space-y-2">
        <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Recent verifications
          </CardTitle>
          <CardDescription className="text-sm">
          Shows latest fact search history
        </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No verifications yet. Run a check to see your recent results here.
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="card-gradient border-2 border-primary/10 dark:border-border mt-4 shadow-xl dark:bg-card">
        <CardHeader className="space-y-2">
        <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Recent verifications
          </CardTitle>
          <CardDescription className="text-sm">
          Shows latest fact search history
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-120 pr-2">
          <ul className="space-y-3 text-xs">
            {history.map((entry) => {
              const { result, primaryClaim, timestamp } = entry;
              const totalSources = result.evidence?.length ?? 0;
              const supporting = (result.evidence || []).filter(
                (e) => e.stance === "supporting"
              ).length;
              const refuting = (result.evidence || []).filter(
                (e) => e.stance === "refuting"
              ).length;
              const neutral = (result.evidence || []).filter(
                (e) => e.stance === "neutral"
              ).length;

              return (
                <li
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium line-clamp-2">
                        {primaryClaim.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                        >
                          {result.verdict}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Score:{" "}
                          <span className="font-medium">
                            {Math.round(result.authenticity_score * 100)}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDate(timestamp)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{supporting}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                      <span>{refuting}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                      <span>{neutral}</span>
                    </div>
                    <div className="ml-auto text-[10px] text-muted-foreground">
                      {totalSources} source{totalSources === 1 ? "" : "s"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
