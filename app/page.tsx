"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { ApiBanner } from "@/components/api-banner";
import { InputPanel } from "@/components/input-panel";
import { VerificationPanel } from "@/components/verification-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { CheckCircle2 } from "lucide-react";
import type { IngestResponse, VerifyResponse, Claim } from "@/lib/types";
import {
  ResultsHistoryPanel,
  type HistoryEntry,
} from "@/components/results-history-panel";

export default function Home() {
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerifyResponse | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<
    HistoryEntry[]
  >([]);

  const handleIngestResult = (result: IngestResponse) => {
    setIngestResult(result);
    setVerificationResult(null);
  };

  const handleVerificationComplete = (
    result: VerifyResponse,
    primaryClaim: Claim,
  ) => {
    setVerificationResult(result);

    const entry: HistoryEntry = {
      id: `${Date.now()}-${primaryClaim.text.slice(0, 32)}`,
      result,
      primaryClaim,
      timestamp: new Date().toISOString(),
    };

    setVerificationHistory((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, 5);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-blue-50/30 to-pink-50/30 dark:bg-background dark:bg-none text-foreground">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {/* <ApiBanner /> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <InputPanel onResult={handleIngestResult} />
          </div>

          <div className="lg:col-span-1 space-y-4">
            {ingestResult ? (
              <VerificationPanel
                rawText={ingestResult.raw_text}
                claims={ingestResult.claims}
                imageVerification={ingestResult?.image_verification ?? null}
                onVerificationComplete={handleVerificationComplete}
              />
            ) : (
              <div className="h-full min-h-[400px] flex items-center justify-center rounded-2xl border border-dashed border-purple-200/60 bg-gradient-to-br from-white to-purple-50/40 backdrop-blur-sm">
                <div className="text-center px-6 py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    Extract claims from text or images to begin verification.
                  </p>
                </div>
              </div>
            )}

            <ResultsHistoryPanel history={verificationHistory} />
          </div>

          <div className="lg:col-span-1">
            <EvidencePanel verificationResult={verificationResult} />
          </div>
        </div>
      </main>
    </div>
  );
}
