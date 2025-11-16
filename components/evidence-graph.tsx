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
        case "support":
          return "#10b981"
        case "refute":
          return "#ef4444"
        case "neutral":
          return "#6b7280"
        default:
          return "#6b7280"
      }
    }

    const simulation = d3
      .forceSimulation(graph.nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(graph.edges)
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
      .attr("stroke", (d) => {
        if (d.stance === "support") return "#10b981"
        if (d.stance === "refute") return "#ef4444"
        return "#6b7280"
      })
      .attr("stroke-width", (d) => Math.max(2, d.weight * 4))
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", (d) => `url(#arrow-${d.stance})`)

    const node = g
      .append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .join("circle")
      .attr("r", (d) => (d.type === "claim" ? 14 : 10))
      .attr("fill", (d) => getNodeColor(d.type))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 3)
      .attr("cursor", (d) => (d.url ? "pointer" : "default"))
      .style("filter", "drop-shadow(0 0 8px currentColor)")
      .call(d3.drag<SVGCircleElement, any>().on("start", dragstarted).on("drag", dragged).on("end", dragended) as any)

    const label = g
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("dx", 18)
      .attr("dy", 4)
      .attr("fill", "#e2e8f0")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.8)")

    const tooltip = d3
      .select("body")
      .append("div")
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
      .on("mouseover", (event, d: any) => {
        tooltip.style("visibility", "visible").html(`
          <div style="font-weight: 600; margin-bottom: 4px;">${d.label}</div>
          <div style="color: #94a3b8; font-size: 12px;">Type: ${d.type}</div>
          ${d.confidence ? `<div style="color: #94a3b8; font-size: 12px;">Confidence: ${Math.round(d.confidence * 100)}%</div>` : ""}
        `)
      })
      .on("mousemove", (event) => {
        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px")
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })
      .on("click", (event, d: any) => {
        if (d.url && onNodeClick) {
          onNodeClick(d.id, d.url)
        }
      })

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y)
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
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom as any)

    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [graph, onNodeClick])

  return (
    <div className="w-full h-[400px] rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
