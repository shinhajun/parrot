"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import RoomView from "@/components/RoomView";
import VoiceCloningSetup from "@/components/VoiceCloningSetup";
import { AuroraBackground } from "@/components/ui/aurora-background";
import type { LanguageCode } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";

const VOICE_ID_KEY = "parrot_voice_id";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params.roomId;

  const langParam = (searchParams.get("lang") ?? "en") as LanguageCode;
  const validInitialLang: LanguageCode = langParam in LANGUAGES ? langParam : "en";
  // nick from URL is only a suggestion — user can override on the join screen
  const urlNick = searchParams.get("nick") ?? "";

  const [selectedLang, setSelectedLang] = useState<LanguageCode>(validInitialLang);
  const [localNick, setLocalNick] = useState(urlNick);
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [voiceCloneDone, setVoiceCloneDone] = useState(false);
  const requested = useRef(false);

  // Load cached voice ID from localStorage — skip cloning if already done
  useEffect(() => {
    const cached = localStorage.getItem(VOICE_ID_KEY);
    if (cached) {
      setVoiceId(cached);
      setVoiceCloneDone(true);
    }
  }, []);

  const handleJoin = () => {
    if (requested.current) return;
    requested.current = true;
    setJoined(true);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setLocalStream)
      .catch(() => setError("Camera and microphone access is required."));
  };

  // Pre-join screen
  if (!joined) {
    const languageEntries = Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][];

    return (
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-sm space-y-6 px-4"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Join Room</h1>
            <p className="text-gray-500 text-sm">
              Room{" "}
              <span className="font-mono text-gray-700 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded">{roomId}</span>
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/50 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-500">Your name</label>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={localNick}
                onChange={(e) => setLocalNick(e.target.value)}
                maxLength={32}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-colors"
              />
            </div>

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
                  className="w-full appearance-none bg-white/80 border border-gray-200 rounded-xl pl-11 pr-10 py-3.5 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {languageEntries.map(([code, { name, english }]) => (
                    <option key={code} value={code}>
                      {name} — {english}
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

            <button
              onClick={handleJoin}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-sm hover:shadow-md"
            >
              Join Room
            </button>
          </div>
        </motion.div>
      </AuroraBackground>
    );
  }

  if (error) {
    return (
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-center space-y-4 px-4"
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-white/50 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <span className="text-2xl">!</span>
            </div>
            <p className="text-red-500 text-lg font-semibold">{error}</p>
            <p className="text-gray-400 text-sm">
              Please allow camera and microphone access and reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-white/80 hover:bg-white text-gray-700 font-medium rounded-xl transition-colors text-sm"
            >
              Reload Page
            </button>
          </div>
        </motion.div>
      </AuroraBackground>
    );
  }

  if (!localStream) {
    return (
      <AuroraBackground>
        <div className="relative z-10 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm font-medium">Requesting camera access...</p>
        </div>
      </AuroraBackground>
    );
  }

  if (!voiceCloneDone) {
    return (
      <VoiceCloningSetup
        localStream={localStream}
        lang={selectedLang}
        onComplete={(id) => {
          if (id) localStorage.setItem(VOICE_ID_KEY, id);
          setVoiceId(id);
          setVoiceCloneDone(true);
        }}
      />
    );
  }

  return (
    <RoomView
      roomId={roomId}
      lang={selectedLang}
      localStream={localStream}
      initialVoiceId={voiceId}
      nickname={localNick.trim()}
    />
  );
}
