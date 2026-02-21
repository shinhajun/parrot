import { getLanguageFlag, getLanguageName } from "@/lib/languages";
import type { LanguageCode } from "@/lib/languages";

export interface Participant {
    id: string;
    isLocal?: boolean;
    name: string;
    lang?: LanguageCode;
    isMuted: boolean;
    isCameraOff: boolean;
    isLocallyMuted?: boolean;
}

interface ParticipantListProps {
    participants: Participant[];
    onClose: () => void;
    onToggleLocalMute?: (peerId: string) => void;
}

export function ParticipantList({ participants, onClose, onToggleLocalMute }: ParticipantListProps) {
    return (
        <div className="w-80 bg-white border-l border-gray-100 h-full flex flex-col shadow-sm flex-shrink-0 animate-pop-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-800">Participants ({participants.length})</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    aria-label="Close participant list"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                                {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-gray-700 truncate">
                                    {p.name} {p.isLocal && "(You)"} {p.lang && getLanguageFlag(p.lang)}
                                </span>
                                {p.lang && (
                                    <span className="text-[10px] text-gray-400">
                                        {getLanguageName(p.lang)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 text-gray-400">
                            {/* Camera Status */}
                            {p.isCameraOff ? (
                                <span title="Camera Off" className="text-red-400/80">🚫</span>
                            ) : (
                                <span title="Camera On">📷</span>
                            )}

                            {/* Mic Status */}
                            {p.isMuted ? (
                                <span title="Muted" className="text-red-400/80">🔇</span>
                            ) : (
                                <span title="Unmuted">🎙️</span>
                            )}

                            {/* Local Mute Toggle (only for remote peers) */}
                            {!p.isLocal && onToggleLocalMute && (
                                <button
                                    onClick={() => onToggleLocalMute(p.id)}
                                    className={`p-1.5 rounded-md transition-all ${p.isLocallyMuted
                                            ? "bg-red-50 text-red-500 hover:bg-red-100 opacity-100"
                                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 border border-transparent"
                                        }`}
                                    title={p.isLocallyMuted ? "Unmute locally" : "Mute locally"}
                                >
                                    {p.isLocallyMuted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0 1 10 4v12a1 1 0 0 1-1.707.707L4.586 13H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.586l3.707-3.707a1 1 0 0 1 1.09-.217ZM12.293 7.293a1 1 0 0 1 1.414 0L15 8.586l1.293-1.293a1 1 0 1 1 1.414 1.414L16.414 10l1.293 1.293a1 1 0 0 1-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 0 1-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                            <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
                                            <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
