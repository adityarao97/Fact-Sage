"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Claim } from "@/lib/types"

interface ClaimsListProps {
  claims: Claim[]
  onSelectionChange: (selected: Claim[]) => void
}

export function ClaimsList({ claims, onSelectionChange }: ClaimsListProps) {
  const safeClaims = claims || []
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(safeClaims.length > 0 ? [0] : []))

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIds(newSelected)

    const selected = safeClaims.filter((_, i) => newSelected.has(i))
    onSelectionChange(selected)
  }

  const handleSelectAll = () => {
    const allIds = new Set(safeClaims.map((_, i) => i))
    setSelectedIds(allIds)
    onSelectionChange(safeClaims)
  }

  const handleSelectNone = () => {
    setSelectedIds(new Set())
    onSelectionChange([])
  }

  if (safeClaims.length === 0) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select claims to verify:</Label>
        <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
          No claims extracted yet. Submit text, image, or audio to extract claims.
        </div>
      </div>
    )
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
        {safeClaims.map((claim, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <Checkbox
              id={`claim-${index}`}
              checked={selectedIds.has(index)}
              onCheckedChange={() => handleToggle(index)}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor={`claim-${index}`} className="cursor-pointer font-normal leading-relaxed">
                {claim.text}
              </Label>
              {claim.entities && claim.entities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {claim.entities.map((entity, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {entity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
