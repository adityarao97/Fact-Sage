"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ApiBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE) {
      setShowBanner(true)
    }
  }, [])

  if (!showBanner) return null

  return (
    <Alert variant="destructive" className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-900">
        <strong>API Configuration:</strong> NEXT_PUBLIC_API_BASE environment variable is not set. Using default:
        http://fact-sage-env.eba-kdf2pckq.us-east-2.elasticbeanstalk.com
      </AlertDescription>
    </Alert>
  )
}
