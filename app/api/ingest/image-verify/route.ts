import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // needed for Buffer / FormData

interface ImageVerificationResult {
  provider: "sightengine" | "local-model" | "heuristics";
  is_tampered: boolean | null;
  tampering_score: number | null;
  reasons: string[];
  raw?: any;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "imageUrl or imageBase64 is required" },
        { status: 400 }
      );
    }

    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiUser || !apiSecret) {
      const result: ImageVerificationResult = {
        provider: "heuristics",
        is_tampered: null,
        tampering_score: null,
        reasons: [
          "Image verification not configured: SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET is missing.",
        ],
      };
      return NextResponse.json(result, { status: 200 });
    }

    let res: Response;

    if (imageUrl) {
      console.log("[image-verify] Using imageUrl:", imageUrl);

      const url = new URL("https://api.sightengine.com/1.0/check.json");
      url.searchParams.set("models", "genai");
      url.searchParams.set("api_user", apiUser);
      url.searchParams.set("api_secret", apiSecret);
      url.searchParams.set("url", imageUrl);

      res = await fetch(url.toString(), { method: "GET" });
    } else {
      if (!imageBase64) {
        throw new Error("imageBase64 is empty");
      }

      console.log(
        "[image-verify] Received imageBase64 length:",
        imageBase64.length
      );

      // imageBase64 can be a data URL or raw base64
      const base64Data = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const buffer = Buffer.from(base64Data, "base64");
      console.log("[image-verify] Decoded buffer size:", buffer.length);

      if (!buffer.length) {
        throw new Error("Empty image buffer after base64 decode");
      }

      // Create a Blob for FormData; type doesn't matter much, but JPEG is safe
      const blob = new Blob([buffer], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("media", blob, "image.jpg");
      formData.append("models", "genai");
      formData.append("api_user", apiUser);
      formData.append("api_secret", apiSecret);

      res = await fetch("https://api.sightengine.com/1.0/check.json", {
        method: "POST",
        body: formData,
      });
    }

    if (!res.ok) {
      const text = await res.text();
      console.warn(
        "[image-verify] Sightengine non-OK response:",
        res.status,
        text
      );

      const result: ImageVerificationResult = {
        provider: "heuristics",
        is_tampered: null,
        tampering_score: null,
        reasons: [`Sightengine API error: ${res.status} ${text.slice(0, 400)}`],
      };
      return NextResponse.json(result, { status: 200 }); // keep UI alive
    }

    const data: any = await res.json();
    console.log("[image-verify] Sightengine response:", data);

    if (
      data.status !== "success" ||
      !data.type ||
      typeof data.type.ai_generated !== "number"
    ) {
      const result: ImageVerificationResult = {
        provider: "heuristics",
        is_tampered: null,
        tampering_score: null,
        reasons: [
          "Unexpected response from Sightengine; could not read ai_generated score.",
        ],
        raw: data,
      };
      return NextResponse.json(result, { status: 200 });
    }

    const score = data.type.ai_generated as number; // 0–1

    let isTampered: boolean | null = null;
    const reasons: string[] = [];

    if (score >= 0.85) {
      isTampered = true;
      reasons.push(
        "Model is highly confident this image is AI-generated (ai_generated ≥ 0.85)."
      );
    } else if (score <= 0.15) {
      isTampered = false;
      reasons.push(
        "Model suggests this image is more likely human-made or traditionally edited than AI-generated (ai_generated ≤ 0.15)."
      );
    } else {
      isTampered = null;
      reasons.push(
        "Model is uncertain whether this image is AI-generated (ai_generated between 0.15 and 0.85)."
      );
    }

    const result: ImageVerificationResult = {
      provider: "sightengine",
      is_tampered: isTampered,
      tampering_score: score,
      reasons,
      raw: data,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[image-verify] Error:", err);

    const result: ImageVerificationResult = {
      provider: "heuristics",
      is_tampered: null,
      tampering_score: null,
      reasons: [
        `Image verification failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      ],
    };
    return NextResponse.json(result, { status: 200 });
  }
}
