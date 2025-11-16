import { type NextRequest, NextResponse } from "next/server"
import { verifyClaim, extractClaims } from "@/lib/gemini-verifier"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, claim } = body

    // Support both formats:
    // 1. { text: "raw text" } - extract claims first
    // 2. { claim: { text: "...", entities: [...] } } - verify directly
    
    let claimToVerify;

    if (claim && claim.text) {
      // Direct claim object provided
      claimToVerify = claim
      console.log("[API] Verifying claim:", claim.text)
    } else if (text) {
      // Raw text provided - extract claim first
      console.log("[API] Extracting claims from text...")
      const claims = await extractClaims(text)
      
      if (claims.length === 0) {
        return NextResponse.json(
          { error: "No claims found in text" },
          { status: 400 }
        )
      }
      
      claimToVerify = claims[0]
      console.log("[API] Extracted claim:", claimToVerify.text)
    } else {
      return NextResponse.json(
        { error: "Missing required field: 'text' or 'claim'" },
        { status: 400 }
      )
    }

    // Verify using Gemini API with Google Search
    console.log("[API] Calling Gemini API for verification...")
    
    const result = await verifyClaim(claimToVerify, (stage, message) => {
      console.log(`[API] [${stage}] ${message}`)
    })

    console.log("[API] Verification complete:", {
      verdict: result.verdict,
      score: result.authenticity_score,
      evidenceCount: result.evidence.length
    })

    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error("[API] Verification error:", error)
    
    // Provide helpful error messages
    if (error.message.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { 
          error: "Gemini API key not configured",
          details: "Please set GEMINI_API_KEY in your .env.local file"
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}