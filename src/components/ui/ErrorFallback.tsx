"use client";

import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ZenCard, ZenButton } from './ZenUI';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again."
}) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <ZenCard className="max-w-lg w-full p-10 text-center border-red-100/50">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 border border-red-100">
            <AlertCircle size={40} strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-3">{title}</h2>
        <p className="text-slate-500 mb-8">{message}</p>

        {error.digest && (
          <p className="text-[10px] font-mono text-slate-300 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-4">
          <ZenButton variant="tactile" onClick={() => reset()}>
            <RefreshCcw size={18} />
            Try Again
          </ZenButton>
        </div>
      </ZenCard>
    </div>
  );
};
