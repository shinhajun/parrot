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
        <div className="w-full max-w-lg space-y-8 animate-pop-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Join Room</h1>
            <p className="text-gray-400 text-sm">
              Room{" "}
              <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{roomId}</span>
            </p>
          </div>

          {/* Language selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-500 text-center">
              What language do you speak?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {languageEntries.map(([code, { name, flag, english }]) => (
                <button
                  key={code}
                  onClick={() => setSelectedLang(code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${selectedLang === code
                      ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                      : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                    }`}
                >
                  <span className="text-2xl">{flag}</span>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${selectedLang === code ? "text-blue-700" : "text-gray-800"
                      }`}>
                      {name}
                    </span>
                    <span className="text-xs text-gray-400">{english}</span>
                  </div>
                  {selectedLang === code && (
                    <span className="ml-auto text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
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
