"use client";

import { useState, useRef, useCallback } from "react";
import type { LanguageCode } from "@/lib/languages";
import {
  SAMPLE_SENTENCES,
  SUPABASE_FUNCTIONS_URL,
} from "@/lib/constants";
import { float32ToWavBase64, concatenateFloat32Arrays } from "@/lib/audio";
import type { CloneVoiceResponse } from "@/types";

interface Props {
  localStream: MediaStream;
  lang: LanguageCode;
  onComplete: (voiceId: string | null) => void;
}

export default function VoiceCloningSetup({ localStream, lang, onComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MIN_SECONDS = 3;
  const canFinish = recordedSeconds >= MIN_SECONDS && isRecording;

  const startRecording = useCallback(async () => {
    audioChunksRef.current = [];
    setRecordedSeconds(0);

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(localStream);
    sourceRef.current = source;

    await audioContext.audioWorklet.addModule("/vad-processor.worklet.js");
    const processor = new AudioWorkletNode(audioContext, "vad-processor");
    processorRef.current = processor;

    processor.port.onmessage = (e) => {
      const chunk = e.data.samples as Float32Array;
      audioChunksRef.current.push(chunk);
    };

    source.connect(processor);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordedSeconds((s) => s + 1);
    }, 1000);
  }, [localStream]);

  const stopAndClone = useCallback(async () => {
    // Stop recording
    if (timerRef.current) clearInterval(timerRef.current);
    processorRef.current?.port.close();
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();

    setIsRecording(false);
    setIsProcessing(true);

    try {
      const combined = concatenateFloat32Arrays(audioChunksRef.current);
      const audioBase64 = float32ToWavBase64(combined, 16000);

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/clone-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          name: `parrot-${Date.now()}`,
          oldVoiceId: localStorage.getItem("parrot_voice_id") ?? undefined,
        }),
      });

      if (!res.ok) throw new Error(`Clone failed: ${res.status}`);

      const data: CloneVoiceResponse = await res.json();
      setIsDone(true);
      setTimeout(() => onComplete(data.voiceId), 600);
    } catch (err) {
      console.error("Pre-clone failed:", err);
      setIsProcessing(false);
      // On error, fall through to room with null voiceId (Rachel default)
      onComplete(null);
    }
  }, [onComplete]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-lg space-y-8 animate-pop-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Register Your Voice</h1>
          <p className="text-gray-400 text-sm">
            Read the sentence below aloud so we can clone your voice for translation.
          </p>
        </div>

        {/* Sample sentence card */}
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-sm text-center">
          <p className="text-gray-700 text-lg leading-relaxed font-medium">
            {SAMPLE_SENTENCES[lang]}
          </p>
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Recording… {recordedSeconds}s</span>
            {recordedSeconds < MIN_SECONDS && (
              <span className="text-gray-400">({MIN_SECONDS - recordedSeconds}s more needed)</span>
            )}
          </div>
        )}

        {/* Processing / done state */}
        {isProcessing && !isDone && (
          <div className="flex items-center justify-center gap-3 text-sm text-blue-600">
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Processing voice clone…</span>
          </div>
        )}
        {isDone && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Voice registered! Entering room…
          </div>
        )}

        {/* Action buttons */}
        {!isProcessing && !isDone && (
          <div className="flex flex-col gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-white" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopAndClone}
                disabled={!canFinish}
                className={`w-full py-3.5 font-semibold rounded-xl transition-all duration-200 text-base shadow-sm flex items-center justify-center gap-2 ${
                  canFinish
                    ? "bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Done — Register Voice
              </button>
            )}

            <button
              onClick={() => onComplete(null)}
              className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              Skip (use default voice)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
