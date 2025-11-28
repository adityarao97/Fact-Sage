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
      // Send URL directly to Sightengine
      const url = new URL("https://api.sightengine.com/1.0/check.json");
      url.searchParams.set("models", "genai");
      url.searchParams.set("api_user", apiUser);
      url.searchParams.set("api_secret", apiSecret);
      url.searchParams.set("url", imageUrl);

      res = await fetch(url.toString(), { method: "GET" });
    } else {
      // imageBase64 path (data URL or raw base64)
      const base64Data = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer]);

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
      const result: ImageVerificationResult = {
        provider: "heuristics",
        is_tampered: null,
        tampering_score: null,
        reasons: [`Sightengine API error: ${res.status} ${text.slice(0, 200)}`],
      };
      return NextResponse.json(result, { status: 200 }); // don’t break UI
    }

    const data: any = await res.json();

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
    const isTampered = score > 0.7;

    const reasons: string[] = [];
    if (score > 0.9) {
      reasons.push(
        "Model is highly confident this image is AI-generated (ai_generated > 0.9)."
      );
    } else if (score > 0.7) {
      reasons.push(
        "Model indicates this image is likely AI-generated (ai_generated > 0.7)."
      );
    } else if (score < 0.3) {
      reasons.push(
        "Model indicates this image is likely not AI-generated (ai_generated < 0.3)."
      );
    } else {
      reasons.push(
        "Model is uncertain whether this image is AI-generated (ai_generated between 0.3 and 0.7)."
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
