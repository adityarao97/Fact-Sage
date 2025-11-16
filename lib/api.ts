import type { Claim, IngestResponse, VerifyResponse } from "./types"

export const getApiBase = (): string => {
  // Use relative URLs to call our Next.js API routes
  return "/api"
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase()
  const url = `${base}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new ApiError(`API error: ${errorData.error || response.statusText}`, response.status)
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function ingestText(text: string): Promise<IngestResponse> {
  return fetchApi<IngestResponse>("/ingest/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  })
}

export async function ingestDocument(params: {
  pdf_url?: string
  pdf_b64?: string
}): Promise<IngestResponse> {
  return fetchApi<IngestResponse>("/ingest/document", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function ingestImage(params: {
  image_url?: string
  image_b64?: string
}): Promise<IngestResponse> {
  return fetchApi<IngestResponse>("/ingest/image", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function verify(raw_text: string, claims: Claim[]): Promise<VerifyResponse> {
  if (!raw_text || claims.length === 0) {
    throw new ApiError("raw_text and claims are required for verification")
  }

  return fetchApi<VerifyResponse>("/verify", {
    method: "POST",
    body: JSON.stringify({ raw_text, claims }),
  })
}

export { ApiError }
