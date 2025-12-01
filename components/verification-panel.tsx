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
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Copy,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScoreGauge } from "@/components/score-gauge";
import { ClaimsList } from "@/components/claims-list";
import { JsonDownload } from "@/components/json-download";
import { EvidenceGraph } from "@/components/evidence-graph";
import type {
  Claim,
  VerifyResponse,
  ImageVerificationResult,
} from "@/lib/types";

interface VerificationPanelProps {
  rawText: string;
  claims: Claim[];
  imageVerification?: ImageVerificationResult | null;
  onVerificationComplete: (result: VerifyResponse) => void;
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
  const entityCount = uniqueEntities.size;

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
    try {
      console.log(
        "[v0] Starting verification with integrated system for claims:",
        selectedClaims
      );

      // Call the new verification API route
      const response = await fetch("/api/verify-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: selectedClaims[0], // Verify first selected claim
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Verification failed");
      }

      const result: VerifyResponse = await response.json();

      console.log("[v0] Verification complete:", result);
      setVerificationResult(result);
      onVerificationComplete(result);

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

  const copyExplanation = () => {
    if (verificationResult?.explanation) {
      navigator.clipboard.writeText(verificationResult.explanation);
      toast({
        title: "Copied",
        description: "Explanation copied to clipboard",
      });
    }
  };

  const handleNodeClick = (nodeId: string, url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "true":
        return <CheckCircle2 className="h-4 w-4" />;
      case "false":
        return <XCircle className="h-4 w-4" />;
      case "mixed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "true":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "false":
        return "bg-gradient-to-r from-red-500 to-rose-500";
      case "mixed":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      default:
        return "bg-gradient-to-r from-gray-500 to-slate-500";
    }
  };

  return (
    <Card className="card-gradient border-2 border-primary/10 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Claims & Verification
        </CardTitle>
        <CardDescription>
          Select claims to verify and view results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Screen reader status for verification */}
        <div className="sr-only" aria-live="polite">
          {isVerifying
            ? "Verifying selected claims..."
            : verificationResult
            ? "Verification complete."
            : ""}
        </div>
        {/* Raw Text */}
        <Collapsible open={isRawTextOpen} onOpenChange={setIsRawTextOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-purple-50"
            >
              <span className="font-medium">Raw Text</span>
              {isRawTextOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg text-sm max-h-40 overflow-y-auto border border-purple-100">
              <p className="whitespace-pre-wrap leading-relaxed">{rawText}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Claims List */}
        <ClaimsList
          key={claims.map((c) => c.text).join("|")} // or a proper hash
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
        {/* Image Authenticity (from ingest, even before claim verification) */}
        {imageVerification && (
          <div className="space-y-2 pt-2 border-t border-purple-100">
            <h3 className="font-semibold">Image Authenticity</h3>
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
                  <Badge className="bg-gradient-to-r from-gray-500 to-slate-500 text-white">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Inconclusive
                  </Badge>
                ) : imageVerification.is_tampered ? (
                  <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white">
                    <XCircle className="h-3 w-3 mr-1" />
                    Likely manipulated / AI-generated
                  </Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Likely original
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Score:{" "}
                {imageVerification.tampering_score !== null
                  ? imageVerification.tampering_score.toFixed(2)
                  : "N/A"}{" "}
                (0 = likely real, 1 = likely fake/AI)
              </div>

              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                {imageVerification.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
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
            <div className="flex items-center justify-around p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100">
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
                <span className="text-sm text-muted-foreground">Verdict</span>
              </div>
            </div>

            {/* KPI Tiles */}
            <div className="grid grid-cols-2 gap-3 text-xs mt-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Sources</p>
                <p className="text-lg font-semibold">{totalSources}</p>
              </div>

              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Supporting
                </p>
                <p className="text-lg font-semibold text-emerald-700">
                  {supportingCount}
                </p>
              </div>

              <div className="rounded-lg bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Refuting</p>
                <p className="text-lg font-semibold text-rose-700">
                  {refutingCount}
                </p>
              </div>

              <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Entities
                </p>
                <p className="text-lg font-semibold">{entityCount}</p>
              </div>
            </div>

            {/* Image Authenticity (if available) */}
            {verificationResult.image_verification && (
              <div className="p-4 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      Image Authenticity
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {verificationResult.image_verification.provider}
                    </Badge>
                  </div>
                  {verificationResult.image_verification.is_tampered ===
                  null ? (
                    <Badge className="bg-gradient-to-r from-gray-500 to-slate-500 text-white">
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Inconclusive
                    </Badge>
                  ) : verificationResult.image_verification.is_tampered ? (
                    <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white">
                      <XCircle className="h-3 w-3 mr-1" />
                      Likely manipulated / AI-generated
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Likely original
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Score:{" "}
                  {verificationResult.image_verification.tampering_score !==
                  null
                    ? verificationResult.image_verification.tampering_score.toFixed(
                        2
                      )
                    : "N/A"}{" "}
                  (0 = likely real, 1 = likely fake/AI)
                </div>

                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  {verificationResult.image_verification.reasons.map(
                    (reason, idx) => (
                      <li key={idx}>{reason}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Category display if available */}
            {verificationResult.category && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  Category: {verificationResult.category}
                </Badge>
              </div>
            )}

            {/* {verificationResult.graph &&
              verificationResult.graph.nodes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Evidence Graph</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hover over nodes to see details. Click nodes to open source
                    URLs.
                  </p>
                  <EvidenceGraph
                    graph={verificationResult.graph}
                    onNodeClick={handleNodeClick}
                  />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Supporting</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Refuting</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span>Neutral</span>
                    </div>
                  </div>
                </div>
              )} */}

            {/* {verificationResult.evidence &&
              verificationResult.evidence.length > 0 && (
                <Collapsible
                  open={isEvidenceOpen}
                  onOpenChange={setIsEvidenceOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between hover:bg-purple-50"
                    >
                      <span className="font-medium">
                        Evidence Sources ({verificationResult.evidence.length})
                      </span>
                      {isEvidenceOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {verificationResult.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={
                                  ev.stance === "supporting"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : ev.stance === "refuting"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {ev.stance}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(ev.confidence * 100)}% confidence
                              </span>
                            </div>
                            <h5 className="font-medium text-sm mb-1 truncate">
                              {ev.title}
                            </h5>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {ev.snippet}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(
                                ev.url,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            className="shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )} */}

            {/* Explanation */}
            {verificationResult.explanation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Explanation</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyExplanation}
                    className="hover:bg-purple-50"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
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
