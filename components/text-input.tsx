"use client"

import type React from "react"

import { useState } from "react"
import Tooltip from "@mui/material/Tooltip"
import LinearProgress from "@mui/material/LinearProgress"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ingestDocument } from "@/lib/api"
import { extractClaims } from "@/lib/claim-extractor"
import { fileToBase64, validateFileSize, formatFileSize, sanitizeUrl } from "@/lib/utils"
import type { IngestResponse } from "@/lib/types"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// ------------------------
// ZOD SCHEMA + FORM TYPE
// ------------------------
const TextIngestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Please enter some text to analyze")
    .max(4000, "Text is too long, please shorten it."),
  pdfUrl: z.string().trim().optional().or(z.literal("")),
})

type TextIngestValues = z.infer<typeof TextIngestSchema>

// ------------------------
// COMPONENT
// ------------------------
interface TextInputProps {
  onResult: (result: IngestResponse) => void
}

export function TextInput({ onResult }: TextInputProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const { toast } = useToast()

  // ------------------------
  // INIT REACT-HOOK-FORM
  // ------------------------
  const form = useForm<TextIngestValues>({
    resolver: zodResolver(TextIngestSchema),
    defaultValues: {
      text: "",
      pdfUrl: "",
    },
    mode: "onChange",
  })

  const watchedText = form.watch("text")

  const handleTextSubmit = async (values: TextIngestValues) => {
    const text = values.text.trim()

    setIsLoading(true)
    setProgress("Initializing AI model...")

    toast({
      title: "Loading on-device model",
      description: "This may take a moment the first time. Everything runs in your browser.",
    })

    try {
      // Extract claims locally using Transformers.js
      const claims = await extractClaims(text, (msg) => setProgress(msg))

      // Create the result object
      const result: IngestResponse = {
        raw_text: text,
        claims,
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
    const pdfUrl = form.getValues("pdfUrl")?.trim()
    setIsLoading(true)
    try {
      let result: IngestResponse

      if (pdfFile) {
        if (!validateFileSize(pdfFile))
          throw new Error("File must be less than 10MB")
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
    form.setValue("pdfUrl", "")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      form.setValue("pdfUrl", "")
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop a PDF file",
        variant: "destructive",
      })
    }
  }

  // ------------------------
  // JSX
  // ------------------------
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleTextSubmit)}
        className="space-y-6"
      >
        {/* TEXT INPUT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <FormLabel htmlFor="text-input">Enter Text</FormLabel>

            <Tooltip title="Claim extraction runs in your browser using an on-device model. No text is sent to the server for this step.">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                On-device AI
              </button>
            </Tooltip>
          </div>

          {/* RHF FIELD: TEXTAREA */}
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    id="text-input"
                    placeholder="Enter text to extract claims from..."
                    rows={6}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>

                {progress && (
                  <div className="text-sm text-muted-foreground">
                    {progress}
                  </div>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            disabled={isLoading || !watchedText.trim()}
            className="w-full"
          >
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

          {/* LOADING PROGRESS BAR */}
          {isLoading && (
            <div className="mt-2">
              <LinearProgress />
            </div>
          )}
        </div>

      </form>
    </Form>
  )
}
