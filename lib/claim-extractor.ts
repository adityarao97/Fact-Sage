import type { Claim } from "./types"

/**
 * Extract claims from text using a lightweight LLM (Flan-T5)
 * Pure AI approach - no regex, no text preprocessing, no manual patterns
 * The LLM handles OCR errors, formatting issues, and incomplete sentences automatically
 */

// Model cache to avoid reloading
let generator: any = null

async function getGenerator() {
  if (!generator) {
    console.log("[CLAIM-EXTRACT] Loading Flan-T5 model...")
    const { pipeline } = await import("@xenova/transformers")
    generator = await pipeline("text2text-generation", "Xenova/flan-t5-small")
    console.log("[CLAIM-EXTRACT] Model loaded successfully")
  }
  return generator
}

export async function extractClaims(
  text: string,
  onProgress?: (message: string) => void
): Promise<Claim[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for claim extraction")
  }

  onProgress?.("Loading AI model...")

  // Load the LLM model
  const llm = await getGenerator()

  onProgress?.("Analyzing text with AI (no preprocessing)...")

  try {
    // Pure LLM approach - pass raw text directly
    const prompt = `You are a claim extraction assistant. Read the text below and extract factual claims that can be verified.

Rules:
1. Extract 1-3 verifiable factual claims
2. Each claim must be a complete, clear sentence
3. Fix any OCR errors, formatting issues, or incomplete sentences
4. Focus on facts: numbers, dates, events, announcements, acquisitions, financial data
5. Ignore opinions, speculation, or subjective statements

Text:
${text}

Extract the claims as a numbered list. Be concise and precise.

1.`

    onProgress?.("Generating clean claims from text...")

    const result = await llm(prompt, {
      max_new_tokens: 256,
      temperature: 0.2,
      do_sample: false,
    })

    const response = result[0].generated_text.trim()
    console.log("[CLAIM-EXTRACT] LLM response:", response)

    onProgress?.("Parsing extracted claims...")

    // Parse numbered list from LLM output
    const lines = response.split("\n").map((l: string) => l.trim()).filter(Boolean)
    // Validity check: if response contains no alphabetic characters,
    // treat it as invalid/garbage (e.g., repeated "0: 0: 0:") and skip parsing.
    const hasLetters = /[A-Za-zÀ-ÿ]/.test(response)
    if (!hasLetters) {
      console.warn("[CLAIM-EXTRACT] LLM returned non-textual output, falling back to original text")
    }
    const claims: Claim[] = []
    // Helper to detect garbage LLM outputs (e.g., "0: 0: 0: ...")
    function isValidClaimText(t: string) {
      if (!t || t.length < 15) return false
      // Must contain at least one alphabetic character
      if (!/[A-Za-zÀ-ÿ]/.test(t)) return false
      // Reject sequences that are mostly digits/punctuation (e.g., "0: 0: 0:")
      const tokens = t.split(/\s+/)
      const numericLike = tokens.filter((tok) => /^\d+[:\.)-]*$/.test(tok))
      if (numericLike.length / Math.max(1, tokens.length) > 0.6) return false
      return true
    }

    for (const line of lines) {
      // Match lines that start with numbers: "1. ", "1) ", "1:", etc.
      const match = line.match(/^(\d+)[\.\)\:]?\s+(.+)$/)
      if (match && match[2]) {
        // Ignore lists that start counting from 0 which is often a sign of
        // malformed LLM output (e.g., "0: 0: 0:")
        if (match[1] === "0") {
          console.warn("[CLAIM-EXTRACT] Ignoring numbered item starting at 0 from LLM")
          continue
        }
        const claimText = match[2].trim()
        if (hasLetters && isValidClaimText(claimText)) {
          claims.push({
            text: claimText,
            entities: extractEntitiesForMetadata(claimText),
            context: text.substring(0, 200),
          })
        } else {
          console.warn("[CLAIM-EXTRACT] Skipping invalid claim text from LLM:", claimText.slice(0, 120))
        }
      }
    }

    console.log(`[CLAIM-EXTRACT] Parsed ${claims.length} claims`)

    // If LLM didn't return structured output, try to use the whole response
    // If LLM didn't return structured output or returned garbage, only use
    // the full response if it appears to be valid text. Otherwise fall back
    // to the original input text to avoid passing numeric garbage.
    if (claims.length === 0 && response.length > 15 && hasLetters) {
      console.log("[CLAIM-EXTRACT] Using full LLM response as single claim")
      claims.push({
        text: response,
        entities: extractEntitiesForMetadata(response),
        context: text.substring(0, 200),
      })
    }

    // Final fallback: use original text
    if (claims.length === 0) {
      console.log("[CLAIM-EXTRACT] LLM failed, using original text")
      onProgress?.("Using original text as fallback...")
      return [
        {
          text: text.slice(0, 500),
          entities: extractEntitiesForMetadata(text),
          context: text.substring(0, 200),
        },
      ]
    }

    onProgress?.("Claim extraction complete")
    return claims.slice(0, 3) // Max 3 claims
  } catch (error: any) {
    console.error("[CLAIM-EXTRACT] LLM error:", error)
    onProgress?.("AI extraction failed, using fallback...")

    // Emergency fallback: return original text
    return [
      {
        text: text.slice(0, 500),
        entities: extractEntitiesForMetadata(text),
        context: text.substring(0, 200),
      },
    ]
  }
}

/**
 * Extract entities for metadata enrichment only
 * Note: This is NOT used for claim extraction (LLM does that)
 * We keep this ONLY for adding structured metadata to claim objects
 */
function extractEntitiesForMetadata(text: string): string[] {
  const entities: string[] = []

  // Extract years
  const years = text.match(/\b(19|20)\d{2}\b/g) || []
  entities.push(...years)

  // Extract monetary amounts
  const amounts = text.match(/\$\s*[\d.,]+\s*(?:billion|million|trillion|B|M|T)\b/gi) || []
  entities.push(...amounts)

  // Extract capitalized words (potential proper nouns)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
  entities.push(...capitalizedWords)

  // Extract acronyms
  const acronyms = text.match(/\b[A-Z]{2,}\b/g) || []
  entities.push(...acronyms)

  // Extract numbers with context
  const numbers =
    text.match(/\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|trillion|thousand|percent|%)?/gi) || []
  entities.push(...numbers)

  // Extract percentages
  const percentages = text.match(/\d+\.?\d*\s*%/g) || []
  entities.push(...percentages)

  // Deduplicate and limit
  const unique = [...new Set(entities)]
  const filtered = unique.filter((e) => {
    const lower = e.toLowerCase()
    return (
      e.length > 1 && !["the", "and", "for", "with", "from", "that", "this", "have", "been"].includes(lower)
    )
  })

  return filtered.slice(0, 8) // Top 8 entities
}
