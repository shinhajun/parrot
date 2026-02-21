"use client";

import { useEffect, useState } from "react";
import type { Subtitle } from "@/types";
import { SUBTITLE_FADE_DURATION } from "@/lib/constants";

interface SubtitleOverlayProps {
  subtitles: Subtitle[];
}

export default function SubtitleOverlay({ subtitles }: SubtitleOverlayProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const recent = subtitles.slice(-3);

  if (recent.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center">
        <p className="text-sm text-slate-600">Subtitles will appear here...</p>
      </div>
    );
  }

  return (
    <div className="h-24 overflow-hidden space-y-1 flex flex-col justify-end">
      {recent.map((sub) => {
        const age = now - sub.timestamp;
        const faded = age > SUBTITLE_FADE_DURATION;

        return (
          <div
            key={sub.id}
            className={`transition-opacity duration-500 ${
              faded ? "opacity-0" : "opacity-100"
            } ${sub.isMine ? "text-right" : "text-left"}`}
          >
            <span className="text-xs text-slate-500 mr-2">
              {sub.isMine ? "You" : "Peer"}
            </span>
            <span className="text-sm text-slate-400">{sub.original}</span>
            <span className="text-sm text-slate-600 mx-2">→</span>
            <span className="text-base text-white font-medium">{sub.translated}</span>
          </div>
        );
      })}
    </div>
  );
}
