"use client";

import { useEffect, useState } from "react";
import type { Subtitle } from "@/types";
import { SUBTITLE_FADE_DURATION } from "@/lib/constants";

interface SubtitleOverlayProps {
  subtitles: Subtitle[];
  compact?: boolean;
}

export default function SubtitleOverlay({ subtitles, compact }: SubtitleOverlayProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const recent = subtitles.slice(-2);

  if (recent.length === 0) {
    return (
      <div className={compact ? "h-12" : "h-16"}>
        <p className="text-xs text-gray-300 text-center pt-2">
          {compact ? "" : "Subtitles will appear here..."}
        </p>
      </div>
    );
  }

  return (
    <div className={`${compact ? "h-12" : "h-16"} overflow-hidden space-y-1 flex flex-col justify-end`}>
      {recent.map((sub) => {
        const age = now - sub.timestamp;
        const faded = age > SUBTITLE_FADE_DURATION;

        return (
          <div
            key={sub.id}
            className={`transition-opacity duration-500 ${faded ? "opacity-0" : "opacity-100"
              }`}
          >
            <p className="text-xs leading-relaxed text-center">
              <span className="text-gray-400">{sub.original}</span>
              <span className="text-gray-300 mx-1">→</span>
              <span className="text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded-md">{sub.translated}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
