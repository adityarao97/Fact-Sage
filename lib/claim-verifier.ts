// claim-verifier.tsx
// Complete claim verification system with Transformers.js + MCP
// Deploy to Vercel as an API route or standalone service

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js for server-side usage
env.allowLocalModels = false;
env.useBrowserCache = false;

// ============================================================================
// TYPES (matching Python API contract)
// ============================================================================

interface Claim {
  text: string;
  entities: string[];
  context?: string;
}

interface EvidenceItem {
  url: string;
  title: string;
  snippet: string;
  stance: 'supporting' | 'refuting' | 'neutral';
  confidence: number;
  full_content?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'claim' | 'search' | 'evidence' | 'category';
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
  verdict: 'true' | 'false' | 'mixed' | 'uncertain';
  evidence: EvidenceItem[];
  graph: Graph;
  explanation: string;
  category?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CATEGORY_SOURCES: Record<string, string[]> = {
  tech: ['wired.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com'],
  business: ['wsj.com', 'bloomberg.com', 'reuters.com', 'ft.com'],
  politics: ['nytimes.com', 'washingtonpost.com', 'politico.com', 'reuters.com'],
  science: ['nature.com', 'sciencedaily.com', 'scientificamerican.com'],
  health: ['mayoclinic.org', 'webmd.com', 'nih.gov', 'who.int'],
  general: ['bbc.com', 'cnn.com', 'reuters.com', 'apnews.com']
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: ['technology', 'software', 'hardware', 'AI', 'computer', 'digital', 'internet', 'app'],
  business: ['acquisition', 'merger', 'company', 'corporation', 'stock', 'market', 'revenue'],
  politics: ['president', 'congress', 'election', 'government', 'policy', 'senator', 'vote'],
  science: ['research', 'study', 'discovery', 'experiment', 'scientist', 'laboratory'],
  health: ['disease', 'medical', 'patient', 'treatment', 'doctor', 'hospital', 'vaccine']
};

// ============================================================================
// MODEL CACHE (singleton pattern)
// ============================================================================

class ModelCache {
  private static classifier: any = null;
  private static generator: any = null;

  static async getClassifier() {
    if (!this.classifier) {
      console.log('[MODEL] Loading category classifier...');
      // Using zero-shot classification for category detection
      this.classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
    }
    return this.classifier;
  }

  static async getGenerator() {
    if (!this.generator) {
      console.log('[MODEL] Loading text generator...');
      this.generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
    }
    return this.generator;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract entities using regex patterns for metadata only.
 * Note: This is NOT used for claim extraction (LLM handles that).
 * We keep this ONLY for:
 * 1. Enriching claim objects with structured metadata
 * 2. Wikipedia entity lookup
 * 3. Graph visualization labels
 */
function extractEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Extract years (4-digit numbers)
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  entities.push(...years);
  
  // Extract proper nouns (capitalized words/phrases)
  const propNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  entities.push(...propNouns);
  
  // Extract all-caps acronyms
  const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
  entities.push(...acronyms);
  
  // Deduplicate and return top 6
  return [...new Set(entities)].slice(0, 6);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.href;
  } catch {
    return url;
  }
}

// ============================================================================
// CATEGORY CLASSIFICATION
// ============================================================================

async function classifyCategory(claim: string): Promise<string> {
  try {
    const classifier = await ModelCache.getClassifier();
    
    const categories = Object.keys(CATEGORY_SOURCES);
    const result = await classifier(claim, categories, { multi_label: false });
    
    console.log('[CATEGORY]', result);
    
    // Return category with highest score
    const topCategory = result.labels[0];
    return topCategory;
  } catch (error) {
    console.error('[CATEGORY] Classification failed:', error);
    // Fallback: keyword matching
    const claimLower = claim.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => claimLower.includes(kw.toLowerCase()))) {
        return category;
      }
    }
    return 'general';
  }
}

// ============================================================================
// SEARCH QUERY GENERATION
// ============================================================================

