"use client";

import { useState } from "react";

interface ControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isCameraOff: boolean;
  onToggleCamera: () => void;
  onLeave: () => void;
  roomId: string;
  onToggleParticipants?: () => void;
  isParticipantsOpen?: boolean;
}

export function ControlBar({
  isMuted,
  onToggleMute,
  isCameraOff,
  onToggleCamera,
  onLeave,
  roomId,
  onToggleParticipants,
  isParticipantsOpen = false,
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

  const buttonBase =
    "flex h-11 w-11 items-center justify-center rounded-full text-base transition-all duration-200";
  const defaultStyle = "bg-gray-100 hover:bg-gray-200 text-gray-600";
  const activeStyle = "bg-red-50 hover:bg-red-100 text-red-500";

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={onToggleMute}
        className={`${buttonBase} ${isMuted ? activeStyle : defaultStyle}`}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🎙️"}
      </button>

      <button
        onClick={onToggleCamera}
        className={`${buttonBase} ${isCameraOff ? activeStyle : defaultStyle}`}
        aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
      >
        {isCameraOff ? "🚫" : "📷"}
      </button>

      {onToggleParticipants && (
        <button
          onClick={onToggleParticipants}
          className={`${buttonBase} ${isParticipantsOpen ? "bg-blue-50 text-blue-600 border border-blue-100" : defaultStyle}`}
          aria-label="Toggle Participants"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        </button>
      )}

      <div className="relative">
        <button
          onClick={handleShare}
          className={`${buttonBase} ${defaultStyle}`}
          aria-label="Copy room link"
        >
          {"🔗"}
        </button>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-white whitespace-nowrap shadow-lg">
            Copied!
          </span>
        )}
      </div>

      <button
        onClick={onLeave}
        className={`${buttonBase} bg-red-500 hover:bg-red-600 text-white shadow-sm`}
        aria-label="Leave room"
      >
        {"📞"}
      </button>
    </div>
  );
}
