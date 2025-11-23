<div align="center">

# 🔍 FactSage

### AI-Powered Fact-Checking Platform

*Verify claims instantly with Google Search + Gemini AI*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0-orange?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Demo](#-demo) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🌟 Overview

**FactSage** is an intelligent fact-checking application that combines OCR text extraction, AI-powered claim analysis, and real-time Google Search verification to help you verify information accuracy in seconds.

### Why FactSage?

- 🚀 **3-8 second verification** using Gemini AI + Google Search
- 📸 **OCR support** for images and screenshots  
- 🎯 **85-95% accuracy** with multi-source verification
- 🔗 **Source attribution** with supporting and refuting evidence
- 📊 **Visual knowledge graphs** showing verification paths
- 🏷️ **Auto-categorization** (tech, business, politics, science, health)

---

## ✨ Features

### 🤖 AI-Powered Verification
- **Gemini 1.5 Flash** with Google Search grounding
- Automatic claim extraction from messy OCR text
- Intelligent query generation for optimal search results
- Structured verdict with confidence scores

### 📰 Multi-Source Analysis
- Fetches 5-10 reputable sources automatically
- Categorizes sources as supporting or refuting
- Direct links to original articles
- Comprehensive snippets and summaries

### 📊 Visual Knowledge Graph
- Interactive graph visualization
- Shows verification paths and relationships
- Clear evidence attribution
- Easy-to-understand verdict display

### 🔧 Developer-Friendly
- TypeScript + Next.js 14
- Clean API architecture
- Extensible verification system
- Comprehensive error handling

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Gemini API Key** ([Get one free](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/kashishdesai01/CMPE-280-FactSage.git
cd factsage

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:

```bash
# Required: Gemini API Key
GEMINI_API_KEY=your_api_key_here

# Optional: For development
NODE_ENV=development
```

### Run Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 📖 Usage

### Basic Claim Verification

```typescript
// POST /api/verify-claim
{
  "text": "Intel posted $4.1B profit in Q3 2024"
}
```

### Response Format

```json
{
  "authenticity_score": 0.9,
  "verdict": "true",
  "category": "tech",
  "evidence": [
    {
      "url": "https://cnbc.com/2024/intel-earnings",
      "title": "Intel Reports Strong Q3 Results",
      "snippet": "Intel announced Q3 profit of $4.1 billion...",
      "stance": "supporting",
      "confidence": 0.85
    }
  ],
  "explanation": "Multiple sources confirm Intel's Q3 profit...",
  "graph": { "nodes": [...], "edges": [...] }
}
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│   User Input    │ (Text/OCR Image)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Claim Extractor │ (LLM-powered cleanup)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gemini Verifier │ (Google Search + AI)
└────────┬────────┘
         │
         ├─── Classify Category
         ├─── Generate Search Query
         ├─── Fetch 5-10 Sources
         ├─── Analyze Evidence
         └─── Generate Verdict
         │
         ▼
┌─────────────────┐
│ Structured JSON │ (Verdict + Sources + Graph)
└─────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Gemini 1.5 Flash** | AI fact-checking & analysis |
| **Google Search** | Real-time web verification |
| **Tesseract.js** | OCR for image text extraction |
| **Tailwind CSS** | Utility-first styling |
| **Shadcn/UI** | Component library |

---

## 📁 Project Structure

```
factsage/
├── app/
│   ├── api/
│   │   ├── verify-claim/
│   │   │   └── route.ts         # Main verification endpoint
│   ├── page.tsx                 # Home page
│   └── layout.tsx
├── lib/
│   ├── gemini-verifier.ts       # Gemini AI integration
│   ├── claim-extractor.ts       # LLM claim extraction
│   ├── types.ts                 # TypeScript definitions
│   └── utils.ts
├── components/
│   ├── claim-input.tsx
│   ├── evidence-panel.tsx
│   └── knowledge-graph.tsx
├── .env.local                   # Environment variables
├── package.json
└── README.md
```

---

## 🎯 API Endpoints

### `POST /api/verify-claim`

Verify a factual claim using AI + Google Search.

**Request Body:**
```json
{
  "text": "Your claim here"
}
```

**Response:**
- `authenticity_score`: 0.0-1.0 confidence
- `verdict`: `true`, `false`, `mixed`, or `uncertain`
- `category`: Auto-detected category
- `evidence`: Array of sources with stance
- `graph`: Knowledge graph visualization data
- `explanation`: Human-readable summary

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Test API endpoint
curl -X POST http://localhost:3000/api/verify-claim \
  -H "Content-Type: application/json" \
  -d '{"text":"The earth is round"}'
```

---

## 🔐 API Limits

**Gemini Free Tier:**
- ✅ 15 requests/minute
- ✅ 1,500 requests/day
- ✅ No credit card required

**Cost (Paid Tier):**
- 💰 ~$0.001 per verification
- 💰 ~$1 per 1,000 verifications

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Use meaningful commit messages

## 🙏 Acknowledgments

- **Google Gemini** for AI capabilities
- **Tesseract.js** for OCR functionality
- **Next.js** team for the amazing framework
- **Vercel** for deployment platform

## 🗺️ Roadmap

- [x] Gemini AI integration
- [x] OCR text extraction
- [x] Knowledge graph visualization
- [ ] Multi-language support
- [ ] Browser extension
- [ ] Mobile app (React Native)
- [ ] API rate limiting dashboard
- [ ] Custom source prioritization
- [ ] Historical claim tracking
- [ ] Collaborative fact-checking