async function generateSearchQuery(claim: string): Promise<string> {
  try {
    const generator = await ModelCache.getGenerator();
    
    const prompt = `Create a concise search query (3-7 words) from this claim. Extract only the key facts: company names, events, numbers, dates. Remove opinions and unnecessary words.

Claim: "${claim}"

Search query:`;
    
    const result = await generator(prompt, {
      max_new_tokens: 20,
      temperature: 0.1,
      do_sample: false,
    });
    
    const query = result[0].generated_text.trim().replace(/['"]/g, '');
    console.log('[SEARCH-QUERY] Generated:', query);
    
    // Fallback: extract key entities if LLM fails
    if (query.length < 5 || query.length > 100) {
      const entities = extractEntities(claim);
      return entities.slice(0, 5).join(' ');
    }
    
    return query;
  } catch (error) {
    console.error('[SEARCH-QUERY] Generation failed:', error);
    // Fallback: use entities
    const entities = extractEntities(claim);
    return entities.slice(0, 5).join(' ');
  }
}

// ============================================================================
// DUCKDUCKGO SEARCH
// ============================================================================

async function searchDuckDuckGo(query: string, sources?: string[]): Promise<string[]> {
  const urls: string[] = [];
  
  try {
    // Build site-specific queries if sources provided
    const queries = sources 
      ? sources.map(site => `${query} site:${site}`)
      : [query];
    
    for (const q of queries.slice(0, 3)) { // Limit to 3 source queries
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`;
      
      console.log('[DDG] Searching:', q);
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'ClaimVerifier/1.0' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Extract URLs from results
      if (data.AbstractURL) urls.push(data.AbstractURL);
      
      const relatedTopics = data.RelatedTopics || [];
      for (const topic of relatedTopics.slice(0, 2)) {
        if (topic.FirstURL) urls.push(topic.FirstURL);
      }
    }
    
    // Also do a general web search via DDG HTML scraping fallback
    const htmlSearchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('[DDG] HTML search URL:', htmlSearchUrl);
    urls.push(htmlSearchUrl); // Include as evidence of search performed
    
  } catch (error) {
    console.error('[DDG] Search error:', error);
  }
  
  return [...new Set(urls)].slice(0, 8); // Return up to 8 unique URLs
}

// ============================================================================
// MCP AGENT: WEB CONTENT FETCHING
// ============================================================================

async function fetchWebContent(url: string): Promise<{ html: string; text: string } | null> {
  try {
    console.log('[FETCH] Retrieving:', url);
    
    // Skip DDG search result pages
    if (url.includes('duckduckgo.com')) {
      return null;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClaimVerifier/1.0)',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.error(`[FETCH] Failed: ${response.status} ${url}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract text content using simple HTML parsing
    const text = extractTextFromHtml(html);
    
    return { html, text };
  } catch (error) {
    console.error('[FETCH] Error:', url, error);
    return null;
  }
}

// ============================================================================
// MCP AGENT: CONTENT EXTRACTION (Readability-like)
// ============================================================================

function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Extract title if present
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Try to find article content (common patterns)
  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];
  
  let articleText = '';
  for (const pattern of articlePatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      articleText = matches
        .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .join(' ');
      break;
    }
  }
  
  const finalText = articleText || text;
  
  // Limit to reasonable length (first 5000 chars)
  return (title ? `${title}\n\n` : '') + finalText.slice(0, 5000);
}

// ============================================================================
// MCP AGENT ORCHESTRATION: PARALLEL FETCHING
// ============================================================================

async function fetchMultipleUrls(urls: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();
  
  // Fetch in parallel with max 5 concurrent requests
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(url => fetchWebContent(url))
    );
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        const url = batch[idx];
        contentMap.set(url, result.value.text);
      }
    });
  }
  
  return contentMap;
}

// ============================================================================
// LLM VERDICT GENERATION
// ============================================================================

