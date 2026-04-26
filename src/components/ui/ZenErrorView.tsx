"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertCircle, RefreshCcw, Home, MessageSquare } from 'lucide-react';
import { ZenCard, ZenButton } from './ZenUI';

interface ZenErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

/**
 * 제니스 LMS 전용 프리미엄 에러 뷰 컴포넌트입니다.
 * 런타임 오류 발생 시 사용자에게 정돈된 안내와 복구 수단을 제공합니다.
 */
export const ZenErrorView: React.FC<ZenErrorViewProps> = ({ 
  error, 
  reset, 
  title = "System Interruption",
  message = "We encountered an unexpected issue while processing your request. Our engineering team has been notified."
}) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || "ko";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <ZenCard className="max-w-xl w-full p-12 text-center border-red-100/50 shadow-2xl shadow-red-500/5 bg-white/80 backdrop-blur-xl">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-400 blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 border border-red-100">
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">
          {title}
        </h2>
        
        <p className="text-slate-500 font-medium leading-relaxed mb-10 px-4">
          {message}
          {error.digest && (
            <span className="block mt-4 text-[10px] font-mono text-slate-300 uppercase tracking-widest">
              Error Digest: {error.digest}
            </span>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ZenButton 
            variant="tactile" 
            onClick={() => reset()}
            className="w-full h-14 bg-slate-900 group"
          >
            <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            Try Reconnecting
          </ZenButton>
          
          <ZenButton 
            variant="ghost" 
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="w-full h-14 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Home size={20} />
            Back to Home
          </ZenButton>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-6 text-slate-400">
          <button className="text-xs font-bold hover:text-slate-600 transition-colors flex items-center gap-2">
            <MessageSquare size={14} /> Contact Support
          </button>
          <div className="w-1 h-1 bg-slate-200 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Zenith Infrastructure Alpha</span>
        </div>
      </ZenCard>
    </div>
  );
};
