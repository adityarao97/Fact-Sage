"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, ShieldCheck, Globe2, Info } from "lucide-react";
import { ClaimsList } from "@/components/claims-list";
import { JsonDownload } from "@/components/json-download";
import type {
  Claim,
  VerifyResponse,
  ImageVerificationResult,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ScoreGauge } from "@/components/score-gauge";

interface VerificationPanelProps {
  rawText: string;
  claims: Claim[];
  imageVerification?: ImageVerificationResult | null;
  onVerificationComplete: (result: VerifyResponse, primaryClaim: Claim) => void;
}

export function VerificationPanel({
  rawText,
  claims,
  imageVerification,
  onVerificationComplete,
}: VerificationPanelProps) {
  const [selectedClaims, setSelectedClaims] = useState<Claim[]>(
    claims?.length > 0 ? [claims[0]] : []
  );
  const [verificationResult, setVerificationResult] =
    useState<VerifyResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(true);
  const { toast } = useToast();

  // KPI stats
  const totalSources = verificationResult?.evidence?.length ?? 0;
  const supportingCount = (verificationResult?.evidence || []).filter(
    (e) => e.stance === "supporting"
  ).length;
  const refutingCount = (verificationResult?.evidence || []).filter(
    (e) => e.stance === "refuting"
  ).length;
  const neutralCount = (verificationResult?.evidence || []).filter(
    (e) => e.stance === "neutral"
  ).length;
  const uniqueEntities = new Set(
    claims.flatMap((claim) => claim.entities ?? [])
  );

  const handleVerify = async () => {
    if (selectedClaims.length === 0) {
      toast({
        title: "No Claims Selected",
        description: "Please select at least one claim to verify",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch("/api/verify-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: selectedClaims[0], // Verify first selected claim
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = `Verification failed (status ${response.status})`;

        try {
          if (contentType.includes("application/json")) {
            const errorBody = await response.json();
            if (typeof errorBody?.error === "string") {
              message = errorBody.error;
            } else if (typeof errorBody?.message === "string") {
              message = errorBody.message;
            }
          } else {
            const text = await response.text();
            if (text) {
              message = text.slice(0, 300);
            }
          }
        } catch (parseErr) {
          console.error(
            "[v0] Failed to parse error response from /api/verify-claim:",
            parseErr
          );
        }

        throw new Error(message);
      }

      const result: VerifyResponse = await response.json();

      console.log("[v0] Verification complete:", result);
      setVerificationResult(result);
      onVerificationComplete(result, selectedClaims[0]);

      toast({
        title: "Verification Complete",
        description: `Found ${result.evidence?.length || 0} evidence source(s)`,
      });
    } catch (error) {
      console.error("[v0] Verification error:", error);
      toast({
        title: "Verification Error",
        description:
          error instanceof Error ? error.message : "Failed to verify claims",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getVerdictColor = (verdict: VerifyResponse["verdict"]) => {
    switch (verdict) {
      case "true":
        return "bg-emerald-500";
      case "false":
        return "bg-rose-500";
      case "mixed":
        return "bg-amber-500";
      case "uncertain":
      default:
        return "bg-slate-500";
    }
  };

  const getVerdictIcon = (verdict: VerifyResponse["verdict"]) => {
    switch (verdict) {
      case "true":
        return <ShieldCheck className="h-4 w-4" />;
      case "false":
        return <Globe2 className="h-4 w-4" />;
      case "mixed":
        return <Info className="h-4 w-4" />;
      case "uncertain":
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Fallback summary text for image verification, since the type doesn't define "summary"
  const imageSummaryText =
    imageVerification &&
    ((imageVerification as any).summary ??
      (imageVerification as any).description ??
      (imageVerification as any).reason ??
      "Image authenticity analysis completed. See details in the logs or backend response.");

  return (
    <Card className="border-2 border-primary/10 shadow-xl card-gradient">
      <CardHeader>
        <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Verification Panel
        </CardTitle>
        <CardDescription>
          Select claims to verify and inspect AI-backed evidence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-3 border border-purple-100">
            <div className="text-[11px] font-medium text-purple-700">
              Total Claims
            </div>
            <div className="text-xl font-semibold text-purple-900">
              {claims.length}
            </div>
            <div className="mt-1 text-[10px] text-purple-600">
              {uniqueEntities.size} unique entities
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-3 border border-emerald-100">
            <div className="text-[11px] font-medium text-emerald-700">
              Evidence Sources
            </div>
            <div className="text-xl font-semibold text-emerald-900">
              {totalSources}
            </div>
            <div className="mt-1 text-[10px] text-emerald-600">
              {supportingCount} supporting · {refutingCount} refuting
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3 border border-blue-100">
            <div className="text-[11px] font-medium text-blue-700">
              Supporting
            </div>
            <div className="text-xl font-semibold text-blue-900">
              {supportingCount}
            </div>
            <div className="mt-1 text-[10px] text-blue-600">
              {neutralCount} neutral
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-3 border border-slate-200">
            <div className="text-[11px] font-medium text-slate-700">
              Image Checks
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {imageVerification ? 1 : 0}
            </div>
            <div className="mt-1 text-[10px] text-slate-600">
              {imageVerification
                ? "Image authenticity analyzed"
                : "No image provided"}
            </div>
          </div>
        </div>

        {/* Raw Text Collapsible */}
        <Collapsible open={isRawTextOpen} onOpenChange={setIsRawTextOpen}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Source Text
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                {rawText.length > 120
                  ? `${rawText.slice(0, 120)}…`
                  : rawText || "No text available"}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                {isRawTextOpen ? "Hide" : "Show"} full text
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-2">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg text-sm max-h-40 overflow-y-auto border border-purple-100">
              <p className="whitespace-pre-wrap leading-relaxed">{rawText}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Claims List */}
        <ClaimsList
          key={claims.map((c) => c.text).join("|")}
          claims={claims}
          onSelectionChange={setSelectedClaims}
        />

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={isVerifying || selectedClaims.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying Claims...
            </>
          ) : (
            `Verify Selected Claims (${selectedClaims.length})`
          )}
        </Button>

        {/* Image Authenticity (if available) */}
        {imageVerification && (
          <div className="p-4 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  Image Authenticity
                </span>
                <Badge variant="outline" className="text-xs">
                  {imageVerification.provider}
                </Badge>
              </div>
              {imageVerification.is_tampered === null ? (
                <Badge className="bg-amber-500 text-white text-xs">
                  Inconclusive
                </Badge>
              ) : imageVerification.is_tampered ? (
                <Badge className="bg-rose-500 text-white text-xs">
                  Possible Tampering
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 text-white text-xs">
                  No Tampering Detected
                </Badge>
              )}
            </div>
            {imageSummaryText && (
              <p className="text-xs text-slate-700 leading-relaxed">
                {imageSummaryText}
              </p>
            )}
          </div>
        )}

        {/* Verification Results */}
        {verificationResult && (
          <div className="space-y-4 pt-4 border-t border-purple-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Verification Results</h3>
              <JsonDownload
                data={verificationResult}
                filename="verification-results.json"
              />
            </div>

            {/* Score and Verdict */}
            <div className="flex items-center justify-around p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <ScoreGauge score={verificationResult.authenticity_score} />
              <div className="flex flex-col items-center gap-2">
                <Badge
                  className={`${getVerdictColor(
                    verificationResult.verdict
                  )} text-white shadow-lg`}
                >
                  {getVerdictIcon(verificationResult.verdict)}
                  <span className="ml-2 capitalize">
                    {verificationResult.verdict}
                  </span>
                </Badge>
                <p className="text-xs text-muted-foreground text-center max-w-[220px]">
                  Overall assessment of the selected claim based on gathered
                  web evidence.
                </p>
              </div>
            </div>

            {/* Explanation */}
            {verificationResult.explanation && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-500" />
                  <h4 className="text-sm font-semibold">
                    Explanation
                  </h4>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg text-sm border border-blue-100">
                  <p className="leading-relaxed">
                    {verificationResult.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
