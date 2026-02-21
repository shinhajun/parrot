"use client";

import { useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RoomView from "@/components/RoomView";
import LanguageSelector from "@/components/LanguageSelector";
import type { LanguageCode } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params.roomId;

  const langParam = (searchParams.get("lang") ?? "en") as LanguageCode;
  const validInitialLang: LanguageCode = langParam in LANGUAGES ? langParam : "en";

  const [selectedLang, setSelectedLang] = useState<LanguageCode>(validInitialLang);
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const handleJoin = () => {
    if (requested.current) return;
    requested.current = true;
    setJoined(true);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setLocalStream)
      .catch(() => setError("Camera and microphone access is required."));
  };

  // Pre-join language selection screen
  if (!joined) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 bg-slate-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-white">BabelRoom</h1>
            <p className="text-slate-400 text-sm">
              Room:{" "}
              <span className="font-mono text-slate-200">{roomId}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              Select your language
            </label>
            <LanguageSelector value={selectedLang} onChange={setSelectedLang} />
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            Join Room
          </button>
        </div>
      </main>
    );
  }

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

  return <RoomView roomId={roomId} lang={selectedLang} localStream={localStream} />;
}
