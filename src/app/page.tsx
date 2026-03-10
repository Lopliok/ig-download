"use client";

import { useState } from "react";

type Mode = "video" | "audio";
type Status = "idle" | "loading" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("video");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!url.trim()) return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Stahování selhalo");
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? (mode === "audio" ? "audio.mp3" : "video.mp4");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-900 to-orange-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Instagram Downloader
        </h1>
        <p className="text-white/60 text-center text-sm mb-8">
          Stáhni Reels jako video nebo zvuk
        </p>

        <div className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-pink-400 transition"
            onKeyDown={(e) => e.key === "Enter" && handleDownload()}
          />

          <div className="flex gap-3">
            <button
              onClick={() => setMode("video")}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${
                mode === "video"
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setMode("audio")}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${
                mode === "audio"
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Zvuk (MP3)
            </button>
          </div>

          <button
            onClick={handleDownload}
            disabled={status === "loading" || !url.trim()}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Stahuji...
              </span>
            ) : (
              "Stáhnout"
            )}
          </button>

          {status === "error" && (
            <p className="text-red-300 text-sm text-center bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        <p className="text-white/30 text-xs text-center mt-8">
          Funguje s Instagram Reels, postů a story
        </p>
      </div>
    </main>
  );
}
