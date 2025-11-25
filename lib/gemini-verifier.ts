// gemini-verifier.ts
// Fact-checking using Gemini API with Google Search grounding
// Maintains compatibility with existing claim-verifier.tsx interface

// Add to the top of gemini-verifier.ts and claim-verifier.ts

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
// Note: Using gemini-1.5-flash (stable) instead of 2.0-flash-exp which has stricter rate limits

// ============================================================================
// TYPES (matching existing API contract)
// ============================================================================

interface Claim {
  text: string;
  entities?: string[];
  context?: string;
}

interface EvidenceItem {
  url: string;
  title: string;
  snippet: string;
  stance: "supporting" | "refuting" | "neutral";
  confidence: number;
  full_content?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: "claim" | "search" | "evidence" | "category";
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface VerificationResult {
  authenticity_score: number;
  verdict: "true" | "false" | "mixed" | "uncertain";
  evidence: EvidenceItem[];
  graph: Graph;
  explanation: string;
  category?: string;
}

// ============================================================================
// GEMINI API CONFIGURATION
// ============================================================================

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    claim: { type: "string" },
    verdict: {
      type: "string",
      enum: ["True", "False", "Misleading", "Unproven", "Complex"],
    },
    summary: { type: "string" },
    category: {
      type: "string",
      enum: ["tech", "business", "politics", "science", "health", "general"],
    },
    supportingSources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" },
        },
        required: ["title", "url", "snippet"],
      },
    },
    refutingSources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" },
        },
        required: ["title", "url", "snippet"],
      },
    },
  },
  required: [
    "claim",
    "verdict",
    "summary",
    "category",
    "supportingSources",
    "refutingSources",
  ],
};

const SYSTEM_PROMPT = `You are an expert fact-checking agent with access to Google Search. Your task is to thoroughly investigate claims using web search.

INSTRUCTIONS:
1. Use Google Search to find 5-10 reputable sources (news articles, official sites, academic papers)
2. Categorize the claim into: tech, business, politics, science, health, or general
3. Analyze each source and categorize as:
   - supportingSources: Sources that confirm or support the claim
   - refutingSources: Sources that contradict or refute the claim
4. For each source provide:
   - title: Full article/page title
   - url: Complete URL
   - snippet: 1-2 sentence summary of relevant information
5. Provide a clear verdict:
   - "True": Claim is well-supported by evidence
   - "False": Claim is contradicted by evidence
   - "Misleading": Claim is partially true but misrepresented
   - "Unproven": Insufficient evidence to verify
   - "Complex": Mixed evidence or nuanced situation
6. Write a 2-3 sentence summary explaining your verdict

FOCUS ON:
- Recent, authoritative sources (news sites, official announcements, research)
- Primary sources over secondary when possible
- Multiple independent sources
- Specific facts: dates, numbers, names, events

RETURN JSON ONLY with the specified schema.`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractEntities(text: string): string[] {
  const entities: string[] = [];

  // Years
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  entities.push(...years);

  // Money
  const amounts =
    text.match(/\$\s*[\d.,]+\s*(?:billion|million|trillion|B|M|T)\b/gi) || [];
  entities.push(...amounts);

  // Proper nouns
  const propNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  entities.push(...propNouns);

  // Acronyms
  const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
  entities.push(...acronyms);

  return [...new Set(entities)].slice(0, 8);
}

function mapVerdictToFormat(geminiVerdict: string): {
  verdict: string;
  score: number;
} {
  const verdictMap: Record<string, { verdict: string; score: number }> = {
    True: { verdict: "true", score: 0.9 },
    False: { verdict: "false", score: 0.1 },
    Misleading: { verdict: "mixed", score: 0.3 },
    Unproven: { verdict: "uncertain", score: 0.5 },
    Complex: { verdict: "mixed", score: 0.5 },
  };

  return verdictMap[geminiVerdict] || { verdict: "uncertain", score: 0.5 };
}

// ============================================================================
// EXPONENTIAL BACKOFF
// ============================================================================

