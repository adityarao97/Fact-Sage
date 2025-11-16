"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ImageIcon } from "lucide-react"
import { TextInput } from "@/components/text-input"
import { ImageInput } from "@/components/image-input"
import type { IngestResponse } from "@/lib/types"

interface InputPanelProps {
  onResult: (result: IngestResponse) => void
}

export function InputPanel({ onResult }: InputPanelProps) {
  return (
    <Card className="card-gradient border-2 border-primary/10 shadow-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Input Source
        </CardTitle>
        <CardDescription className="text-sm">Extract claims from text or images</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-gradient-to-r from-purple-100 to-blue-100">
            <TabsTrigger
              value="text"
              className="gap-2 data-[state=active]:bg-white data-[state=active]:text-purple-600"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Image</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-6">
            <TextInput onResult={onResult} />
          </TabsContent>
          <TabsContent value="image" className="mt-6">
            <ImageInput onResult={onResult} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
