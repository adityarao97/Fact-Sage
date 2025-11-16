"use client"

import type React from "react"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ingestDocument } from "@/lib/api"
import { extractClaims } from "@/lib/claim-extractor"
import { fileToBase64, validateFileSize, formatFileSize, sanitizeUrl } from "@/lib/utils"
import type { IngestResponse } from "@/lib/types"

interface TextInputProps {
  onResult: (result: IngestResponse) => void
}

export function TextInput({ onResult }: TextInputProps) {
  const [text, setText] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const { toast } = useToast()

  const handleTextSubmit = async () => {
    if (!text.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter some text to analyze",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setProgress("Initializing AI model...")

    try {
      // Extract claims locally using Transformers.js
      const claims = await extractClaims(text, (msg) => setProgress(msg))

      // Create the result object
      const result: IngestResponse = {
        raw_text: text,
        claims: claims,
      }

      onResult(result)
      toast({
        title: "Success",
        description: `Extracted ${claims.length} claim(s) from text`,
      })
    } catch (error) {
      console.error("[v0] Claim extraction error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract claims",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setProgress("")
    }
  }

  const handlePdfSubmit = async () => {
    setIsLoading(true)
    try {
      let result: IngestResponse

      if (pdfFile) {
        // Validate file
        if (!validateFileSize(pdfFile)) {
          throw new Error("File must be less than 10MB")
        }
        const base64 = await fileToBase64(pdfFile)
        result = await ingestDocument({ pdf_b64: base64 })
      } else if (pdfUrl) {
        const sanitized = sanitizeUrl(pdfUrl)
        result = await ingestDocument({ pdf_url: sanitized })
      } else {
        throw new Error("Please provide a PDF file or URL")
      }

      onResult(result)
      toast({
        title: "Success",
        description: `Extracted ${result.claims.length} claim(s) from PDF`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    setPdfFile(file)
    setPdfUrl("") // Clear URL if file is selected
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      setPdfUrl("")
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop a PDF file",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div className="space-y-2">
        <Label htmlFor="text-input">Enter Text</Label>
        <Textarea
          id="text-input"
          placeholder="Enter text to extract claims from..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          disabled={isLoading}
        />
        {progress && <div className="text-sm text-muted-foreground">{progress}</div>}
        <Button onClick={handleTextSubmit} disabled={isLoading || !text.trim()} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {progress || "Processing..."}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Extract Claims
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or upload PDF</span>
        </div>
      </div>

      {/* PDF Upload */}
      <div className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
          />
          <Label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </div>
              <div className="text-xs text-muted-foreground">PDF files up to 10MB</div>
            </div>
          </Label>
        </div>

        {pdfFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
            <FileText className="h-4 w-4" />
            <span className="flex-1 truncate">{pdfFile.name}</span>
            <span className="text-muted-foreground">{formatFileSize(pdfFile.size)}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pdf-url">Or enter PDF URL</Label>
          <div className="flex gap-2">
            <Input
              id="pdf-url"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={pdfUrl}
              onChange={(e) => {
                setPdfUrl(e.target.value)
                setPdfFile(null) // Clear file if URL is entered
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handlePdfSubmit}
          disabled={isLoading || (!pdfFile && !pdfUrl)}
          className="w-full"
          variant="secondary"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing PDF...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Extract from PDF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
