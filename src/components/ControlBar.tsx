"use client";

import { useState } from "react";

interface ControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isCameraOff: boolean;
  onToggleCamera: () => void;
  onLeave: () => void;
  roomId: string;
}

export function ControlBar({
  isMuted,
  onToggleMute,
  isCameraOff,
  onToggleCamera,
  onLeave,
  roomId,
}: ControlBarProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onToggleMute}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition-colors ${
          isMuted
            ? "bg-red-600 hover:bg-red-500"
            : "bg-slate-800 hover:bg-slate-700"
        }`}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "\uD83D\uDD07" : "\uD83C\uDF99\uFE0F"}
      </button>

      <button
        onClick={onToggleCamera}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition-colors ${
          isCameraOff
            ? "bg-red-600 hover:bg-red-500"
            : "bg-slate-800 hover:bg-slate-700"
        }`}
        aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
      >
        {isCameraOff ? "\uD83D\uDEAB" : "\uD83D\uDCF7"}
      </button>

      <div className="relative">
        <button
          onClick={handleShare}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-lg transition-colors hover:bg-slate-700"
          aria-label="Copy room link"
        >
          {"\uD83D\uDD17"}
        </button>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-2 py-1 text-xs text-white whitespace-nowrap">
            Copied!
          </span>
        )}
      </div>

      <button
        onClick={onLeave}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-lg transition-colors hover:bg-red-500"
        aria-label="Leave room"
      >
        {"\uD83D\uDCDE"}
      </button>
    </div>
  );
}
