"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_FUNCTIONS_URL } from "@/lib/constants";
import type { DataChannelMessage } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  roomId: string;
  localStream: MediaStream | null;
  onDataChannelMessage: (msg: DataChannelMessage, fromPeerId: string) => void;
  onPeerConnected: (peerId: string) => void;
}

export interface RemotePeer {
  peerId: string;
  stream: MediaStream | null;
}

interface UseWebRTCReturn {
  remotePeers: RemotePeer[];
  isConnected: boolean;
  error: string | null;
  sendMessageToPeer: (peerId: string, msg: DataChannelMessage) => void;
  broadcastMessage: (msg: DataChannelMessage) => void;
}

type SignalingMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit; senderId: string; targetId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; senderId: string; targetId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; senderId: string; targetId: string };

interface PeerState {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  stream: MediaStream | null;
}

const FALLBACK_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

async function fetchIceServers(): Promise<RTCConfiguration> {
  try {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-turn-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.iceServers) {
        return { iceServers: data.iceServers };
      }
    }
  } catch {
    // fallback to STUN only
  }
  return FALLBACK_RTC_CONFIG;
}

export function useWebRTC({
  roomId,
  localStream,
  onDataChannelMessage,
  onPeerConnected,
}: UseWebRTCProps): UseWebRTCReturn {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rtcConfig, setRtcConfig] = useState<RTCConfiguration | null>(null);

  const peerMapRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localIdRef = useRef(crypto.randomUUID());
  const onDataChannelMessageRef = useRef(onDataChannelMessage);
  const onPeerConnectedRef = useRef(onPeerConnected);
  const localStreamRef = useRef(localStream);

  useEffect(() => { onDataChannelMessageRef.current = onDataChannelMessage; }, [onDataChannelMessage]);
  useEffect(() => { onPeerConnectedRef.current = onPeerConnected; }, [onPeerConnected]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  useEffect(() => {
    let cancelled = false;
    fetchIceServers().then((config) => {
      if (!cancelled) setRtcConfig(config);
    });
    return () => { cancelled = true; };
  }, []);

  const isConnected = remotePeers.length > 0;

  const rebuildPeers = useCallback(() => {
    const peers: RemotePeer[] = [];
    for (const [peerId, state] of peerMapRef.current) {
      peers.push({ peerId, stream: state.stream });
    }
    setRemotePeers([...peers]);
  }, []);

  const sendMessageToPeer = useCallback((peerId: string, msg: DataChannelMessage) => {
    const peerState = peerMapRef.current.get(peerId);
    if (peerState?.dc && peerState.dc.readyState === "open") {
      peerState.dc.send(JSON.stringify(msg));
    }
  }, []);

  const broadcastMessage = useCallback((msg: DataChannelMessage) => {
    for (const [, peerState] of peerMapRef.current) {
      if (peerState.dc && peerState.dc.readyState === "open") {
        peerState.dc.send(JSON.stringify(msg));
      }
    }
  }, []);

  useEffect(() => {
    if (!roomId || !localStream || !rtcConfig) return;

    const localId = localIdRef.current;
    let isCleaned = false;

    function setupDataChannel(dc: RTCDataChannel, peerId: string) {
      dc.onopen = () => {
        const peerState = peerMapRef.current.get(peerId);
        if (peerState) {
          peerState.dc = dc;
          rebuildPeers();
          onPeerConnectedRef.current(peerId);
        }
      };
      dc.onclose = () => {
        const peerState = peerMapRef.current.get(peerId);
        if (peerState) {
          peerState.dc = null;
          rebuildPeers();
        }
      };
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as DataChannelMessage;
          onDataChannelMessageRef.current(msg, peerId);
        } catch {
          // ignore malformed messages
        }
      };
    }

    function createPeerConnection(peerId: string): RTCPeerConnection {
      const pc = new RTCPeerConnection(rtcConfig!);
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      const remote = new MediaStream();
      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
        const peerState = peerMapRef.current.get(peerId);
        if (peerState) {
          peerState.stream = remote;
          rebuildPeers();
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "ice-candidate",
              candidate: e.candidate.toJSON(),
              senderId: localId,
              targetId: peerId,
            } satisfies SignalingMessage,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          cleanupPeer(peerId);
        }
      };

      return pc;
    }

    function cleanupPeer(peerId: string) {
      const peerState = peerMapRef.current.get(peerId);
      if (peerState) {
        peerState.dc?.close();
        peerState.pc.close();
        peerMapRef.current.delete(peerId);
        rebuildPeers();
      }
    }

    async function createOfferToPeer(peerId: string) {
      // Guard against duplicate offers
      if (peerMapRef.current.has(peerId)) return;

      try {
        const pc = createPeerConnection(peerId);
        const dc = pc.createDataChannel("babelroom");
        // Add to map immediately to prevent races on subsequent sync events
        peerMapRef.current.set(peerId, { pc, dc: null, stream: null });
        setupDataChannel(dc, peerId);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "offer",
            sdp: offer,
            senderId: localId,
            targetId: peerId,
          } satisfies SignalingMessage,
        });
      } catch (err) {
        if (!isCleaned) {
          setError(err instanceof Error ? err.message : "Failed to create offer");
        }
      }
    }

    async function handleSignal(payload: SignalingMessage) {
      if (payload.senderId === localId) return;
      if (payload.targetId !== localId) return;

      const peerId = payload.senderId;

      try {
        if (payload.type === "offer") {
          // Guard against duplicate connections
          if (peerMapRef.current.has(peerId)) return;

          const pc = createPeerConnection(peerId);
          peerMapRef.current.set(peerId, { pc, dc: null, stream: null });
          pc.ondatachannel = (e) => setupDataChannel(e.channel, peerId);

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
              targetId: peerId,
            } satisfies SignalingMessage,
          });
        } else if (payload.type === "answer") {
          const peerState = peerMapRef.current.get(peerId);
          if (peerState) {
            await peerState.pc.setRemoteDescription(payload.sdp);
          }
        } else if (payload.type === "ice-candidate") {
          const peerState = peerMapRef.current.get(peerId);
          if (peerState) {
            await peerState.pc.addIceCandidate(payload.candidate);
          }
        }
      } catch (err) {
        if (!isCleaned) {
          setError(err instanceof Error ? err.message : "Signaling error occurred");
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
        const state = channel.presenceState();
        const currentPeerIds = new Set(
          Object.keys(state).filter((k) => k !== localId)
        );
        const knownPeerIds = new Set(peerMapRef.current.keys());

        // New peers: create offer only if localId < peerId (deterministic)
        for (const peerId of currentPeerIds) {
          if (!knownPeerIds.has(peerId) && localId < peerId) {
            createOfferToPeer(peerId);
          }
        }

        // Left peers: cleanup
        for (const peerId of knownPeerIds) {
          if (!currentPeerIds.has(peerId)) {
            cleanupPeer(peerId);
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

      for (const [, peerState] of peerMapRef.current) {
        peerState.dc?.close();
        peerState.pc.close();
      }
      peerMapRef.current.clear();

      channel.unsubscribe();
      channelRef.current = null;

      setRemotePeers([]);
      setError(null);
    };
  }, [roomId, localStream, rtcConfig, rebuildPeers]);

  return { remotePeers, isConnected, error, sendMessageToPeer, broadcastMessage };
}
