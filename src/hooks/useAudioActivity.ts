"use client";

import { useEffect, useRef, useState } from "react";

const RMS_THRESHOLD = 0.015;
const SILENCE_DELAY = 600; // ms before "speaking" goes false

/**
 * Monitors a MediaStream's audio level and returns whether the user is actively speaking.
 */
export function useAudioActivity(stream: MediaStream | null): boolean {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!stream) {
            setIsSpeaking(false);
            return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            setIsSpeaking(false);
            return;
        }

        let cancelled = false;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Float32Array(analyser.fftSize);

        function poll() {
            if (cancelled) return;

            analyser.getFloatTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);

            if (rms > RMS_THRESHOLD) {
                // Clear any pending silence timer
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                setIsSpeaking(true);
            } else {
                // Start silence timer if not already running
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        setIsSpeaking(false);
                        silenceTimerRef.current = null;
                    }, SILENCE_DELAY);
                }
            }

            requestAnimationFrame(poll);
        }

        poll();

        return () => {
            cancelled = true;
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            source.disconnect();
            audioCtx.close();
        };
    }, [stream]);

    return isSpeaking;
}
