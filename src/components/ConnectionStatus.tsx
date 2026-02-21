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
    dotColor = "bg-green-500";
    text = "Connected";
  } else {
    dotColor = "bg-yellow-500 animate-pulse";
    text = "Connecting...";
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-slate-400">{text}</span>
    </div>
  );
}
