// "use client";

// import type React from "react";

// import { useState } from "react";
// import { ImageIcon, Loader2, ScanText } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/hooks/use-toast";
// import { extractClaims } from "@/lib/claim-extractor";
// import { validateFileSize, formatFileSize } from "@/lib/utils";
// import type { IngestResponse } from "@/lib/types";
// import { createWorker } from "tesseract.js";

// interface ImageInputProps {
//   onResult: (result: IngestResponse) => void;
// }

// export function ImageInput({ onResult }: ImageInputProps) {
//   const [imageUrl, setImageUrl] = useState("");
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [preview, setPreview] = useState<string | null>(null);
//   const [imageBase64, setImageBase64] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [progress, setProgress] = useState<string>("");
//   const { toast } = useToast();

//   // const handleSubmit = async () => {
//   //   setIsLoading(true);
//   //   setProgress("Initializing OCR...");

//   //   try {
//   //     let extractedText = "";

//   //     if (imageFile) {
//   //       if (!validateFileSize(imageFile)) {
//   //         throw new Error("File must be less than 10MB");
//   //       }

//   //       // Run OCR on the image
//   //       setProgress("Running OCR on image...");
//   //       const worker = await createWorker("eng");

//   //       const { data } = await worker.recognize(imageFile);
//   //       extractedText = (data.text || "").trim();

//   //       await worker.terminate();

//   //       if (!extractedText) {
//   //         throw new Error("No text detected in the image");
//   //       }
//   //     } else if (imageUrl) {
//   //       // For URL-based images, fetch and process
//   //       setProgress("Fetching image from URL...");
//   //       const response = await fetch(imageUrl);
//   //       const blob = await response.blob();

//   //       setProgress("Running OCR on image...");
//   //       const worker = await createWorker("eng");
//   //       const { data } = await worker.recognize(blob);
//   //       extractedText = (data.text || "").trim();
//   //       await worker.terminate();

//   //       if (!extractedText) {
//   //         throw new Error("No text detected in the image");
//   //       }
//   //     } else {
//   //       throw new Error("Please provide an image file or URL");
//   //     }

//   //     // Extract claims locally using Transformers.js
//   //     setProgress("Extracting claims from text...");
//   //     const claims = await extractClaims(extractedText, (msg) =>
//   //       setProgress(msg)
//   //     );

//   //     // Create the result object
//   //     const result: IngestResponse = {
//   //       raw_text: extractedText,
//   //       claims: claims,
//   //     };

//   //     onResult(result);
//   //     toast({
//   //       title: "Success",
//   //       description: `Extracted ${claims.length} claim(s) from image`,
//   //     });
//   //   } catch (error) {
//   //     console.error("[v0] Image processing error:", error);
//   //     toast({
//   //       title: "Error",
//   //       description:
//   //         error instanceof Error ? error.message : "Failed to process image",
//   //       variant: "destructive",
//   //     });
//   //   } finally {
//   //     setIsLoading(false);
//   //     setProgress("");
//   //   }
//   // };

//   // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//   //   const file = e.target.files?.[0];
//   //   if (!file) return;

//   //   if (!file.type.startsWith("image/")) {
//   //     toast({
//   //       title: "Invalid File",
//   //       description: "Please upload an image file (PNG, JPG, etc.)",
//   //       variant: "destructive",
//   //     });
//   //     return;
//   //   }

//   //   setImageFile(file);
//   //   setImageUrl("");

//   //   // Create preview
//   //   const reader = new FileReader();
//   //   reader.onloadend = () => {
//   //     setPreview(reader.result as string);
//   //   };
//   //   reader.readAsDataURL(file);
//   // };

//   const handleSubmit = async () => {
//     setIsLoading(true);
//     setProgress("Initializing OCR...");

//     try {
//       let extractedText = "";

//       if (imageFile) {
//         if (!validateFileSize(imageFile)) {
//           throw new Error("File must be less than 10MB");
//         }

