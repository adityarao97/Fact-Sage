"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { Graph } from "@/lib/types"

interface EvidenceGraphProps {
  graph: Graph
  onNodeClick?: (nodeId: string, url?: string) => void
}

export function EvidenceGraph({ graph, onNodeClick }: EvidenceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth
    const height = 400

    const g = svg.append("g")

    // Arrow markers for edges
    svg
      .append("defs")
      .selectAll("marker")
      .data(["support", "refute", "neutral"])
      .join("marker")
      .attr("id", (d) => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", (d) => {
        if (d === "support") return "#10b981"
        if (d === "refute") return "#ef4444"
        return "#6b7280"
      })

    const getNodeColor = (type: string) => {
      switch (type) {
        case "claim":
          return "#6366f1"
        case "search":
          return "#0ea5e9"
        case "evidence":
          return "#22c55e"
        case "category":
          return "#f97316"
        default:
          return "#6b7280"
      }
    }

    const simulation = d3
      .forceSimulation(graph.nodes as any)
      .force(
        "link",
        d3
          .forceLink(graph.edges as any)
          .id((d: any) => d.id)
          .distance(120),
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35))

    const link = g
      .append("g")
      .selectAll("line")
      .data(graph.edges)
      .join("line")
      .attr("stroke", (d: any) => {
        const relation = d.relation?.toLowerCase?.() ?? ""
        if (relation.includes("support")) return "#10b981"
        if (relation.includes("refute") || relation.includes("contradict")) return "#ef4444"
        return "#6b7280"
      })
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", (d: any) => {
        const relation = d.relation?.toLowerCase?.() ?? ""
        if (relation.includes("support")) return "url(#arrow-support)"
        if (relation.includes("refute") || relation.includes("contradict")) return "url(#arrow-refute)"
        return "url(#arrow-neutral)"
      })

    const node = g
      .append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .join("circle")
      .attr("r", (d: any) => (d.type === "claim" ? 14 : 10))
      .attr("fill", (d: any) => getNodeColor(d.type))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 3)
      .attr("cursor", (d: any) => (d.url ? "pointer" : "default"))
      // 🔑 Make nodes keyboard-focusable + screen-reader friendly
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        (d: any) =>
          d.type === "claim"
            ? `Claim node: ${d.label}`
            : `Evidence node: ${d.label}${d.relation ? `, relation: ${d.relation}` : ""}`,
      )
      .style("filter", "drop-shadow(0 0 8px currentColor)")
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any,
      )

    const label = g
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .text((d: any) => d.label)
      .attr("font-size", 12)
      .attr("fill", "#e5e7eb")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => (d.type === "claim" ? -20 : -16))
      .style("pointer-events", "none")

    // Tooltip (visual only, hidden from screen readers)
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("aria-hidden", "true")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(15, 23, 42, 0.95)")
      .style("color", "white")
      .style("padding", "12px 16px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("z-index", "1000")
      .style("border", "1px solid rgba(99, 102, 241, 0.3)")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
      .style("backdrop-filter", "blur(8px)")

    node
      .on("mouseover", (event: any, d: any) => {
        tooltip
          .style("visibility", "visible")
          .html(
            `
            <div style="font-weight: 600; margin-bottom: 4px;">${d.label}</div>
            <div style="color: #94a3b8; font-size: 12px;">Type: ${d.type}</div>
            ${
              d.confidence != null
                ? `<div style="color: #94a3b8; font-size: 12px;">Confidence: ${Math.round(
                    d.confidence * 100,
                  )}%</div>`
                : ""
            }
          `,
          )
      })
      .on("mousemove", (event: any) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`)
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })
      .on("click", (event: any, d: any) => {
        if (d.url && onNodeClick) {
          onNodeClick(d.id, d.url)
        }
      })
      // Keyboard activation (Enter / Space)
      .on("keydown", (event: any, d: any) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (d.url && onNodeClick) {
            onNodeClick(d.id, d.url)
          }
        }
      })

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y)

      node
        .attr("cx", (d: any) => d.x as number)
        .attr("cy", (d: any) => d.y as number)

      label
        .attr("x", (d: any) => d.x as number)
        .attr("y", (d: any) => (d.y as number) - (d.type === "claim" ? 20 : 16))
    })

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })

    svg.call(zoom as any)

    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [graph, onNodeClick])

  return (
    <div className="w-full h-[400px] rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        role="img"
        aria-label="Visual relationship graph between the claim and supporting or refuting evidence sources"
      />
    </div>
  )
}
