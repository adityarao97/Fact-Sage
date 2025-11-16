"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiBase } from "@/lib/api"

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
]

export function SettingsPopover() {
  const [apiBase, setApiBase] = useState("")
  const [defaultLanguage, setDefaultLanguage] = useState("en")

  useEffect(() => {
    setApiBase(getApiBase())
    const savedLang = localStorage.getItem("check-mate-default-lang")
    if (savedLang) {
      setDefaultLanguage(savedLang)
    }
  }, [])

  const handleLanguageChange = (value: string) => {
    setDefaultLanguage(value)
    localStorage.setItem("check-mate-default-lang", value)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Settings</h4>
            <p className="text-sm text-muted-foreground">Configure your check-mate preferences</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-base">API Base URL</Label>
            <Input id="api-base" value={apiBase} readOnly className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Set via NEXT_PUBLIC_API_BASE environment variable</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-language">Default Audio Language</Label>
            <Select value={defaultLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger id="default-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
