"use client";

import { useState, useCallback, useRef } from "react";
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
  const [peerLangs, setPeerLangs] = useState<Map<string, LanguageCode>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const langRef = useRef(lang);
  langRef.current = lang;

  // Ref to sendMessageToPeer so handlePeerConnected can use it before the hook returns
  const sendMessageToPeerRef = useRef<(peerId: string, msg: DataChannelMessage) => void>(() => {});

  const { playAudio } = useAudioPlayer();
  const { voiceId, collectAudio, isCloning } = useVoiceClone();

  const addSubtitle = useCallback((subtitle: Subtitle) => {
    setSubtitles((prev) => [...prev.slice(-9), subtitle]);
  }, []);

  const handleDataChannelMessage = useCallback(
    (msg: DataChannelMessage, fromPeerId: string) => {
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
          setPeerLangs((prev) => {
            const next = new Map(prev);
            next.set(fromPeerId, msg.lang);
            return next;
          });
          break;
        case "voice-ready":
          break;
      }
    },
    [addSubtitle, playAudio]
  );

  // Stable callback: uses refs so it doesn't change between renders
  const handlePeerConnected = useCallback((peerId: string) => {
    sendMessageToPeerRef.current(peerId, { type: "language", lang: langRef.current });
  }, []);

  const { remotePeers, isConnected, error, sendMessageToPeer, broadcastMessage } =
    useWebRTC({
      roomId,
      localStream,
      onDataChannelMessage: handleDataChannelMessage,
      onPeerConnected: handlePeerConnected,
    });

  // Keep ref in sync with latest sendMessageToPeer
  sendMessageToPeerRef.current = sendMessageToPeer;

  // Derive peerTargets: only peers whose language we know
  const peerTargets = remotePeers
    .filter((peer) => peerLangs.has(peer.peerId))
    .map((peer) => ({ peerId: peer.peerId, lang: peerLangs.get(peer.peerId)! }));

  useTranslation({
    sourceLang: lang,
    peerTargets,
    sendMessageToPeer,
    voiceId,
    onSubtitle: addSubtitle,
    onAudioCollected: collectAudio,
    enabled: peerTargets.length > 0 && !isMuted,
  });

  // Suppress unused warning for broadcastMessage (available for future use)
  void broadcastMessage;

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

      {/* Video grid — 2-column layout, local video last */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 min-h-0">
        {remotePeers.map((peer) => {
          const peerLang = peerLangs.get(peer.peerId);
          return (
            <div key={peer.peerId} className="relative rounded-2xl overflow-hidden bg-slate-900">
              <VideoPanel
                stream={peer.stream}
                muted={false}
                label={peerLang ? `Peer ${getLanguageFlag(peerLang)}` : "Connecting..."}
                languageFlag={peerLang ? getLanguageFlag(peerLang) : undefined}
              />
              {peerLang && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-slate-300">
                  {getLanguageName(peerLang)}
                </div>
              )}
              {!peer.stream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-400">Connecting...</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Local video */}
        <div className="relative rounded-2xl overflow-hidden">
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

        {/* Waiting placeholder when no remote peers yet */}
        {remotePeers.length === 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Waiting for peers...</p>
            </div>
          </div>
        )}
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
