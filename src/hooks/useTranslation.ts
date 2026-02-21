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

interface UseTranslationProps {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  sendMessage: (msg: DataChannelMessage) => void;
  voiceId: string | null;
  onSubtitle: (subtitle: Subtitle) => void;
  onAudioCollected: (audio: Float32Array) => void;
  enabled: boolean;
}

export function useTranslation({
  sourceLang,
  targetLang,
  sendMessage,
  voiceId,
  onSubtitle,
  onAudioCollected,
  enabled,
}: UseTranslationProps) {
  const isProcessingRef = useRef(false);

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  const onSubtitleRef = useRef(onSubtitle);
  onSubtitleRef.current = onSubtitle;

  const onAudioCollectedRef = useRef(onAudioCollected);
  onAudioCollectedRef.current = onAudioCollected;

  const sourceLangRef = useRef(sourceLang);
  sourceLangRef.current = sourceLang;

  const targetLangRef = useRef(targetLang);
  targetLangRef.current = targetLang;

  const handleSpeechEnd = useCallback(async (audio: Float32Array) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Collect audio for voice cloning
      onAudioCollectedRef.current(audio);

      // Convert to WAV base64
      const audioBase64 = float32ToWavBase64(audio);
      const segmentId = crypto.randomUUID();

      // Use full language names for Gemini
      const sourceEnglish = getLanguageEnglish(sourceLangRef.current);
      const targetEnglish = getLanguageEnglish(targetLangRef.current);

      // Step 1: Translate
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

      // Skip empty results
      if (!originalText && !translatedText) return;

      // Step 2: Show local subtitle
      onSubtitleRef.current({
        id: segmentId,
        original: originalText,
        translated: translatedText,
        timestamp: Date.now(),
        isMine: true,
      });

      // Step 3: Send subtitle to peer
      sendMessageRef.current({
        type: "subtitle",
        original: originalText,
        translated: translatedText,
        segmentId,
      });

      // Step 4: TTS
      const ttsRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: translatedText,
          voiceId: voiceIdRef.current ?? undefined,
          languageCode: targetLangRef.current,
        }),
      });

      if (!ttsRes.ok) {
        throw new Error(`TTS failed: ${ttsRes.status}`);
      }

      const { audioBase64: ttsAudioBase64 } = await ttsRes.json();

      // Step 5: Send TTS audio to peer
      sendMessageRef.current({
        type: "tts-audio",
        audioBase64: ttsAudioBase64,
        segmentId,
      });
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
