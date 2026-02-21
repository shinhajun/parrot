"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseVADProps {
  onSpeechEnd: (audio: Float32Array) => void;
  enabled: boolean;
}

// Energy-based VAD using Web Audio API - no ONNX dependency
const ENERGY_THRESHOLD = 0.01; // RMS energy threshold for speech
const SILENCE_TIMEOUT = 800; // ms of silence before speech end
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

        // ScriptProcessor for raw audio access (AudioWorklet overkill for hackathon)
        const bufferSize = 4096;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

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

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const chunk = new Float32Array(input);

          // Calculate RMS energy
          let sum = 0;
          for (let i = 0; i < chunk.length; i++) {
            sum += chunk[i] * chunk[i];
          }
          const rms = Math.sqrt(sum / chunk.length);

          const now = Date.now();

          if (rms > ENERGY_THRESHOLD) {
            // Speech detected
            if (!isSpeaking) {
              isSpeaking = true;
              speechStart = now;
              audioChunks.length = 0;
            }
            silenceStart = 0;
            audioChunks.push(chunk);

            // Force-flush if segment is too long (prevents huge batches)
            if (now - speechStart >= MAX_SPEECH_DURATION) {
              flushSegment();
              speechStart = now;
            }
          } else if (isSpeaking) {
            // Silence during speech
            audioChunks.push(chunk); // keep collecting during silence gap
            if (silenceStart === 0) {
              silenceStart = now;
            } else if (now - silenceStart > SILENCE_TIMEOUT) {
              // Speech ended
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
        processor.connect(audioContext.destination);

        cleanupRef.current = () => {
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