//         setProgress("Running OCR on image...");
//         const worker = await createWorker("eng");
//         const { data } = await worker.recognize(imageFile);
//         extractedText = (data.text || "").trim();
//         await worker.terminate();

//         if (!extractedText) {
//           throw new Error("No text detected in the image");
//         }
//       } else if (imageUrl) {
//         setProgress("Fetching image from URL...");
//         const response = await fetch(imageUrl);
//         const blob = await response.blob();

//         setProgress("Running OCR on image...");
//         const worker = await createWorker("eng");
//         const { data } = await worker.recognize(blob);
//         extractedText = (data.text || "").trim();
//         await worker.terminate();

//         if (!extractedText) {
//           throw new Error("No text detected in the image");
//         }
//       } else {
//         throw new Error("Please provide an image file or URL");
//       }

//       // Extract claims locally using Transformers.js
//       setProgress("Extracting claims from text...");
//       const claims = await extractClaims(extractedText, (msg) =>
//         setProgress(msg)
//       );

//       // 🔍 NEW: call image verification API
//       setProgress("Checking image authenticity...");
//       let image_verification: IngestResponse["image_verification"] | undefined =
//         undefined;

//       try {
//         const verifyRes = await fetch("/api/image-verify", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             imageUrl: imageUrl || undefined,
//             imageBase64: !imageUrl ? imageBase64 : undefined,
//           }),
//         });

//         if (verifyRes.ok) {
//           image_verification = await verifyRes.json();
//         } else {
//           console.warn(
//             "[ImageInput] image-verify failed:",
//             await verifyRes.text()
//           );
//         }
//       } catch (err) {
//         console.warn("[ImageInput] image-verify error:", err);
//       }

//       // Create the result object
//       const result: IngestResponse = {
//         raw_text: extractedText,
//         claims,
//         image_verification,
//       };

