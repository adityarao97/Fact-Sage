"use client"

import type React from "react"

import { useState } from "react"
import { ImageIcon, Loader2, ScanText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractClaims } from "@/lib/claim-extractor"
import { validateFileSize, formatFileSize } from "@/lib/utils"
import type { IngestResponse } from "@/lib/types"
import { createWorker } from "tesseract.js"

interface ImageInputProps {
  onResult: (result: IngestResponse) => void
}

export function ImageInput({ onResult }: ImageInputProps) {
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const { toast } = useToast()

  const handleSubmit = async () => {
    setIsLoading(true)
    setProgress("Initializing OCR...")

    try {
      let extractedText = ""

      if (imageFile) {
        if (!validateFileSize(imageFile)) {
          throw new Error("File must be less than 10MB")
        }

        // Run OCR on the image
        setProgress("Running OCR on image...")
        const worker = await createWorker("eng")

        const { data } = await worker.recognize(imageFile)
        extractedText = (data.text || "").trim()

        await worker.terminate()

        if (!extractedText) {
          throw new Error("No text detected in the image")
        }
      } else if (imageUrl) {
        // For URL-based images, fetch and process
        setProgress("Fetching image from URL...")
        const response = await fetch(imageUrl)
        const blob = await response.blob()

        setProgress("Running OCR on image...")
        const worker = await createWorker("eng")
        const { data } = await worker.recognize(blob)
        extractedText = (data.text || "").trim()
        await worker.terminate()

        if (!extractedText) {
          throw new Error("No text detected in the image")
        }
      } else {
        throw new Error("Please provide an image file or URL")
      }

      // Extract claims locally using Transformers.js
      setProgress("Extracting claims from text...")
      const claims = await extractClaims(extractedText, (msg) => setProgress(msg))

      // Create the result object
      const result: IngestResponse = {
        raw_text: extractedText,
        claims: claims,
      }

      onResult(result)
      toast({
        title: "Success",
        description: `Extracted ${claims.length} claim(s) from image`,
      })
    } catch (error) {
      console.error("[v0] Image processing error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setProgress("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)
    setImageUrl("")

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setImageFile(file)
      setImageUrl("")

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop an image file",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
        />
        <Label htmlFor="image-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</div>
          </div>
        </Label>
      </div>

      {preview && (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-48 object-cover" />
          {imageFile && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs">
              {imageFile.name} - {formatFileSize(imageFile.size)}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or enter URL</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-url">Image URL</Label>
        <Input
          id="image-url"
          type="url"
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value)
            setImageFile(null)
            setPreview(null)
          }}
          disabled={isLoading}
        />
      </div>

      {progress && <div className="text-sm text-muted-foreground text-center py-2">{progress}</div>}

      <Button onClick={handleSubmit} disabled={isLoading || (!imageFile && !imageUrl)} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress || "Processing..."}
          </>
        ) : (
          <>
            <ScanText className="mr-2 h-4 w-4" />
            Extract Text & Claims
          </>
        )}
      </Button>
    </div>
  )
}
