"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DataChannelMessage } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  roomId: string;
  localStream: MediaStream | null;
  onDataChannelMessage: (msg: DataChannelMessage) => void;
}

interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  dataChannel: RTCDataChannel | null;
  isConnected: boolean;
  error: string | null;
  sendMessage: (msg: DataChannelMessage) => void;
}

type SignalingMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; senderId: string };

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({
  roomId,
  localStream,
  onDataChannelMessage,
}: UseWebRTCProps): UseWebRTCReturn {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localIdRef = useRef(crypto.randomUUID());
  const onDataChannelMessageRef = useRef(onDataChannelMessage);

  useEffect(() => {
    onDataChannelMessageRef.current = onDataChannelMessage;
  }, [onDataChannelMessage]);

  const sendMessage = useCallback((msg: DataChannelMessage) => {
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !localStream) return;

    const localId = localIdRef.current;
    let pc: RTCPeerConnection | null = null;
    let isCleaned = false;

    function createPeerConnection(): RTCPeerConnection {
      const peer = new RTCPeerConnection(RTC_CONFIG);
      peerRef.current = peer;

      localStream!.getTracks().forEach((track) => {
        peer.addTrack(track, localStream!);
      });

      const remote = new MediaStream();
      peer.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((track) => {
          remote.addTrack(track);
        });
        setRemoteStream(remote);
      };

      peer.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "ice-candidate",
              candidate: e.candidate.toJSON(),
              senderId: localId,
            } satisfies SignalingMessage,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
          setIsConnected(true);
        } else if (
          peer.connectionState === "disconnected" ||
          peer.connectionState === "failed"
        ) {
          setIsConnected(false);
        }
      };

      return peer;
    }

    function setupDataChannel(dc: RTCDataChannel) {
      dc.onopen = () => {
        dataChannelRef.current = dc;
        setDataChannel(dc);
      };
      dc.onclose = () => {
        dataChannelRef.current = null;
        setDataChannel(null);
      };
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as DataChannelMessage;
          onDataChannelMessageRef.current(msg);
        } catch {
          // ignore malformed messages
        }
      };
    }

    async function handleSignal(payload: SignalingMessage) {
      if (payload.senderId === localId) return;

      try {
        if (payload.type === "offer") {
          pc = createPeerConnection();
          pc.ondatachannel = (e) => setupDataChannel(e.channel);

          await pc.setRemoteDescription(payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "answer",
              sdp: answer,
              senderId: localId,
            } satisfies SignalingMessage,
          });
        } else if (payload.type === "answer") {
          if (pc) {
            await pc.setRemoteDescription(payload.sdp);
          }
        } else if (payload.type === "ice-candidate") {
          if (pc) {
            await pc.addIceCandidate(payload.candidate);
          }
        }
      } catch (err) {
        if (!isCleaned) {
          setError(
            err instanceof Error ? err.message : "Signaling error occurred"
          );
        }
      }
    }

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: localId } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        handleSignal(payload as SignalingMessage);
      })
      .on("presence", { event: "sync" }, () => {
        // On presence sync, check if there are exactly 2 participants
        // The one with the alphabetically smaller ID creates the offer
        if (pc) return; // already connected

        const state = channel.presenceState();
        const allKeys = Object.keys(state);
        if (allKeys.length === 2) {
          const sorted = [...allKeys].sort();
          const isHost = sorted[0] === localId;

          if (isHost) {
            (async () => {
              try {
                pc = createPeerConnection();
                const dc = pc.createDataChannel("babelroom");
                setupDataChannel(dc);

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                channel.send({
                  type: "broadcast",
                  event: "signal",
                  payload: {
                    type: "offer",
                    sdp: offer,
                    senderId: localId,
                  } satisfies SignalingMessage,
                });
              } catch (err) {
                if (!isCleaned) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to create offer"
                  );
                }
              }
            })();
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: localId });
        }
      });

    return () => {
      isCleaned = true;

      dataChannelRef.current?.close();
      dataChannelRef.current = null;

      peerRef.current?.close();
      peerRef.current = null;
      pc = null;

      channel.unsubscribe();
      channelRef.current = null;

      setRemoteStream(null);
      setDataChannel(null);
      setIsConnected(false);
      setError(null);
    };
  }, [roomId, localStream]);

  return { remoteStream, dataChannel, isConnected, error, sendMessage };
}
