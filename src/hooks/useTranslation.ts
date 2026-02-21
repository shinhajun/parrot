"use client";

import { useRef, useCallback } from "react";

// Detect Gemini hallucinations: timecodes, SRT/VTT artifacts, pure punctuation
function isHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Timecode patterns: "00:00:01", "00:00:01 --> 00:00:05", "00:00:01,000"
  if (/^\d{2}:\d{2}:\d{2}/.test(t)) return true;
  // Only digits, colons, dashes, arrows, spaces
  if (/^[\d\s:,.\-–—→>]+$/.test(t)) return true;
  return false;
}
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
  const pendingAudioRef = useRef<Float32Array | null>(null);

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

  const processAudio = useCallback(async (audio: Float32Array) => {
    if (peerTargetsRef.current.length === 0) return;

    try {
      onAudioCollectedRef.current(audio);

      const audioBase64 = float32ToWavBase64(audio);
      const segmentId = crypto.randomUUID();
      const sourceEnglish = getLanguageEnglish(sourceLangRef.current);

      // Step 1: Translate all peers in parallel
      const translateResults = await Promise.allSettled(
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

          if (isHallucination(originalText) || isHallucination(translatedText)) {
            throw new Error("Hallucination detected, skipping segment");
          }

          return { peerId, peerLang, originalText, translatedText };
        })
      );

      // Step 2: Show subtitles immediately after translation (don't wait for TTS)
      const firstSuccess = translateResults.find((r) => r.status === "fulfilled");
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

      for (const r of translateResults) {
        if (r.status === "fulfilled") {
          const { peerId, originalText, translatedText } = r.value;
          sendMessageToPeerRef.current(peerId, {
            type: "subtitle",
            original: originalText,
            translated: translatedText,
            segmentId,
          });
        }
      }

      // Step 3: TTS in parallel (audio follows after subtitles are already shown)
      const ttsResults = await Promise.allSettled(
        translateResults
          .filter((r) => r.status === "fulfilled")
          .map(async (r) => {
            const { peerId, peerLang, translatedText } = (r as PromiseFulfilledResult<{ peerId: string; peerLang: LanguageCode; originalText: string; translatedText: string }>).value;

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
            return { peerId, ttsAudio };
          })
      );

      for (const r of ttsResults) {
        if (r.status === "fulfilled") {
          const { peerId, ttsAudio } = r.value;
          sendMessageToPeerRef.current(peerId, {
            type: "tts-audio",
            audioBase64: ttsAudio,
            segmentId,
          });
        }
      }
    } catch (err) {
      console.error("Translation pipeline error:", err);
    }
  }, []);

  const handleSpeechEnd = useCallback(async (audio: Float32Array) => {
    if (peerTargetsRef.current.length === 0) return;

    // If already processing, keep only the latest pending segment
    if (isProcessingRef.current) {
      pendingAudioRef.current = audio;
      return;
    }

    isProcessingRef.current = true;
    try {
      await processAudio(audio);

      // After done, process the latest pending segment (if any)
      const pending = pendingAudioRef.current;
      if (pending) {
        pendingAudioRef.current = null;
        await processAudio(pending);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [processAudio]);

  useVAD({
    onSpeechEnd: handleSpeechEnd,
    enabled,
  });
}
