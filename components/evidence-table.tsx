"use client"

import { useState, useMemo } from "react"
import { ExternalLink, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import type { EvidenceItem } from "@/lib/types"

interface EvidenceTableProps {
  evidence: EvidenceItem[]
}

type SortField = "confidence" | "stance" | "title"
type SortOrder = "asc" | "desc"

export function EvidenceTable({ evidence }: EvidenceTableProps) {
  const [sortField, setSortField] = useState<SortField>("confidence")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [stanceFilter, setStanceFilter] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const filteredAndSorted = useMemo(() => {
    let filtered = evidence

    // Filter by stance
    if (stanceFilter !== "all") {
      filtered = filtered.filter((item) => item.stance === stanceFilter)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "confidence":
          comparison = a.confidence - b.confidence
          break
        case "stance":
          comparison = a.stance.localeCompare(b.stance)
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [evidence, sortField, sortOrder, stanceFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const getStanceBadge = (stance: string) => {
    const colors = {
      support: "bg-gradient-to-r from-green-500 to-emerald-500",
      refute: "bg-gradient-to-r from-red-500 to-rose-500",
      neutral: "bg-gradient-to-r from-gray-500 to-slate-500",
    }
    return <Badge className={`${colors[stance as keyof typeof colors]} text-white shadow-sm`}>{stance}</Badge>
  }

  const copyCitations = () => {
    const citations = evidence.map((item, i) => `[${i + 1}] ${item.title}\n${item.url}\n${item.snippet}`).join("\n\n")

    navigator.clipboard.writeText(citations)
    toast({
      title: "Copied",
      description: "Citations copied to clipboard",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Evidence Sources ({filteredAndSorted.length})</h3>
        <div className="flex items-center gap-2">
          <Select value={stanceFilter} onValueChange={setStanceFilter}>
            <SelectTrigger className="w-32 border-purple-200 focus:ring-purple-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stances</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="refute">Refute</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={copyCitations}
            className="border-purple-200 hover:bg-purple-50 bg-transparent"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Citations
          </Button>
        </div>
      </div>

      <div className="border border-purple-100 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <TableRow>
              <TableHead className="w-24">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("stance")} className="h-8 px-2">
                  Stance
                  {sortField === "stance" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="w-32">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("confidence")} className="h-8 px-2">
                  Confidence
                  {sortField === "confidence" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort("title")} className="h-8 px-2">
                  Source
                  {sortField === "title" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((item, index) => (
              <TableRow key={index} className="hover:bg-purple-50/50">
                <TableCell>{getStanceBadge(item.stance)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-purple-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all shadow-sm"
                        style={{ width: `${item.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round(item.confidence * 100)}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      {item.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="text-sm text-muted-foreground">
                      {expandedRows.has(index) ? item.snippet : `${item.snippet.slice(0, 100)}...`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(index)} className="hover:bg-purple-50">
                    {expandedRows.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