//       onResult(result);
//       toast({
//         title: "Success",
//         description: `Extracted ${claims.length} claim(s) from image`,
//       });
//     } catch (error) {
//       console.error("[v0] Image processing error:", error);
//       toast({
//         title: "Error",
//         description:
//           error instanceof Error ? error.message : "Failed to process image",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//       setProgress("");
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     if (!file.type.startsWith("image/")) {
//       toast({
//         title: "Invalid File",
//         description: "Please upload an image file (PNG, JPG, etc.)",
//         variant: "destructive",
//       });
//       return;
//     }

//     setImageFile(file);
//     setImageUrl("");
//     setPreview(null);
//     setImageBase64(null);

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const dataUrl = reader.result as string;
//       setPreview(dataUrl);
//       setImageBase64(dataUrl); // <--- important
//     };
//     reader.readAsDataURL(file);
//   };

//   // const handleDrop = (e: React.DragEvent) => {
//   //   e.preventDefault();
//   //   const file = e.dataTransfer.files[0];
//   //   if (file && file.type.startsWith("image/")) {
//   //     setImageFile(file);
//   //     setImageUrl("");

//   //     const reader = new FileReader();
//   //     reader.onloadend = () => {
//   //       setPreview(reader.result as string);
//   //     };
//   //     reader.readAsDataURL(file);
//   //   } else {
//   //     toast({
//   //       title: "Invalid File",
//   //       description: "Please drop an image file",
//   //       variant: "destructive",
//   //     });
//   //   }
//   // };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     const file = e.dataTransfer.files[0];
//     if (file && file.type.startsWith("image/")) {
//       setImageFile(file);
//       setImageUrl("");
//       setPreview(null);
//       setImageBase64(null);

//       const reader = new FileReader();
//       reader.onloadend = () => {
//         const dataUrl = reader.result as string;
//         setPreview(dataUrl);
//         setImageBase64(dataUrl);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       toast({
//         title: "Invalid File",
//         description: "Please drop an image file",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div
//         className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
//         onDrop={handleDrop}
//         onDragOver={(e) => e.preventDefault()}
//       >
//         <Input
//           id="image-upload"
//           type="file"
//           accept="image/*"
//           onChange={handleFileChange}
//           disabled={isLoading}
//           className="hidden"
//         />
//         <Label htmlFor="image-upload" className="cursor-pointer">
//           <div className="flex flex-col items-center gap-2">
//             <ImageIcon className="h-8 w-8 text-muted-foreground" />
//             <div className="text-sm">
//               <span className="font-medium text-primary">Click to upload</span>{" "}
//               or drag and drop
//             </div>
//             <div className="text-xs text-muted-foreground">
//               PNG, JPG, GIF up to 10MB
//             </div>
//           </div>
//         </Label>
//       </div>

//       {preview && (
//         <div className="relative rounded-lg overflow-hidden border">
//           <img
//             src={preview || "/placeholder.svg"}
//             alt="Preview"
//             className="w-full h-48 object-cover"
//           />
//           {imageFile && (
//             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs">
//               {imageFile.name} - {formatFileSize(imageFile.size)}
//             </div>
//           )}
//         </div>
//       )}

//       <div className="relative">
//         <div className="absolute inset-0 flex items-center">
//           <span className="w-full border-t" />
//         </div>
//         <div className="relative flex justify-center text-xs uppercase">
//           <span className="bg-background px-2 text-muted-foreground">
//             Or enter URL
//           </span>
//         </div>
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="image-url">Image URL</Label>
//         <Input
//           id="image-url"
//           type="url"
//           placeholder="https://example.com/image.jpg"
//           value={imageUrl}
//           onChange={(e) => {
//             setImageUrl(e.target.value);
//             setImageFile(null);
//             setPreview(null);
//             setImageBase64(null);
//           }}
//           disabled={isLoading}
//         />
//       </div>

//       {progress && (
//         <div className="text-sm text-muted-foreground text-center py-2">
//           {progress}
//         </div>
//       )}

//       <Button
//         onClick={handleSubmit}
//         disabled={isLoading || (!imageFile && !imageUrl)}
//         className="w-full"
//       >
//         {isLoading ? (
//           <>
//             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//             {progress || "Processing..."}
//           </>
//         ) : (
//           <>
//             <ScanText className="mr-2 h-4 w-4" />
//             Extract Text & Claims
//           </>
//         )}
//       </Button>
//     </div>
//   );
// }

"use client";

import type React from "react";
import { useState } from "react";
import { ImageIcon, Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractClaims } from "@/lib/claim-extractor";
import { validateFileSize, formatFileSize } from "@/lib/utils";
import type { IngestResponse, Claim } from "@/lib/types";
import { createWorker } from "tesseract.js";

interface ImageInputProps {
  onResult: (result: IngestResponse) => void;
}

// 🔧 Helper: convert any File/Blob to a PNG Blob via canvas
async function fileOrBlobToPngBlob(input: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported in this browser"));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert image to PNG"));
            } else {
              resolve(blob);
            }
          },
          "image/png",
          1.0
        );
      };
      img.onerror = () =>
        reject(new Error("Failed to load image for conversion"));
      img.src = reader.result as string;
    };

    reader.readAsDataURL(input);
  });
}

