import React, { useState } from "react";
import { ScrollText, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export interface LogEntry {
  id: number;
  text: string;
  time: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
}

export function ActivityLog({ logs, onClearLogs }: ActivityLogProps) {
  const [isOpen, setIsOpen] = useState(true);

  const getLogColor = (text: string) => {
    if (text.includes("leaf") || text.includes("LEAVES") || text.includes("sprouted")) return "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
    if (text.includes("Mating") || text.includes("hybridization") || text.includes("Hybridization")) return "text-pink-400 border-pink-500/20 bg-pink-950/20";
    if (text.includes("eradicated") || text.includes("die-off") || text.includes("culled") || text.includes("terminated")) return "text-rose-400 border-rose-500/20 bg-rose-950/20";
    if (text.includes("spurt") || text.includes("recovered") || text.includes("Mutant")) return "text-amber-300 border-amber-500/20 bg-amber-950/20";
    return "text-sky-300 border-sky-500/20 bg-sky-950/20";
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start pointer-events-auto select-none font-mono">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-md bg-black/80 backdrop-blur-md border border-[#87CEEB]/30 text-[10px] text-[#87CEEB] hover:text-white hover:bg-black/90 transition-all shadow-lg"
      >
        <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-bold tracking-wider">EVENT LOG</span>
        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
          {logs.length}
        </span>
        {isOpen ? <ChevronDown className="w-3 h-3 text-[#D2B48C]" /> : <ChevronUp className="w-3 h-3 text-[#D2B48C]" />}
      </button>

      {/* Log Feed Container */}
      {isOpen && (
        <div className="w-80 sm:w-96 max-h-56 bg-black/85 backdrop-blur-xl border border-[#87CEEB]/30 rounded-b-md rounded-tr-md p-2.5 shadow-2xl flex flex-col gap-1.5 overflow-hidden">
          <div className="flex justify-between items-center pb-1 border-b border-white/10 text-[9px] text-white/50">
            <span>RECENT SIMULATION EVENTS</span>
            {onClearLogs && (
              <button
                onClick={onClearLogs}
                className="hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-2.5 h-2.5" /> CLEAR
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-44 space-y-1 pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-[10px] text-white/40 italic py-3 text-center">
                No recent activity logged yet...
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`text-[9.5px] px-2 py-1 rounded border leading-tight flex items-start gap-1.5 transition-all ${getLogColor(
                    log.text
                  )}`}
                >
                  <span className="text-[8.5px] opacity-60 shrink-0 font-semibold">{log.time}</span>
                  <span className="break-words">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
