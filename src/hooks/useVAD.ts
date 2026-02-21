"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseVADProps {
  onSpeechEnd: (audio: Float32Array) => void;
  enabled: boolean;
}

// Energy-based VAD using Web Audio API
const ENERGY_THRESHOLD = 0.02; // RMS energy threshold for speech
const SILENCE_TIMEOUT = 800;   // ms of silence before speech end
const MIN_SPEECH_DURATION = 300; // ms minimum speech to trigger
const MAX_SPEECH_DURATION = 12000; // ms max before force-flushing segment
const SAMPLE_RATE = 16000;

export function useVAD({ onSpeechEnd, enabled }: UseVADProps) {
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;
  const cleanupRef = useRef<(() => void) | null>(null);

  const destroyVAD = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      destroyVAD();
      return;
    }

    let cancelled = false;

    async function initVAD() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        const source = audioContext.createMediaStreamSource(stream);

        await audioContext.audioWorklet.addModule("/vad-processor.worklet.js");
        const processor = new AudioWorkletNode(audioContext, "vad-processor");

        let isSpeaking = false;
        let speechStart = 0;
        let silenceStart = 0;
        const audioChunks: Float32Array[] = [];

        function flushSegment() {
          const totalLength = audioChunks.reduce((s, c) => s + c.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const c of audioChunks) {
            combined.set(c, offset);
            offset += c.length;
          }
          onSpeechEndRef.current(combined);
          audioChunks.length = 0;
        }

        processor.port.onmessage = (event) => {
          const chunk = event.data.samples as Float32Array;

          // Calculate RMS energy
          let sum = 0;
          for (let i = 0; i < chunk.length; i++) {
            sum += chunk[i] * chunk[i];
          }
          const rms = Math.sqrt(sum / chunk.length);
          const now = Date.now();

          if (rms > ENERGY_THRESHOLD) {
            if (!isSpeaking) {
              isSpeaking = true;
              speechStart = now;
              audioChunks.length = 0;
            }
            silenceStart = 0;
            audioChunks.push(chunk);

            if (now - speechStart >= MAX_SPEECH_DURATION) {
              flushSegment();
              speechStart = now;
            }
          } else if (isSpeaking) {
            audioChunks.push(chunk);
            if (silenceStart === 0) {
              silenceStart = now;
            } else if (now - silenceStart > SILENCE_TIMEOUT) {
              const speechDuration = now - speechStart;
              if (speechDuration >= MIN_SPEECH_DURATION) {
                flushSegment();
              }
              isSpeaking = false;
              silenceStart = 0;
              audioChunks.length = 0;
            }
          }
        };

        source.connect(processor);

        cleanupRef.current = () => {
          processor.port.close();
          processor.disconnect();
          source.disconnect();
          audioContext.close();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch (err) {
        console.error("VAD init failed:", err);
      }
    }

    initVAD();

    return () => {
      cancelled = true;
      destroyVAD();
    };
  }, [enabled, destroyVAD]);

  return { destroy: destroyVAD };
}
