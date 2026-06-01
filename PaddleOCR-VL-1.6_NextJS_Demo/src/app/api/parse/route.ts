import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL || "http://localhost:8000/layout-parsing";
const TOKEN = process.env.TOKEN;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      file, // base64 representation from client
      examplePath, // e.g., "/examples/complex/01.jpg"
      useLayoutDetection,
      promptLabel,
      useChartRecognition,
      useDocUnwarping,
      useDocOrientationClassify,
    } = body;

    let b64Image = "";

    // Resolve image data
    if (file) {
      b64Image = file;
    } else if (examplePath) {
      // Resolve path on disk
      const searchPaths = [
        path.join(process.cwd(), "PaddleOCR-VL-1.6_Online_Demo"),
        path.join(process.cwd(), "../PaddleOCR-VL-1.6_Online_Demo"),
        process.cwd(),
      ];

      let targetPath = "";
      // Strip leading "/examples" or "examples"
      const relativePath = examplePath.startsWith("/")
        ? examplePath.slice(1)
        : examplePath;

      for (const p of searchPaths) {
        const fullPath = path.join(p, relativePath);
        if (fs.existsSync(fullPath)) {
          targetPath = fullPath;
          break;
        }
      }

      if (!targetPath) {
        return NextResponse.json(
          { error: `Example file not found: ${examplePath}` },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(targetPath);
      b64Image = fileBuffer.toString("base64");
    } else {
      return NextResponse.json(
        { error: "No image source provided (file or examplePath)" },
        { status: 400 }
      );
    }

    // Build payload matching backend pipeline expectations
    const payload: Record<string, any> = {
      file: b64Image,
      matchHistoryJob: false,
      useLayoutDetection: !!useLayoutDetection,
      fileType: 1,
      useDocUnwarping: !!useDocUnwarping,
      useDocOrientationClassify: !!useDocOrientationClassify,
    };

    if (!useLayoutDetection) {
      if (!promptLabel) {
        return NextResponse.json(
          { error: "promptLabel is required for element-level recognition" },
          { status: 400 }
        );
      }
      
      const cleanLabel = promptLabel.trim().toLowerCase();
      let mappedLabel = cleanLabel;
      
      if (cleanLabel.includes("text") || cleanLabel === "ocr") {
        mappedLabel = "ocr";
      } else if (cleanLabel.includes("formula")) {
        mappedLabel = "formula";
      } else if (cleanLabel.includes("table")) {
        mappedLabel = "table";
      } else if (cleanLabel.includes("chart")) {
        mappedLabel = "chart";
      } else if (cleanLabel.includes("seal")) {
        mappedLabel = "seal";
      }
      
      payload.promptLabel = mappedLabel;
    }

    if (useLayoutDetection && useChartRecognition) {
      payload.useChartRecognition = true;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Client-Platform": "nextjs-demo",
    };

    if (TOKEN) {
      headers["Authorization"] = `bearer ${TOKEN}`;
    }

    console.log(`Forwarding layout-parsing request to API: ${API_URL}`);
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in parse handler:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process parsing request" },
      { status: 500 }
    );
  }
}
