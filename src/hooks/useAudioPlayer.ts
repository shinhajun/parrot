"use client";

import { useRef, useState, useCallback } from "react";
import { base64ToAudioBuffer } from "@/lib/audio";
import { TTS_VOLUME } from "@/lib/constants";

export interface UseAudioPlayerReturn {
  playAudio: (base64: string) => Promise<void>;
  isPlaying: boolean;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playAudio = useCallback(
    async (base64: string) => {
      const ctx = getAudioContext();

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const audioBuffer = await base64ToAudioBuffer(base64, ctx);

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = TTS_VOLUME;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      setIsPlaying(true);
      source.onended = () => {
        setIsPlaying(false);
      };

      source.start();
    },
    [getAudioContext]
  );

  return { playAudio, isPlaying };
}
