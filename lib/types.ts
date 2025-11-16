export interface Claim {
  text: string
  entities?: string[]
  context?: string
}

export interface EvidenceItem {
  url: string
  title: string
  snippet: string
  stance: "supporting" | "refuting" | "neutral"
  confidence: number
  full_content?: string
}

export interface GraphNode {
  id: string
  label: string
  type: "claim" | "search" | "evidence" | "category"
  url?: string
  confidence?: number
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface IngestResponse {
  raw_text: string
  claims: Claim[]
}

export interface UnifiedIngestResponse {
  unified: {
    raw_text: string
    claims: Claim[]
  }
  verifications?: Array<{
    authenticity_score: number
    verdict: "true" | "false" | "mixed" | "uncertain"
    evidence: EvidenceItem[]
    graph: Graph
    explanation: string
  }>
}

export interface VerifyResponse {
  authenticity_score: number
  verdict: "true" | "false" | "mixed" | "uncertain"
  evidence: EvidenceItem[]
  graph: Graph
  explanation: string
  category?: string
}
