import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Resolve location of PaddleOCR-VL-1.6_Online_Demo/examples folder
    const searchPaths = [
      path.join(process.cwd(), "PaddleOCR-VL-1.6_Online_Demo/examples"),
      path.join(process.cwd(), "../PaddleOCR-VL-1.6_Online_Demo/examples"),
      path.join(process.cwd(), "examples"),
    ];

    let examplesDir = "";
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        examplesDir = p;
        break;
      }
    }

    if (!examplesDir) {
      console.warn("Examples directory not found in paths:", searchPaths);
      return NextResponse.json({
        complex: [],
        targeted: [],
        spotting: [],
      });
    }

    const getFiles = (sub: string) => {
      const dirPath = path.join(examplesDir, sub);
      if (!fs.existsSync(dirPath)) return [];
      const files = fs.readdirSync(dirPath);
      const supported = [".png", ".jpg", ".jpeg", ".bmp", ".webp"];
      return files
        .filter((f) => supported.includes(path.extname(f).toLowerCase()))
        .map((f) => `/examples/${sub}/${f}`);
    };

    return NextResponse.json({
      complex: getFiles("complex"),
      targeted: getFiles("targeted"),
      spotting: getFiles("spotting"),
    });
  } catch (error) {
    console.error("Error reading examples:", error);
    return NextResponse.json({ error: "Failed to read examples" }, { status: 500 });
  }
}
