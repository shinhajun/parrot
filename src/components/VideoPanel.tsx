"use client";

import { useEffect, useRef } from "react";

interface VideoPanelProps {
  stream: MediaStream | null;
  muted: boolean;
  label: string;
  languageFlag?: string;
  languageName?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isActive?: boolean;
}

export default function VideoPanel({
  stream,
  muted,
  label,
  languageFlag,
  languageName,
  isSpeaking = false,
  isMuted = false,
  isCameraOff = false,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && !isCameraOff) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOff]);

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-2xl bg-white border shadow-sm transition-all duration-300 ${isSpeaking ? "speaking-glow" : "border-gray-100"
        }`}
    >
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 w-full h-full bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 7.5V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v9a2.25 2.25 0 002.25 2.25h.75" />
            <path d="M21 12l-4.5-3v9L21 15v-3z" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span className="text-xs font-medium text-gray-400">{isCameraOff ? "Camera Off" : "No Video"}</span>
        </div>
      )}

      {/* Mute indicator overlay */}
      {isMuted && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500/90 backdrop-blur-sm rounded-full shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-[10px] font-semibold text-white">Muted</span>
        </div>
      )}

      {/* Bottom label bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/40 to-transparent">
        <span className="text-xs font-medium text-white drop-shadow-sm">
          {label}
        </span>
        {languageName && (
          <span className="text-[10px] font-medium text-white/80 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {languageName}
          </span>
        )}
      </div>
    </div>
  );
}
