"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export default function ConnectionStatus({
  isConnected,
  error,
}: ConnectionStatusProps) {
  let dotColor: string;
  let text: string;

  if (error) {
    dotColor = "bg-red-500";
    text = error;
  } else if (isConnected) {
    dotColor = "bg-emerald-500";
    text = "Connected";
  } else {
    dotColor = "bg-amber-400 animate-pulse";
    text = "Connecting...";
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-gray-500 font-medium">{text}</span>
    </div>
  );
}
