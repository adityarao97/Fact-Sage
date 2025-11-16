"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadJson } from "@/lib/utils"

interface JsonDownloadProps {
  data: unknown
  filename: string
  label?: string
}

export function JsonDownload({ data, filename, label = "Export JSON" }: JsonDownloadProps) {
  const handleDownload = () => {
    downloadJson(data, filename)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
