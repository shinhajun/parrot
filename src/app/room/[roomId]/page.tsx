"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RoomView from "@/components/RoomView";
import type { LanguageCode } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params.roomId;
  const lang = (searchParams.get("lang") ?? "ko") as LanguageCode;
  const validLang = lang in LANGUAGES ? lang : ("ko" as LanguageCode);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setLocalStream)
      .catch(() => setError("Camera and microphone access is required."));
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <p className="text-slate-400">
            Please allow camera and microphone access and reload the page.
          </p>
        </div>
      </main>
    );
  }

  if (!localStream) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400">Requesting camera access...</p>
        </div>
      </main>
    );
  }

  return <RoomView roomId={roomId} lang={validLang} localStream={localStream} />;
}