const backoff = (attempt: number) => {
  const delay = Math.min(
    Math.pow(2, attempt) * 1000 + Math.random() * 1000,
    30000
  );
  console.log(
    `[GEMINI-VERIFY] Backing off for ${delay}ms before retry ${attempt + 1}`
  );
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// ============================================================================
// RESPONSE PARSER
// ============================================================================

function parseGeminiResponse(text: string): {
  verdict: string;
  category: string;
  summary: string;
  supportingSources: Array<{ title: string; url: string; snippet: string }>;
  refutingSources: Array<{ title: string; url: string; snippet: string }>;
} {
  console.log("[GEMINI-VERIFY] Parsing response text...");

  // Extract verdict
  const verdictMatch = text.match(
    /VERDICT:\s*(True|False|Misleading|Unproven|Complex)/i
  );
  const verdict = verdictMatch ? verdictMatch[1] : "Unproven";

  // Extract category
  const categoryMatch = text.match(
    /CATEGORY:\s*(tech|business|politics|science|health|general)/i
  );
  const category = categoryMatch ? categoryMatch[1].toLowerCase() : "general";

  // Extract summary
  const summaryMatch = text.match(
    /SUMMARY:\s*([^\n]+(?:\n(?!(?:SUPPORTING|REFUTING|VERDICT|CATEGORY))[^\n]+)*)/i
  );
  const summary = summaryMatch ? summaryMatch[1].trim() : "Analysis complete.";

  // Extract supporting sources
  const supportingSources: Array<{
    title: string;
    url: string;
    snippet: string;
  }> = [];
  const supportingSection = text.match(
    /SUPPORTING SOURCES:([\s\S]*?)(?=REFUTING SOURCES:|$)/i
  );

  if (supportingSection) {
    const sources = supportingSection[1].match(
      /- TITLE:\s*([^\n]+)\s*- URL:\s*([^\n]+)\s*- SNIPPET:\s*([^\n]+(?:\n(?!- TITLE:)[^\n]+)*)/gi
    );
    if (sources) {
      for (const source of sources) {
        const titleMatch = source.match(/- TITLE:\s*([^\n]+)/i);
        const urlMatch = source.match(/- URL:\s*([^\n]+)/i);
        const snippetMatch = source.match(
          /- SNIPPET:\s*([^\n]+(?:\n(?!- TITLE:)[^\n]+)*)/i
        );

        if (titleMatch && urlMatch && snippetMatch) {
          supportingSources.push({
            title: titleMatch[1].trim(),
            url: urlMatch[1].trim(),
            snippet: snippetMatch[1].trim(),
          });
        }
      }
    }
  }

  // Extract refuting sources
  const refutingSources: Array<{
    title: string;
    url: string;
    snippet: string;
  }> = [];
  const refutingSection = text.match(/REFUTING SOURCES:([\s\S]*?)$/i);

  if (refutingSection) {
    const sources = refutingSection[1].match(
      /- TITLE:\s*([^\n]+)\s*- URL:\s*([^\n]+)\s*- SNIPPET:\s*([^\n]+(?:\n(?!- TITLE:)[^\n]+)*)/gi
    );
    if (sources) {
      for (const source of sources) {
        const titleMatch = source.match(/- TITLE:\s*([^\n]+)/i);
        const urlMatch = source.match(/- URL:\s*([^\n]+)/i);
        const snippetMatch = source.match(
          /- SNIPPET:\s*([^\n]+(?:\n(?!- TITLE:)[^\n]+)*)/i
        );

        if (titleMatch && urlMatch && snippetMatch) {
          refutingSources.push({
            title: titleMatch[1].trim(),
            url: urlMatch[1].trim(),
            snippet: snippetMatch[1].trim(),
          });
        }
      }
    }
  }

  console.log("[GEMINI-VERIFY] Parsed:", {
    verdict,
    category,
    supportingSources: supportingSources.length,
    refutingSources: refutingSources.length,
  });

  return {
    verdict,
    category,
    summary,
    supportingSources,
    refutingSources,
  };
}

// ============================================================================
// MAIN VERIFICATION FUNCTIONS
// ============================================================================

export async function extractClaims(rawText: string): Promise<Claim[]> {
  const text = (rawText || "").trim();

  if (!text) {
    return [
      {
        text: "The text is empty.",
        entities: [],
        context: "No input provided",
      },
    ];
  }

  const entities = extractEntities(text);

  return [
    {
      text,
      entities,
    },
  ];
}

export async function verifyClaim(
  claim: Claim,
  onProgress?: (stage: string, message: string) => void
): Promise<VerificationResult> {
  console.log("[GEMINI-VERIFY] Starting verification for:", claim.text);

  const startTime = Date.now();

  // Get API key from environment
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // console.log('[GEMINI-VERIFY] Checking API key...');
  // console.log('[GEMINI-VERIFY] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
  // console.log('[GEMINI-VERIFY] NEXT_PUBLIC_GEMINI_API_KEY exists:', !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  if (!apiKey) {
    console.error("[GEMINI-VERIFY] No API key found in environment variables");
    console.error(
      "[GEMINI-VERIFY] Available env vars:",
      Object.keys(process.env).filter((k) => k.includes("GEMINI"))
    );
    throw new Error(
      "GEMINI_API_KEY environment variable is required. Please add it to your .env.local file."
    );
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Fact-check this claim using Google Search and provide a detailed analysis:

CLAIM: "${claim.text}"

You must structure your response EXACTLY as follows:

VERDICT: [choose one: True, False, Misleading, Unproven, or Complex]
CATEGORY: [choose one: tech, business, politics, science, health, or general]
SUMMARY: [2-3 sentence explanation of your verdict]

SUPPORTING SOURCES:
[For each source that supports the claim, provide:]
- TITLE: [article title]
- URL: [full URL]
- SNIPPET: [1-2 sentence summary]

REFUTING SOURCES:
[For each source that refutes the claim, provide:]
- TITLE: [article title]
- URL: [full URL]
- SNIPPET: [1-2 sentence summary]

Find 5-10 reputable sources and categorize them as supporting or refuting. Be thorough and cite specific evidence.`,
          },
        ],
      },
    ],
    tools: [
      {
        google_search: {}, // Enables Google Search grounding
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
      // NO responseMimeType when using tools!
    },
  };

  let attempt = 0;
  const maxAttempts = 5; // Increased from 3

  while (attempt < maxAttempts) {
    try {
      onProgress?.(
        "search",
        `Searching with Google (attempt ${attempt + 1}/${maxAttempts})...`
      );

      console.log(
        `[GEMINI-VERIFY] Attempt ${attempt + 1} - Calling Gemini API...`
      );
      console.log(`[GEMINI-VERIFY] API URL: ${GEMINI_API_URL}`);
      console.log(
        `[GEMINI-VERIFY] API Key (first 10 chars): ${apiKey.substring(
          0,
          10
        )}...`
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(`[GEMINI-VERIFY] Response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[GEMINI-VERIFY] Error response body:`, errorBody);

        if (response.status === 429) {
          // Rate limit - wait longer before retry
          console.warn(`[GEMINI-VERIFY] Rate limit hit (429), backing off...`);
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(
              `Rate limit exceeded after ${maxAttempts} attempts. Please wait a few minutes and try again.`
            );
          }
          await backoff(attempt);
          continue; // Retry
        }

        if (response.status >= 500) {
          // Server error - retry
          console.warn(
            `[GEMINI-VERIFY] Server error (${response.status}), retrying...`
          );
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(`Server error after ${maxAttempts} attempts`);
          }
          await backoff(attempt);
          continue;
        }

        // Client error - don't retry
        throw new Error(`API error (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      console.log("[GEMINI-VERIFY] API response received");

      if (
        result.candidates &&
        result.candidates[0]?.content?.parts?.[0]?.text
      ) {
        onProgress?.("parsing", "Parsing results...");

        const responseText = result.candidates[0].content.parts[0].text;
        console.log(
          "[GEMINI-VERIFY] Response text length:",
          responseText.length
        );

        // Parse the structured text response
        const geminiResult = parseGeminiResponse(responseText);

        console.log("[GEMINI-VERIFY] Parsed result:", {
          verdict: geminiResult.verdict,
          supportingSources: geminiResult.supportingSources?.length || 0,
          refutingSources: geminiResult.refutingSources?.length || 0,
        });

        // Transform Gemini response to our format
        const evidence: EvidenceItem[] = [];

        // Add supporting sources
        if (geminiResult.supportingSources) {
          for (const source of geminiResult.supportingSources) {
            evidence.push({
              url: source.url,
              title: source.title,
              snippet: source.snippet,
              stance: "supporting",
              confidence: 0.85,
            });
          }
        }

        // Add refuting sources
        if (geminiResult.refutingSources) {
          for (const source of geminiResult.refutingSources) {
            evidence.push({
              url: source.url,
              title: source.title,
              snippet: source.snippet,
              stance: "refuting",
              confidence: 0.85,
            });
          }
        }

        // Map verdict
        const { verdict, score } = mapVerdictToFormat(geminiResult.verdict);

        // Build graph
        const graph: Graph = {
          nodes: [
            {
              id: "claim",
              label: claim.text.slice(0, 100) + "...",
              type: "claim",
            },
            {
              id: "category",
              label: `Category: ${geminiResult.category || "general"}`,
              type: "category",
            },
          ],
          edges: [
            { source: "claim", target: "category", relation: "classified_as" },
          ],
        };

        // Add evidence nodes
        evidence.forEach((ev, i) => {
          const nodeId = `ev_${i}`;
          let domain = "source";
          try {
            domain = new URL(ev.url).hostname.replace("www.", "").split(".")[0];
          } catch {}

          const label = `${domain}: ${ev.title.slice(0, 40)}...`;

          graph.nodes.push({
            id: nodeId,
            label,
            type: "evidence",
          });

          graph.edges.push({
            source: "claim",
            target: nodeId,
            relation:
              ev.stance === "supporting" ? "supported_by" : "refuted_by",
          });
        });

        const elapsed = Date.now() - startTime;
        console.log(`[GEMINI-VERIFY] Completed in ${elapsed}ms`);
        onProgress?.(
          "complete",
          `Verification complete in ${(elapsed / 1000).toFixed(1)}s`
        );

        return {
          authenticity_score: score,
          verdict: verdict as any,
          evidence: evidence.slice(0, 10), // Top 10 sources
          graph,
          explanation: geminiResult.summary || "Analysis complete.",
          category: geminiResult.category || "general",
        };
      } else {
        console.error("[GEMINI-VERIFY] Unexpected response structure:", result);
        throw new Error("Invalid API response structure");
      }
    } catch (error: any) {
      console.error(
        `[GEMINI-VERIFY] Attempt ${attempt + 1} failed:`,
        error.message
      );
      attempt++;

      if (attempt >= maxAttempts) {
        console.error("[GEMINI-VERIFY] All attempts failed");

        // Return error result
        return {
          authenticity_score: 0.5,
          verdict: "uncertain",
          evidence: [],
          graph: {
            nodes: [
              {
                id: "claim",
                label: claim.text.slice(0, 100) + "...",
                type: "claim",
              },
              { id: "error", label: "Verification failed", type: "category" },
            ],
            edges: [],
          },
          explanation: `Fact-check failed after ${maxAttempts} attempts: ${error.message}. Please try again.`,
          category: "general",
        };
      }

      await backoff(attempt);
    }
  }

  // Should never reach here
  throw new Error("Verification failed");
}

// ============================================================================
// API ROUTE HANDLER (Next.js)
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return Response.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    console.log("[API] Extracting claims...");
    const claims = await extractClaims(text);

    if (claims.length === 0) {
      return Response.json(
        { error: "No claims found in text" },
        { status: 400 }
      );
    }

    console.log("[API] Verifying claim with Gemini...");
    const result = await verifyClaim(claims[0], (stage, message) => {
      console.log(`[API] [${stage}] ${message}`);
    });

    return Response.json(result);
  } catch (error: any) {
    console.error("[API] Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
