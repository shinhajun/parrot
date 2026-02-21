import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onClose: () => void;
    localUserId: string;
}

export function ChatPanel({ messages, onSendMessage, onClose, localUserId }: ChatPanelProps) {
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText("");
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-100 h-full flex flex-col shadow-sm flex-shrink-0 animate-pop-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <h2 className="text-[15px] font-semibold text-gray-800">Chat</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    aria-label="Close chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">No messages yet</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === localUserId;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className="text-[11px] text-gray-400 mb-1 px-1">
                                    {msg.senderName}
                                </span>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${isMe
                                            ? "bg-blue-500 text-white rounded-tr-sm"
                                            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                                        }`}
                                >
                                    {msg.translatedText ? (
                                        <div className="flex flex-col">
                                            <p className="text-[14px] leading-relaxed">{msg.translatedText}</p>
                                            <p className={`text-[11px] mt-1 pt-1 border-t ${isMe ? "text-blue-100 border-blue-400/50" : "text-gray-400 border-gray-100"}`}>
                                                Original: {msg.originalText}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-[14px] leading-relaxed">{msg.originalText}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
