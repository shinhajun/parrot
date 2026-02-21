"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSelector from "@/components/LanguageSelector";
import type { LanguageCode } from "@/lib/languages";

function generateRoomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const router = useRouter();
  const [lang, setLang] = useState<LanguageCode>("ko");
  const [roomCode, setRoomCode] = useState("");

  function createRoom() {
    const code = generateRoomCode();
    router.push(`/room/${code}?lang=${lang}`);
  }

  function joinRoom() {
    const code = roomCode.trim().toLowerCase();
    if (!code) return;
    router.push(`/room/${code}?lang=${lang}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">BabelRoom</h1>
          <p className="text-slate-400 text-lg">
            Real-time video translation
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Language
            </label>
            <LanguageSelector value={lang} onChange={setLang} />
          </div>

          <button
            onClick={createRoom}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            Create Room
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-slate-500 text-sm">or join a room</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              maxLength={8}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <button
              onClick={joinRoom}
              disabled={!roomCode.trim()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
