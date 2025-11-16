import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export function validateFileSize(file: File, maxSizeMB = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxBytes
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol")
    }
    return parsed.toString()
  } catch {
    throw new Error("Invalid URL")
  }
}

export function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