export function ImageInput({ onResult }: ImageInputProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // data URL for preview
  const [imageBase64, setImageBase64] = useState<string | null>(null); // data URL for server-side checks
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    setProgress("Initializing OCR...");

    try {
      let extractedText = "";

      // Helper: run OCR on any image file/blob (always convert to PNG first)
      const runOcrOnAnyImage = async (input: File | Blob) => {
        console.log("[ImageInput] Original image:", {
          size: "size" in input ? input.size : undefined,
          type: "type" in input ? (input as File).type : "blob",
        });

        setProgress("Converting image to PNG...");
        const pngBlob = await fileOrBlobToPngBlob(input);

        console.log("[ImageInput] PNG blob:", {
          size: pngBlob.size,
          type: pngBlob.type,
        });

        setProgress("Running OCR on image...");
        const worker = await createWorker("eng");

        try {
          const { data } = await worker.recognize(pngBlob);
          return (data.text || "").trim();
        } finally {
          await worker.terminate();
        }
      };

      // 1️⃣ Get image & run OCR (if possible)
      if (imageFile) {
        if (!validateFileSize(imageFile)) {
          throw new Error("File must be less than 10MB");
        }

        extractedText = await runOcrOnAnyImage(imageFile);
      } else if (imageUrl) {
        setProgress("Fetching image from URL...");
        let response: Response;
        try {
          response = await fetch(imageUrl);
        } catch (e) {
          throw new Error(
            "Failed to fetch image from URL. It may not allow cross-origin requests (CORS) or the URL is invalid."
          );
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image from URL (status ${response.status}). Make sure it's a direct image URL.`
          );
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error(
            `URL does not point to an image (Content-Type: ${contentType}). Please use a direct image URL ending in .jpg or .png.`
          );
        }

        const blob = await response.blob();
        extractedText = await runOcrOnAnyImage(blob);
      } else {
        throw new Error("Please provide an image file or URL");
      }

      // 2️⃣ Extract claims IF there is text
      const hasText = extractedText.trim().length > 0;
      let claims: Claim[] = [];

      if (hasText) {
        setProgress("Extracting claims from text...");
        claims = await extractClaims(extractedText, (msg) => setProgress(msg));
      } else {
        console.log(
          "[ImageInput] No text detected in the image; skipping claim extraction."
        );
      }

      // 3️⃣ Always try image authenticity verification (even if no text)
      setProgress("Checking image authenticity...");
      let image_verification: IngestResponse["image_verification"] | undefined;

      try {
        // Prefer URL if provided; otherwise send base64 (from preview)
        const res = await fetch("/api/ingest/image-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageUrl || undefined,
            imageBase64: !imageUrl ? imageBase64 : undefined,
          }),
        });

        if (res.ok) {
          image_verification = await res.json();
          console.log("[ImageInput] image_verification:", image_verification);
        } else {
          console.warn(
            "[ImageInput] /api/image-verify failed:",
            await res.text()
          );
        }
      } catch (err) {
        console.warn("[ImageInput] image-verify error:", err);
      }

      // 4️⃣ Build result
      const result: IngestResponse = {
        raw_text: extractedText,
        claims,
        image_verification,
      };

      onResult(result);

      toast({
        title: hasText ? "Success" : "No text found",
        description: hasText
          ? `Extracted ${claims.length} claim(s) from image`
          : "No text detected in the image, but image authenticity was still checked.",
      });
    } catch (error) {
      console.error("[v0] Image processing error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    setImageUrl("");
    setPreview(null);
    setImageBase64(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setImageBase64(dataUrl); // store for /api/image-verify
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImageUrl("");
      setPreview(null);
      setImageBase64(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setImageBase64(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop an image file",
        variant: "destructive",
      });
    }
  };

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
              <span className="font-medium text-primary">Click to upload</span>{" "}
              or drag and drop
            </div>
            <div className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to 10MB
            </div>
          </div>
        </Label>
      </div>

      {preview && (
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={preview || "/placeholder.svg"}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
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
          <span className="bg-background px-2 text-muted-foreground">
            Or enter URL
          </span>
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
            setImageUrl(e.target.value);
            setImageFile(null);
            setPreview(null);
            setImageBase64(null);
          }}
          disabled={isLoading}
        />
      </div>

      {progress && (
        <div className="text-sm text-muted-foreground text-center py-2">
          {progress}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading || (!imageFile && !imageUrl)}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress || "Processing..."}
          </>
        ) : (
          <>
            <ScanText className="mr-2 h-4 w-4" />
            Extract Text, Claims & Verify Image
          </>
        )}
      </Button>
    </div>
  );
}
