"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LanguageCode } from "@/lib/languages";
import { getLanguageFlag, getLanguageName } from "@/lib/languages";
import type { DataChannelMessage, Subtitle } from "@/types";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useVoiceClone } from "@/hooks/useVoiceClone";
import { useTranslation } from "@/hooks/useTranslation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import VideoPanel from "./VideoPanel";
import SubtitleOverlay from "./SubtitleOverlay";
import { ControlBar } from "./ControlBar";
import ConnectionStatus from "./ConnectionStatus";

interface RoomViewProps {
  roomId: string;
  lang: LanguageCode;
  localStream: MediaStream;
}

export default function RoomView({ roomId, lang, localStream }: RoomViewProps) {
  const router = useRouter();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [remoteLang, setRemoteLang] = useState<LanguageCode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const { playAudio } = useAudioPlayer();
  const { voiceId, collectAudio, isCloning } = useVoiceClone();

  const addSubtitle = useCallback((subtitle: Subtitle) => {
    setSubtitles((prev) => [...prev.slice(-9), subtitle]);
  }, []);

  const handleDataChannelMessage = useCallback(
    (msg: DataChannelMessage) => {
      switch (msg.type) {
        case "subtitle":
          addSubtitle({
            id: msg.segmentId,
            original: msg.original,
            translated: msg.translated,
            timestamp: Date.now(),
            isMine: false,
          });
          break;
        case "tts-audio":
          playAudio(msg.audioBase64);
          break;
        case "language":
          setRemoteLang(msg.lang);
          break;
        case "voice-ready":
          break;
      }
    },
    [addSubtitle, playAudio]
  );

  const { remoteStream, isConnected, dataChannel, error, sendMessage } = useWebRTC({
    roomId,
    localStream,
    onDataChannelMessage: handleDataChannelMessage,
  });

  // Send language to peer when DataChannel opens (not just when connected)
  const sentLangRef = useRef(false);
  useEffect(() => {
    if (dataChannel && dataChannel.readyState === "open" && !sentLangRef.current) {
      sendMessage({ type: "language", lang });
      sentLangRef.current = true;
    }
    // Also listen for open event in case it opens after this effect runs
    if (dataChannel && dataChannel.readyState !== "open") {
      const onOpen = () => {
        if (!sentLangRef.current) {
          sendMessage({ type: "language", lang });
          sentLangRef.current = true;
        }
      };
      dataChannel.addEventListener("open", onOpen);
      return () => dataChannel.removeEventListener("open", onOpen);
    }
  }, [dataChannel, lang, sendMessage]);

  // Translation pipeline
  useTranslation({
    sourceLang: lang,
    targetLang: remoteLang ?? "en",
    sendMessage,
    voiceId,
    onSubtitle: addSubtitle,
    onAudioCollected: collectAudio,
    enabled: isConnected && !isMuted && remoteLang !== null,
  });

  const handleToggleMute = useCallback(() => {
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, [localStream]);

  const handleToggleCamera = useCallback(() => {
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, [localStream]);

  const handleLeave = useCallback(() => {
    localStream.getTracks().forEach((t) => t.stop());
    router.push("/");
  }, [localStream, router]);

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-4 py-2 bg-slate-900/60 border-b border-slate-800/50">
        <span className="text-sm font-semibold text-slate-300 tracking-wide">BabelRoom</span>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <ConnectionStatus isConnected={isConnected} error={error} />
        </div>
        {isCloning && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-purple-600/80 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Cloning voice...</span>
          </div>
        )}
      </div>

      {/* Video area - side by side */}
      <div className="flex-1 flex items-center justify-center p-4 gap-4 min-h-0">
        {/* Local video */}
        <div className="flex-1 max-w-[50%] aspect-video rounded-2xl overflow-hidden relative">
          <VideoPanel
            stream={localStream}
            muted={true}
            label={`You ${getLanguageFlag(lang)}`}
            languageFlag={getLanguageFlag(lang)}
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-slate-300">
            {getLanguageName(lang)}
          </div>
        </div>

        {/* Remote video */}
        <div className="flex-1 max-w-[50%] aspect-video rounded-2xl overflow-hidden relative">
          <VideoPanel
            stream={remoteStream}
            muted={false}
            label={remoteLang ? `Peer ${getLanguageFlag(remoteLang)}` : "Waiting for peer..."}
            languageFlag={remoteLang ? getLanguageFlag(remoteLang) : undefined}
          />
          {remoteLang && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-slate-300">
              {getLanguageName(remoteLang)}
            </div>
          )}
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-400">Waiting for peer...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtitle area */}
      <div className="px-4 pb-2">
        <SubtitleOverlay subtitles={subtitles} />
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center py-3 px-4 bg-slate-900/60 border-t border-slate-800/50">
        <ControlBar
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isCameraOff={isCameraOff}
          onToggleCamera={handleToggleCamera}
          onLeave={handleLeave}
          roomId={roomId}
        />
      </div>
    </div>
  );
}