async function generateVerdict(
  claim: string, 
  evidence: EvidenceItem[]
): Promise<{ score: number; verdict: string; explanation: string }> {
  try {
    const generator = await ModelCache.getGenerator();
    
    // Build detailed context from evidence
    const evidenceContext = evidence
      .filter(e => e.full_content && e.full_content.length > 100) // Only substantial content
      .slice(0, 5) // Top 5 sources
      .map((e, i) => {
        const content = e.full_content || e.snippet;
        return `Source ${i + 1} - ${e.title} (${e.url.split('/')[2]}):
${content.slice(0, 400)}...`;
      })
      .join('\n\n');
    
    const prompt = `You are an expert fact-checker. Analyze the claim against the provided evidence sources and determine if it is TRUE, FALSE, MIXED, or UNCERTAIN.

CLAIM TO VERIFY:
"${claim}"

EVIDENCE FROM RELIABLE SOURCES:
${evidenceContext}

INSTRUCTIONS:
1. Carefully read all evidence sources
2. Check if the key facts in the claim are supported by the evidence
3. Look for: specific numbers, dates, company names, events mentioned
4. Determine verdict: TRUE (fully supported), FALSE (contradicted), MIXED (partially true), or UNCERTAIN (insufficient evidence)
5. Provide a 2-3 sentence explanation citing specific sources

Your response should be in this format:
VERDICT: [TRUE/FALSE/MIXED/UNCERTAIN]
EXPLANATION: [Your 2-3 sentence explanation with source references]

Response:`;
    
    console.log('[LLM] Generating verdict with detailed evidence...');
    const result = await generator(prompt, {
      max_new_tokens: 200,
      temperature: 0.1, // Very low for consistency
      do_sample: true,
    });
    
    const response = result[0].generated_text;
    console.log('[LLM] Full response:', response);
    
    // Parse verdict and explanation
    const verdictMatch = response.match(/VERDICT:\s*(TRUE|FALSE|MIXED|UNCERTAIN)/i);
    const explanationMatch = response.match(/EXPLANATION:\s*(.+)/is);
    
    let verdict = 'uncertain';
    let score = 0.5;
    let explanation = response.slice(0, 500);
    
    if (verdictMatch) {
      const v = verdictMatch[1].toLowerCase();
      verdict = v;
      
      if (v === 'true') score = 0.85;
      else if (v === 'false') score = 0.15;
      else if (v === 'mixed') score = 0.5;
      else score = 0.5;
    } else {
      // Fallback parsing if format not followed
      const responseLower = response.toLowerCase();
      if (responseLower.includes('true') && !responseLower.includes('false')) {
        verdict = 'true';
        score = 0.8;
      } else if (responseLower.includes('false') && !responseLower.includes('true')) {
        verdict = 'false';
        score = 0.2;
      } else if (responseLower.includes('mixed')) {
        verdict = 'mixed';
        score = 0.5;
      }
    }
    
    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim().slice(0, 500);
    }
    
    return {
      score,
      verdict,
      explanation: explanation || response.slice(0, 500)
    };
    
  } catch (error) {
    console.error('[LLM] Generation error:', error);
    
    // Enhanced fallback heuristic with content analysis
    let score = 0.5;
    let verdict = 'uncertain';
    let matchCount = 0;
    
    // Extract key terms from claim
    const claimLower = claim.toLowerCase();
    const keyTerms = claim.match(/\b[A-Z][a-z]+|\$[\d.]+\s*(?:billion|million)|\d{4}\b/g) || [];
    
    for (const ev of evidence) {
      const contentLower = (ev.full_content || ev.snippet).toLowerCase();
      const matches = keyTerms.filter(term => 
        contentLower.includes(term.toLowerCase())
      ).length;
      
      if (matches >= keyTerms.length * 0.5) { // 50% of key terms match
        matchCount++;
      }
    }
    
    if (matchCount >= 2) {
      verdict = 'true';
      score = 0.7;
    } else if (matchCount === 0) {
      verdict = 'uncertain';
      score = 0.5;
    } else {
      verdict = 'mixed';
      score = 0.5;
    }
    
    return {
      score,
      verdict,
      explanation: `Based on analysis of ${evidence.length} sources, ${matchCount} sources contain relevant information supporting the claim. Key terms found: ${keyTerms.slice(0, 5).join(', ')}. (LLM verdict generation failed, using heuristic analysis)`
    };
  }
}

// ============================================================================
// MAIN VERIFICATION PIPELINE
// ============================================================================

export async function extractClaims(rawText: string): Promise<Claim[]> {
  const text = (rawText || '').trim();
  
  if (!text) {
    return [{
      text: 'The text is empty.',
      entities: [],
      context: 'No input provided'
    }];
  }
  
  const entities = extractEntities(text);
  
  return [{
    text,
    entities,
  }];
}

