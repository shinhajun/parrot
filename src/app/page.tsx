"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [nick, setNick] = useState("");
  const [roomCode, setRoomCode] = useState("");

  function createRoom() {
    const code = generateRoomCode();
    router.push(`/room/${code}?nick=${encodeURIComponent(nick.trim())}`);
  }

  function joinRoom() {
    const code = roomCode.trim().toLowerCase();
    if (!code) return;
    router.push(`/room/${code}?nick=${encodeURIComponent(nick.trim())}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">Parrot</h1>
          <p className="text-gray-400 text-lg">
            Real-time video translation
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Your name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={32}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-colors"
            />
          </div>

          <button
            onClick={createRoom}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-sm hover:shadow-md"
          >
            Create Room
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">or join a room</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              maxLength={8}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-colors"
            />
            <button
              onClick={joinRoom}
              disabled={!roomCode.trim()}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-semibold rounded-xl transition-all duration-200 text-base"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
