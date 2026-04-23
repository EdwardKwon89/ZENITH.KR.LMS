"use client";

import React, { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Database, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface RawLog {
  id: string;
  provider_name: string;
  raw_data: any;
  created_at: string;
}

interface RawLogViewerProps {
  logs: RawLog[];
}

/**
 * [Admin] Raw Tracking Log Viewer [Execution]
 * 외부 API로부터 수신된 원본 JSON 데이터를 디버깅 및 감사 목적으로 시각화
 */
export default function RawLogViewer({ logs }: RawLogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-neutral-900/50 rounded-2xl border border-slate-200 dark:border-neutral-800 text-center">
        <p className="text-xs text-slate-500 font-medium italic">저장된 원본 트래킹 로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Database className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          External API Raw Logs ({logs.length})
        </h3>
      </div>

      <div className="space-y-2">
        {logs.map((log) => {
          const isExpanded = expandedId === log.id;
          
          return (
            <div 
              key={log.id}
              className={`group transition-all duration-300 border rounded-2xl overflow-hidden ${
                isExpanded 
                  ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-900/5 shadow-lg' 
                  : 'border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-950'
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isExpanded ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-neutral-900 text-slate-500'
                  }`}>
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {log.provider_name}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 text-[10px] rounded font-mono">
                        {log.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), "HH:mm:ss (yyyy.MM.dd)")}
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Body: JSON View */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <pre className="p-4 bg-slate-900 dark:bg-black rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed text-blue-300 scrollbar-hide">
                      <code>{JSON.stringify(log.raw_data, null, 2)}</code>
                    </pre>
                    <div className="absolute top-2 right-2 flex gap-2">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(log.raw_data, null, 2));
                          // toast can be added here if available
                        }}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/50 hover:text-white transition-colors"
                        title="Copy to clipboard"
                       >
                         <ExternalLink className="w-3 h-3" />
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