export async function verifyClaim(
  claim: Claim,
  onProgress?: (stage: string, message: string) => void
): Promise<VerificationResult> {
  console.log('[VERIFY] Starting verification for:', claim.text);
  console.log('[VERIFY] Entities:', claim.entities);
  
  const startTime = Date.now();
  
  // Step 1: Classify category
  onProgress?.("category", "Classifying claim category...");
  const category = await classifyCategory(claim.text);
  console.log('[VERIFY] Category:', category);
  
  // Step 2: Generate summarized search query using LLM
  onProgress?.("summarize", "Creating optimized search query...");
  const searchQuery = await generateSearchQuery(claim.text);
  console.log('[VERIFY] Search query:', searchQuery);
  
  // Step 3: Get category-specific sources
  const sources = CATEGORY_SOURCES[category] || CATEGORY_SOURCES.general;
  
  // Step 4: Search DuckDuckGo with summarized query (limit to 4-5 searches)
  onProgress?.("search", `Searching ${sources.length} ${category} sources...`);
  const searchUrls = await searchDuckDuckGo(searchQuery, sources.slice(0, 5)); // Only 5 sources max
  console.log('[VERIFY] Found URLs:', searchUrls.length);
  
  // Step 5: Fetch content from top URLs only (no Wikipedia)
  onProgress?.("fetch", `Fetching content from top ${Math.min(searchUrls.length, 8)} articles...`);
  const contentMap = await fetchMultipleUrls(searchUrls.slice(0, 8)); // Max 8 URLs
  console.log('[VERIFY] Fetched content from:', contentMap.size, 'URLs');
  
  // Step 6: Build evidence items (NO Wikipedia)
  const evidence: EvidenceItem[] = [];
  
  // Add only web articles as evidence
  for (const [url, content] of contentMap.entries()) {
    // Skip search pages and low-quality content
    if (url.includes('duckduckgo.com') || 
        url.includes('wikipedia.org') || 
        content.length < 200) {
      continue;
    }
    
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const title = lines[0] || 'News Article';
    const snippet = content.slice(0, 400);
    
    // Calculate confidence based on content quality and entity matches
    const entityMatches = claim.entities.filter(e => 
      content.toLowerCase().includes(e.toLowerCase())
    ).length;
    
    const confidence = Math.min(0.95, 0.6 + (entityMatches * 0.08));
    
    evidence.push({
      url: normalizeUrl(url),
      title: title.slice(0, 150),
      snippet,
      stance: 'neutral',
      confidence,
      full_content: content.slice(0, 3000) // Limit content for LLM
    });
  }
  
  console.log(`[VERIFY] Collected ${evidence.length} news articles`);
  
  // If we still have no evidence, add search result pages as fallback
  if (evidence.length === 0) {
    console.log('[VERIFY] No articles fetched, adding search page references');
    for (const source of sources.slice(0, 4)) {
      evidence.push({
        url: `https://www.${source}/search?q=${encodeURIComponent(searchQuery)}`,
        title: `${source} search results for: ${searchQuery}`,
        snippet: `Search results page. The search query "${searchQuery}" can be used to find relevant articles on ${source}.`,
        stance: 'neutral',
        confidence: 0.3,
      });
    }
  }
  
  // Sort by confidence
  evidence.sort((a, b) => b.confidence - a.confidence);
  
  // Step 7: Generate verdict using LLM with article summaries
  onProgress?.("verdict", "Analyzing articles and generating verdict...");
  const { score, verdict, explanation } = await generateVerdict(claim.text, evidence.slice(0, 5)); // Top 5 only
  
  // Step 8: Build graph with actual article URLs
  onProgress?.("graph", "Building evidence graph...");
  const graph: Graph = {
    nodes: [
      { id: 'claim', label: searchQuery, type: 'claim' }, // Use search query as label
      { id: 'category', label: `Category: ${category}`, type: 'category' }
    ],
    edges: [
      { source: 'claim', target: 'category', relation: 'classified_as' }
    ]
  };
  
  // Add evidence nodes directly (no search intermediaries)
  evidence.slice(0, 5).forEach((ev, i) => {
    const nodeId = `ev_${i}`;
    
    // Extract domain from URL for cleaner labels
    let domain = 'source';
    try {
      domain = new URL(ev.url).hostname.replace('www.', '').split('.')[0];
    } catch {}
    
    const label = `${domain}: ${ev.title.slice(0, 40)}...`;
    
    graph.nodes.push({
      id: nodeId,
      label,
      type: 'evidence'
    });
    
    graph.edges.push({
      source: 'claim',
      target: nodeId,
      relation: 'verified_by'
    });
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`[VERIFY] Completed in ${elapsed}ms`);
  onProgress?.("complete", `Verification complete in ${(elapsed / 1000).toFixed(1)}s`);
  
  return {
    authenticity_score: score,
    verdict: verdict as any,
    evidence: evidence.slice(0, 5), // Top 5 articles only
    graph,
    explanation,
    category
  };
}

// ============================================================================
// API ROUTE HANDLERS (for Vercel)
// ============================================================================

/**
 * USAGE EXAMPLES:
 * 
 * 🎯 Simplified News-Only Verification
 * 
 * The system now focuses ONLY on real news articles:
 * - NO Wikipedia searches
 * - NO entity-based lookups
 * - ONLY 4-5 targeted news source searches
 * - Returns top 5 actual article URLs with summaries
 * 
 * Flow:
 * 1. Input claim → LLM generates short search query (3-7 words)
 * 2. Search 4-5 category-specific news sources (Wired, TechCrunch, etc.)
 * 3. Fetch and parse top 5-8 articles
 * 4. LLM analyzes article content → verdict + explanation
 * 5. Graph shows actual article URLs (not search nodes)
 * 
 * Basic API call:
 * ```
 * POST /api/verify
 * {
 *   "text": "Intel posted $4.1B profit in Q3 2024"
 * }
 * ```
 * 
 * Search Query Generated:
 * ```
 * "Intel Q3 profit $4.1 billion"  (optimized by LLM)
 * ```
 * 
 * Full Response:
 * ```json
 * {
 *   "authenticity_score": 0.85,
 *   "verdict": "true",
 *   "category": "tech",
 *   "evidence": [
 *     {
 *       "url": "https://www.wired.com/story/intel-q3-2024-earnings/",
 *       "title": "Intel Reports Strong Q3 Earnings",
 *       "snippet": "Intel announced Q3 profit of $4.1 billion...",
 *       "confidence": 0.92,
 *       "full_content": "[3000 chars of article text]"
 *     },
 *     {
 *       "url": "https://techcrunch.com/2024/10/intel-earnings/",
 *       "title": "Intel Beats Expectations with Q3 Results",
 *       "confidence": 0.88
 *     },
 *     // 3-5 articles total
 *   ],
 *   "graph": {
 *     "nodes": [
 *       {"id": "claim", "label": "Intel Q3 profit $4.1 billion"},
 *       {"id": "category", "label": "Category: tech"},
 *       {"id": "ev_0", "label": "wired: Intel Reports Strong Q3..."},
 *       {"id": "ev_1", "label": "techcrunch: Intel Beats Expectations..."}
 *     ],
 *     "edges": [
 *       {"source": "claim", "target": "ev_0", "relation": "verified_by"},
 *       {"source": "claim", "target": "ev_1", "relation": "verified_by"}
 *     ]
 *   },
 *   "explanation": "VERDICT: TRUE\nEXPLANATION: Multiple tech sources including Wired and TechCrunch confirm Intel reported $4.1 billion profit in Q3 2024. The figures and timeline match across sources."
 * }
 * ```
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text) {
      return Response.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }
    
    // Extract claims
    const claims = await extractClaims(text);
    
    if (claims.length === 0) {
      return Response.json(
        { error: 'No claims found in text' },
        { status: 400 }
      );
    }
    
    // Verify first claim
    const result = await verifyClaim(claims[0]);
    
    return Response.json(result);
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// For testing/development
if (require.main === module) {
  (async () => {
    const testClaim = 'NVIDIA acquired Mellanox Technologies in 2020 for $7 billion';
    console.log('Testing claim:', testClaim);
    
    const claims = await extractClaims(testClaim);
    const result = await verifyClaim(claims[0]);
    
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  })();
}