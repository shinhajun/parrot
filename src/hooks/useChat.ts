import { useState, useCallback, useRef } from "react";
import type { ChatMessage, DataChannelMessage } from "@/types";
import type { LanguageCode } from "@/lib/languages";
import { getLanguageEnglish } from "@/lib/languages";
import { SUPABASE_FUNCTIONS_URL } from "@/lib/constants";

interface UseChatProps {
    localLang: LanguageCode;
    localNickname: string;
    sendMessageToAllPeers: (msg: DataChannelMessage) => void;
}

export function useChat({ localLang, localNickname, sendMessageToAllPeers }: UseChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const localLangRef = useRef(localLang);
    localLangRef.current = localLang;

    const sendMessage = useCallback((text: string) => {
        if (!text.trim()) return;

        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            senderId: "local",
            senderName: localNickname ? `${localNickname} (You)` : "You",
            originalText: text.trim(),
            sourceLang: localLangRef.current,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, msg]);

        sendMessageToAllPeers({
            type: "chat-message",
            message: msg,
        });
    }, [localNickname, sendMessageToAllPeers]);

    const receiveMessage = useCallback(async (incomingMsg: ChatMessage, senderPeerId: string, senderName: string) => {
        if (!incomingMsg || !incomingMsg.id || !incomingMsg.originalText) {
            console.warn("Received malformed chat message, ignoring", incomingMsg);
            return;
        }

        // Add message immediately with original text
        const msgId = incomingMsg.id;
        const finalMsg: ChatMessage = {
            ...incomingMsg,
            senderId: senderPeerId,
            senderName: senderName || "Peer",
        };

        setMessages((prev) => [...prev, finalMsg]);

        // Translate if languages differ
        if (incomingMsg.sourceLang && incomingMsg.sourceLang !== localLangRef.current) {
            try {
                const sourceEnglish = getLanguageEnglish(incomingMsg.sourceLang);
                const targetEnglish = getLanguageEnglish(localLangRef.current);

                const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/translate-text`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: incomingMsg.originalText,
                        sourceLang: sourceEnglish,
                        targetLang: targetEnglish,
                    }),
                });

                if (res.ok) {
                    const { translatedText } = await res.json();
                    if (translatedText) {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === msgId ? { ...m, translatedText } : m))
                        );
                    }
                }
            } catch (err) {
                console.error("Chat translation failed:", err);
            }
        }
    }, []);

    return {
        messages,
        sendMessage,
        receiveMessage,
    };
}
