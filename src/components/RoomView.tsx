"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LanguageCode } from "@/lib/languages";
import { getLanguageFlag, getLanguageName } from "@/lib/languages";
import type { DataChannelMessage, Subtitle } from "@/types";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useVoiceClone } from "@/hooks/useVoiceClone";
import { useTranslation } from "@/hooks/useTranslation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioActivity } from "@/hooks/useAudioActivity";
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
  const [peerMuted, setPeerMuted] = useState<Map<string, boolean>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const langRef = useRef(lang);
  langRef.current = lang;

  const sendMessageToPeerRef = useRef<(peerId: string, msg: DataChannelMessage) => void>(() => { });

  const { playAudio } = useAudioPlayer();
  const { voiceId, collectAudio, isCloning } = useVoiceClone();

  // Speaking detection for local stream
  const localIsSpeaking = useAudioActivity(isMuted ? null : localStream);

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
        case "mute-status":
          setPeerMuted((prev) => {
            const next = new Map(prev);
            next.set(fromPeerId, msg.isMuted);
            return next;
          });
          break;
        case "voice-ready":
          break;
      }
    },
    [addSubtitle, playAudio]
  );

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

  sendMessageToPeerRef.current = sendMessageToPeer;

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

  // Broadcast mute status to all peers
  const broadcastMessageRef = useRef(broadcastMessage);
  broadcastMessageRef.current = broadcastMessage;

  useEffect(() => {
    broadcastMessageRef.current({ type: "mute-status", isMuted });
  }, [isMuted]);

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

  // Filter subtitles for local user vs peers
  const mySubtitles = subtitles.filter((s) => s.isMine);
  const peerSubtitles = subtitles.filter((s) => !s.isMine);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-6 py-3 bg-white border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800 tracking-wide">Parrot</span>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <ConnectionStatus isConnected={isConnected} error={error} />
        </div>
        {isCloning && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Cloning voice...</span>
          </div>
        )}
      </div>

      {/* Video grid — horizontal fill */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div className="flex gap-6 justify-center items-start max-w-6xl w-full">
          {/* Local video tile */}
          <div className="animate-pop-in flex flex-col items-center flex-1 min-w-0 max-w-2xl">
            <VideoPanel
              stream={localStream}
              muted={true}
              label={`You ${getLanguageFlag(lang)}`}
              languageFlag={getLanguageFlag(lang)}
              languageName={getLanguageName(lang)}
              isSpeaking={localIsSpeaking}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
            />
            <div className="w-full mt-2">
              <SubtitleOverlay subtitles={mySubtitles} compact />
            </div>
          </div>

          {/* Remote peer tiles */}
          {remotePeers.map((peer) => {
            const peerLang = peerLangs.get(peer.peerId);
            const isPeerMuted = peerMuted.get(peer.peerId) ?? false;
            return (
              <div key={peer.peerId} className="animate-pop-in flex flex-col items-center flex-1 min-w-0 max-w-2xl">
                <VideoPanel
                  stream={peer.stream}
                  muted={false}
                  label={peerLang ? `Peer ${getLanguageFlag(peerLang)}` : "Connecting..."}
                  languageFlag={peerLang ? getLanguageFlag(peerLang) : undefined}
                  languageName={peerLang ? getLanguageName(peerLang) : undefined}
                  isSpeaking={false}
                  isMuted={isPeerMuted}
                />
                <div className="w-full mt-2">
                  <SubtitleOverlay subtitles={peerSubtitles} compact />
                </div>
              </div>
            );
          })}

          {/* Waiting placeholder */}
          {remotePeers.length === 0 && (
            <div className="animate-pop-in flex flex-col items-center flex-1 min-w-0 max-w-2xl">
              <div className="w-full aspect-video rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400 font-medium">Waiting for peers...</p>
                </div>
              </div>
              <div className="w-full mt-2 h-12" />
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center py-4 px-6 bg-white border-t border-gray-100">
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
