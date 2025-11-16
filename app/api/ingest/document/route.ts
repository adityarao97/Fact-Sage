import { type NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_BASE}/ingest/document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Backend API error: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    if (data.unified) {
      return NextResponse.json(data.unified)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
