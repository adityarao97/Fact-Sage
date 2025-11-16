# check-mate

AI-powered fact verification UI that connects to a backend API for claim extraction and verification.

## Features

- **Multiple Input Modes**: Text, PDF, Image, and Audio
- **Claim Extraction**: Automatically extract verifiable claims from content
- **Fact Verification**: Verify claims against evidence sources
- **Evidence Graph**: Interactive D3 visualization of claim relationships
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. Install dependencies:

\`\`\`bash
npm install
# or
pnpm install
\`\`\`

2. Configure environment variables:

Copy `.env.example` to `.env.local` and set your backend API URL:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local`:

\`\`\`
NEXT_PUBLIC_API_BASE=http://Check-mate-env.eba-kdf2pckq.us-east-2.elasticbeanstalk.com
\`\`\`

3. Run the development server:

\`\`\`bash
npm run dev
# or
pnpm dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend API Requirements

The UI expects the following endpoints to be available:

### POST /ingest/text
Extract claims from plain text.

**Request:**
\`\`\`json
{
  "text": "NVIDIA acquired Mellanox in 2020."
}
\`\`\`

**Response:**
\`\`\`json
{
  "raw_text": "NVIDIA acquired Mellanox in 2020.",
  "claims": [
    {
      "text": "NVIDIA acquired Mellanox in 2020.",
      "entities": ["NVIDIA", "Mellanox", "2020"]
    }
  ]
}
\`\`\`

### POST /ingest/document
Extract claims from PDF documents.

**Request:**
\`\`\`json
{
  "pdf_url": "https://example.com/document.pdf"
  // OR
  "pdf_b64": "base64_encoded_pdf_content"
}
\`\`\`

### POST /ingest/image
Extract claims from images.

**Request:**
\`\`\`json
{
  "image_url": "https://example.com/image.jpg"
  // OR
  "image_b64": "base64_encoded_image_content"
}
\`\`\`

### POST /ingest/audio
Extract claims from audio files (MP3/WAV).

**Request:**
\`\`\`json
{
  "audio_url": "https://example.com/audio.mp3",
  // OR
  "audio_b64": "base64_encoded_audio_content",
  "lang": "en"  // optional, defaults to 'en'
}
\`\`\`

### POST /verify
Verify claims and retrieve evidence.

**Request:**
\`\`\`json
{
  "raw_text": "NVIDIA acquired Mellanox in 2020.",
  "claims": [
    {
      "text": "NVIDIA acquired Mellanox in 2020.",
      "entities": ["NVIDIA", "Mellanox", "2020"]
    }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "authenticity_score": 0.31372549026912727,
  "verdict": "mixed",
  "evidence": [
    {
      "url": "https://en.wikipedia.org/wiki/Nvidia_BlueField",
      "title": "Nvidia BlueField",
      "snippet": "Nvidia acquired Mellanox Technologies for US$6.9 billion in March 2019...",
      "stance": "refute",
      "confidence": 0.95
    }
  ],
  "graph": {
    "nodes": [
      {
        "id": "claim",
        "label": "NVIDIA acquired Mellanox in 2020.",
        "type": "claim"
      },
      {
        "id": "src_1",
        "label": "Nvidia BlueField",
        "type": "refute",
        "url": "https://en.wikipedia.org/wiki/Nvidia_BlueField",
        "confidence": 0.95
      }
    ],
    "edges": [
      {
        "source": "claim",
        "target": "src_1",
        "weight": 0.95,
        "stance": "refute"
      }
    ]
  },
  "explanation": "Weighted support=0.00, refute=0.95, neutral=1.60. Score=0.31 based on stance classification of retrieved sources."
}
\`\`\`

## Testing the Backend Integration

### 1. Backend Server

The backend is hosted at: `http://Check-mate-env.eba-kdf2pckq.us-east-2.elasticbeanstalk.com`

### 2. Test with curl

\`\`\`bash
# Test text ingestion
curl --location 'http://Check-mate-env.eba-kdf2pckq.us-east-2.elasticbeanstalk.com/ingest/text' \
--header 'Content-Type: application/json' \
--data '{
  "text": "NVIDIA acquired Mellanox in 2020."
}'

# Test verification
curl --location 'http://Check-mate-env.eba-kdf2pckq.us-east-2.elasticbeanstalk.com/verify' \
--header 'Content-Type: application/json' \
--data '{
  "raw_text": "NVIDIA acquired Mellanox in 2020.",
  "claims": [
    {
      "text": "NVIDIA acquired Mellanox in 2020.",
      "entities": ["NVIDIA", "Mellanox", "2020"]
    }
  ]
}'
\`\`\`

### 3. Check Browser Console

The UI includes debug logging (prefixed with `[v0]`) that shows:
- API base URL being used
- All API requests with parameters
- API responses
- Any errors

Open your browser's developer console (F12) to see these logs while using the app.

### 4. Common Issues

**CORS Errors**: Make sure your backend allows requests from your frontend domain. Add CORS headers:
\`\`\`
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
\`\`\`

**Connection Refused**: Verify your backend is running and accessible at the configured URL.

**API Base URL**: If you see an orange banner at the top, set the `NEXT_PUBLIC_API_BASE` environment variable in `.env.local`.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- D3.js (for graph visualization)

## Project Structure

\`\`\`
├── app/                  # Next.js app directory
│   ├── page.tsx         # Main application page
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles & theme
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── input-panel.tsx  # Input modes (text/PDF/image/audio)
│   ├── verification-panel.tsx  # Claims & verification
│   ├── evidence-panel.tsx      # Graph & evidence table
│   └── ...              # Other components
├── lib/                 # Utilities and API client
│   ├── api.ts          # API client functions
│   ├── types.ts        # TypeScript types
│   └── utils.ts        # Helper functions
└── public/             # Static assets
\`\`\`

## Security

- File uploads are limited to 10MB
- URLs are sanitized before use
- Files are not stored client-side beyond the session
- All API requests use proper error handling

## License

MIT
