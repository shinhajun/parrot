"use client";

import { useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RoomView from "@/components/RoomView";
import VoiceCloningSetup from "@/components/VoiceCloningSetup";
import type { LanguageCode } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params.roomId;

  const langParam = (searchParams.get("lang") ?? "en") as LanguageCode;
  const validInitialLang: LanguageCode = langParam in LANGUAGES ? langParam : "en";
  const nickname = searchParams.get("nick") ?? "";

  const [selectedLang, setSelectedLang] = useState<LanguageCode>(validInitialLang);
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [voiceCloneDone, setVoiceCloneDone] = useState(false);
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
    const languageEntries = Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][];

    return (
      <main className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm space-y-8 animate-pop-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Join Room</h1>
            <p className="text-gray-400 text-sm">
              Room{" "}
              <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{roomId}</span>
            </p>
          </div>

          {/* Language selection — dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500">
              What language do you speak?
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xl">
                {LANGUAGES[selectedLang].flag}
              </span>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-11 pr-10 py-3.5 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer shadow-sm"
              >
                {languageEntries.map(([code, { name, flag, english }]) => (
                  <option key={code} value={code}>
                    {flag} {name} — {english}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Join button */}
          <button
            onClick={handleJoin}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-sm hover:shadow-md"
          >
            Join Room →
          </button>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
        <div className="text-center space-y-4 animate-pop-in">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-500 text-lg font-semibold">{error}</p>
          <p className="text-gray-400 text-sm">
            Please allow camera and microphone access and reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            Reload Page
          </button>
        </div>
      </main>
    );
  }

  if (!localStream) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-3 animate-pop-in">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm font-medium">Requesting camera access...</p>
        </div>
      </main>
    );
  }

  if (!voiceCloneDone) {
    return (
      <VoiceCloningSetup
        localStream={localStream}
        lang={selectedLang}
        onComplete={(id) => {
          setVoiceId(id);
          setVoiceCloneDone(true);
        }}
      />
    );
  }

  return <RoomView roomId={roomId} lang={selectedLang} localStream={localStream} initialVoiceId={voiceId} nickname={nickname} />;
}
