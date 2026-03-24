"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://api.almostcrackd.ai";
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

type Caption = {
  id?: string;
  content?: string;
  caption_text?: string;
  text?: string;
  [key: string]: unknown;
};

type Step = "idle" | "uploading" | "registering" | "generating" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  uploading: "Uploading image...",
  registering: "Processing...",
  generating: "Generating captions with this flavor...",
  done: "Done",
  error: "Failed",
};

export default function FlavorTest({
  flavorId,
  flavorSlug,
}: {
  flavorId: number;
  flavorSlug: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getToken = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setAccessToken(data.session?.access_token ?? null);
    };
    getToken();
  }, []);

  async function handleFile(file: File) {
    if (!accessToken) {
      setError("You must be signed in.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Use JPEG, PNG, WebP, GIF, or HEIC.");
      return;
    }

    setError(null);
    setCaptions([]);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      setStep("uploading");
      const presignedRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!presignedRes.ok) throw new Error(`Upload URL failed: ${await presignedRes.text()}`);
      const { presignedUrl, cdnUrl } = await presignedRes.json();

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image.");

      setStep("registering");
      const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      });
      if (!registerRes.ok) throw new Error(`Register failed: ${await registerRes.text()}`);
      const { imageId } = await registerRes.json();

      setStep("generating");
      const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId, humorFlavorId: flavorId }),
      });
      if (!captionRes.ok) throw new Error(`Caption generation failed: ${await captionRes.text()}`);

      const captionData = await captionRes.json();
      const captionList = Array.isArray(captionData)
        ? captionData
        : captionData.captions ?? [captionData];
      setCaptions(captionList);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStep("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function reset() {
    setStep("idle");
    setError(null);
    setCaptions([]);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isProcessing = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        Test: {flavorSlug}
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Upload an image to generate captions using this humor flavor.
      </p>

      <div className="max-w-2xl">
        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
          } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain" />
          ) : (
            <div className="py-10">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Drop an image here or click to select
              </p>
              <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                JPEG, PNG, WebP, GIF, or HEIC
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        {step !== "idle" && (
          <div className="mt-4 flex items-center gap-3">
            {isProcessing && (
              <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            )}
            {step === "done" && <span className="text-green-600 dark:text-green-400 text-lg">&#10003;</span>}
            {step === "error" && <span className="text-red-600 dark:text-red-400 text-lg">&#10007;</span>}
            <span className={`text-sm font-medium ${
              step === "done" ? "text-green-600 dark:text-green-400" :
              step === "error" ? "text-red-600 dark:text-red-400" :
              "text-neutral-600 dark:text-neutral-300"
            }`}>
              {STEP_LABELS[step]}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Captions */}
        {captions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Generated Captions
            </h3>
            <ul className="space-y-2">
              {captions.map((c, i) => {
                const text = String(c.content ?? c.caption_text ?? c.text ?? JSON.stringify(c));
                return (
                  <li
                    key={c.id ?? i}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Reset */}
        {(step === "done" || step === "error") && (
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          >
            Upload another image
          </button>
        )}
      </div>
    </div>
  );
}
