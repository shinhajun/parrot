"use client";

import { useEffect, useRef } from "react";

interface VideoPanelProps {
  stream: MediaStream | null;
  muted: boolean;
  label: string;
  languageFlag?: string;
  isActive?: boolean;
}

export default function VideoPanel({
  stream,
  muted,
  label,
  languageFlag,
  isActive,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl bg-slate-900 ${
        isActive ? "ring-2 ring-blue-500 animate-pulse" : ""
      }`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-slate-800">
          <span className="text-6xl">👤</span>
        </div>
      )}

      <span className="absolute bottom-2 left-2 px-2 py-1 text-sm bg-black/60 rounded-md">
        {label}
      </span>

      {languageFlag && (
        <span className="absolute bottom-2 right-2 px-2 py-1 text-sm bg-black/60 rounded-md">
          {languageFlag}
        </span>
      )}
    </div>
  );
}
