import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const YT_DLP_BIN = process.platform === "win32"
  ? join(process.cwd(), "yt-dlp.exe")
  : "yt-dlp";

export const maxDuration = 60;

function isValidInstagramUrl(url: string): boolean {

  console.log("Validating URL:", url);
  try {
    const parsed = new URL(url);

    console.log("Parsed URL:", parsed);
    return (
      (parsed.hostname === "www.instagram.com" || parsed.hostname === "instagram.com") &&
      /\/(reels|p|tv|stories)\//.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function runYtDlp(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500)));
    });
  });
}

export async function POST(req: NextRequest) {
  let body: { url?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
  }

  const { url, mode } = body;

  if (!url || !isValidInstagramUrl(url)) {
    return NextResponse.json({ error: "Neplatná Instagram URL" }, { status: 400 });
  }

  const isAudio = mode === "audio";
  const tmpDir = mkdtempSync(join(tmpdir(), "insta-dl-"));

  try {
    const outputTemplate = join(tmpDir, "%(title).50B.%(ext)s");

    const args = isAudio
      ? [
          "-x",
          "--audio-format", "mp3",
          "--audio-quality", "0",
          "-o", outputTemplate,
          "--no-playlist",
          url,
        ]
      : [
          "-f", "bv*+ba/b",
          "--merge-output-format", "mp4",
          "-o", outputTemplate,
          "--no-playlist",
          url,
        ];

    await runYtDlp(args);

    const files = readdirSync(tmpDir);
    if (files.length === 0) throw new Error("Soubor nebyl stažen");

    const filePath = join(tmpDir, files[0]);
    const fileBuffer = readFileSync(filePath);
    const contentType = isAudio ? "audio/mpeg" : "video/mp4";
    const safeFilename = files[0].replace(/[^\w\-.]/g, "_");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.log("Error during download:", err);
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    const userMessage = message.includes("Private")
      ? "Tento příspěvek je soukromý"
      : message.includes("not found") || message.includes("404")
      ? "Příspěvek nebyl nalezen"
      : "Stahování selhalo. Zkontroluj URL a zkus to znovu.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
