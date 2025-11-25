"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Claim } from "@/lib/types";

interface ClaimsListProps {
  claims: Claim[];
  onSelectionChange: (selected: Claim[]) => void;
}

function claimKey(c: Claim, i: number) {
  // If Claim has an id, prefer: return c.id
  return `${c.text}::${i}`;
}

export function ClaimsList({ claims, onSelectionChange }: ClaimsListProps) {
  const safeClaims = claims ?? [];
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Reset selection whenever claims change (prevents index carryover)
  useEffect(() => {
    if (safeClaims.length > 0) {
      const firstKey = claimKey(safeClaims[0], 0);
      const next = new Set<string>([firstKey]);
      setSelectedKeys(next);
      onSelectionChange([safeClaims[0]]);
    } else {
      setSelectedKeys(new Set());
      onSelectionChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeClaims]);

  const handleToggle = (k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      const selected = safeClaims.filter((c, i) => next.has(claimKey(c, i)));
      onSelectionChange(selected);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(safeClaims.map((c, i) => claimKey(c, i)));
    setSelectedKeys(all);
    onSelectionChange(safeClaims);
  };

  const handleSelectNone = () => {
    setSelectedKeys(new Set());
    onSelectionChange([]);
  };

  if (safeClaims.length === 0) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select claims to verify:</Label>
        <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
          No claims extracted yet. Submit text, image, or audio to extract
          claims.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Select claims to verify:</Label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSelectNone}>
            Select None
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {safeClaims.map((claim, index) => {
          const k = claimKey(claim, index);
          const checked = selectedKeys.has(k);
          return (
            <div
              key={k}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={`claim-${index}`}
                checked={checked}
                onCheckedChange={() => handleToggle(k)}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={`claim-${index}`}
                  className="cursor-pointer font-normal leading-relaxed"
                >
                  {claim.text}
                </Label>
                {claim.entities?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {claim.entities.map((entity, i) => (
                      <span
                        key={`${k}-e-${i}`}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
