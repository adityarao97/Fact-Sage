"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { ApiBanner } from "@/components/api-banner";
import { InputPanel } from "@/components/input-panel";
import { VerificationPanel } from "@/components/verification-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { CheckCircle2 } from "lucide-react";
import type { IngestResponse, VerifyResponse } from "@/lib/types";

export default function Home() {
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerifyResponse | null>(null);

  const handleIngestResult = (result: IngestResponse) => {
    setIngestResult(result);
    setVerificationResult(null);
  };

  const handleVerificationComplete = (result: VerifyResponse) => {
    setVerificationResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-blue-50/30 to-pink-50/30">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {/* <ApiBanner /> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <InputPanel onResult={handleIngestResult} />
          </div>

          <div className="lg:col-span-1">
            {ingestResult ? (
              <VerificationPanel
                rawText={ingestResult.raw_text}
                claims={ingestResult.claims}
                imageVerification={ingestResult?.image_verification ?? null}
                onVerificationComplete={handleVerificationComplete}
              />
            ) : (
              <div className="h-full min-h-[400px] flex items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-white to-purple-50/30 backdrop-blur-sm">
                <div className="text-center px-6 py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center glow-primary">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                    Extract claims from text or images to begin verification
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <EvidencePanel verificationResult={verificationResult} />
          </div>
        </div>
      </main>
    </div>
  );
}
