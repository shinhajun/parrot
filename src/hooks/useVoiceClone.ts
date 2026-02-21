"use client";

import { useRef, useState, useCallback } from "react";
import { concatenateFloat32Arrays, float32ToWavBase64 } from "@/lib/audio";
import {
  VOICE_CLONE_MIN_DURATION,
  SUPABASE_FUNCTIONS_URL,
} from "@/lib/constants";
import type { CloneVoiceResponse } from "@/types";

export interface UseVoiceCloneReturn {
  voiceId: string | null;
  collectAudio: (audio: Float32Array) => void;
  isCloning: boolean;
}

export function useVoiceClone(initialVoiceId?: string | null): UseVoiceCloneReturn {
  const [voiceId, setVoiceId] = useState<string | null>(initialVoiceId ?? null);
  const [isCloning, setIsCloning] = useState(false);

  const audioChunksRef = useRef<Float32Array[]>([]);
  const totalDurationRef = useRef(0);
  const clonedRef = useRef(!!initialVoiceId);

  const collectAudio = useCallback((audio: Float32Array) => {
    if (clonedRef.current) return;

    audioChunksRef.current.push(audio);
    totalDurationRef.current += audio.length / 16000;

    if (totalDurationRef.current >= VOICE_CLONE_MIN_DURATION) {
      clonedRef.current = true;
      cloneVoice();
    }
  }, []);

  async function cloneVoice() {
    setIsCloning(true);

    try {
      const combined = concatenateFloat32Arrays(audioChunksRef.current);
      const audioBase64 = float32ToWavBase64(combined);

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/clone-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          name: `clone-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Clone voice failed: ${res.status}`);
      }

      const data: CloneVoiceResponse = await res.json();
      setVoiceId(data.voiceId);
    } catch (err) {
      console.error("Voice cloning failed:", err);
      clonedRef.current = false;
    } finally {
      setIsCloning(false);
    }
  }

  return { voiceId, collectAudio, isCloning };
}
