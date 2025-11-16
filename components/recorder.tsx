"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { fileToBase64, validateFileSize } from "@/lib/utils"

interface RecorderProps {
  onAudioReady: (base64: string, filename: string) => void
  disabled?: boolean
}

export function Recorder({ onAudioReady, disabled }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1]
          onAudioReady(base64, `recording-${Date.now()}.webm`)
          setIsProcessing(false)
        }
        reader.readAsDataURL(blob)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: error instanceof Error ? error.message : "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validate file size
    if (!validateFileSize(file)) {
      toast({
        title: "File Too Large",
        description: "File must be less than 10MB",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const base64 = await fileToBase64(file)
      onAudioReady(base64, file.name)
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Could not process file",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isRecording ? (
          <Button onClick={startRecording} disabled={disabled || isProcessing} className="flex-1">
            <Mic className="mr-2 h-4 w-4" />
            Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="mr-2 h-4 w-4" />
            Stop Recording
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <Label htmlFor="audio-upload" className="sr-only">
            Upload audio file
          </Label>
          <Input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            disabled={disabled || isRecording || isProcessing}
            className="cursor-pointer"
          />
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing audio...
        </div>
      )}
    </div>
  )
}
