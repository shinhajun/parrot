"use client";

import { useRef, useCallback } from "react";
import { useVAD } from "./useVAD";
import { float32ToWavBase64 } from "@/lib/audio";
import { SUPABASE_FUNCTIONS_URL } from "@/lib/constants";
import { getLanguageEnglish } from "@/lib/languages";
import type { LanguageCode } from "@/lib/languages";
import type {
  DataChannelMessage,
  Subtitle,
  TranslateResponse,
} from "@/types";

export interface PeerTarget {
  peerId: string;
  lang: LanguageCode;
}

interface UseTranslationProps {
  sourceLang: LanguageCode;
  peerTargets: PeerTarget[];
  sendMessageToPeer: (peerId: string, msg: DataChannelMessage) => void;
  voiceId: string | null;
  onSubtitle: (subtitle: Subtitle) => void;
  onAudioCollected: (audio: Float32Array) => void;
  enabled: boolean;
}

export function useTranslation({
  sourceLang,
  peerTargets,
  sendMessageToPeer,
  voiceId,
  onSubtitle,
  onAudioCollected,
  enabled,
}: UseTranslationProps) {
  const isProcessingRef = useRef(false);

  const sendMessageToPeerRef = useRef(sendMessageToPeer);
  sendMessageToPeerRef.current = sendMessageToPeer;

  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  const onSubtitleRef = useRef(onSubtitle);
  onSubtitleRef.current = onSubtitle;

  const onAudioCollectedRef = useRef(onAudioCollected);
  onAudioCollectedRef.current = onAudioCollected;

  const sourceLangRef = useRef(sourceLang);
  sourceLangRef.current = sourceLang;

  const peerTargetsRef = useRef(peerTargets);
  peerTargetsRef.current = peerTargets;

  const handleSpeechEnd = useCallback(async (audio: Float32Array) => {
    if (isProcessingRef.current) return;
    if (peerTargetsRef.current.length === 0) return;
    isProcessingRef.current = true;

    try {
      // Collect audio for voice cloning
      onAudioCollectedRef.current(audio);

      const audioBase64 = float32ToWavBase64(audio);
      const segmentId = crypto.randomUUID();
      const sourceEnglish = getLanguageEnglish(sourceLangRef.current);

      // Translate + TTS in parallel for each peer
      const results = await Promise.allSettled(
        peerTargetsRef.current.map(async ({ peerId, lang: peerLang }) => {
          const targetEnglish = getLanguageEnglish(peerLang);

          const translateRes = await fetch(
            `${SUPABASE_FUNCTIONS_URL}/translate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64,
                sourceLang: sourceEnglish,
                targetLang: targetEnglish,
              }),
            }
          );

          if (!translateRes.ok) {
            throw new Error(`Translate failed: ${translateRes.status}`);
          }

          const { originalText, translatedText }: TranslateResponse =
            await translateRes.json();

          if (!originalText && !translatedText) {
            throw new Error("Empty translation result");
          }

          const ttsRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedText,
              voiceId: voiceIdRef.current ?? undefined,
              languageCode: peerLang,
            }),
          });

          if (!ttsRes.ok) {
            throw new Error(`TTS failed: ${ttsRes.status}`);
          }

          const { audioBase64: ttsAudio } = await ttsRes.json();

          return { peerId, originalText, translatedText, ttsAudio };
        })
      );

      // Show local subtitle from first successful result
      const firstSuccess = results.find((r) => r.status === "fulfilled");
      if (firstSuccess && firstSuccess.status === "fulfilled") {
        const { originalText, translatedText } = firstSuccess.value;
        onSubtitleRef.current({
          id: segmentId,
          original: originalText,
          translated: translatedText,
          timestamp: Date.now(),
          isMine: true,
        });
      }

      // Send subtitle + TTS audio to each peer
      for (const r of results) {
        if (r.status === "fulfilled") {
          const { peerId, originalText, translatedText, ttsAudio } = r.value;
          sendMessageToPeerRef.current(peerId, {
            type: "subtitle",
            original: originalText,
            translated: translatedText,
            segmentId,
          });
          sendMessageToPeerRef.current(peerId, {
            type: "tts-audio",
            audioBase64: ttsAudio,
            segmentId,
          });
        }
      }
    } catch (err) {
      console.error("Translation pipeline error:", err);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  useVAD({
    onSpeechEnd: handleSpeechEnd,
    enabled,
  });
}
