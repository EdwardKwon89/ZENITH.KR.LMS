"use client";

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileDown, Loader2 } from 'lucide-react';

interface DocumentDownloadButtonProps {
  document: React.ReactElement;
  fileName: string;
  label: string;
  className?: string;
}

export default function DocumentDownloadButton({
  document,
  fileName,
  label,
  className = ""
}: DocumentDownloadButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  // PDFDownloadLink should only be rendered on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <button 
        disabled
        className={`flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        {label}
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={document as any}
      fileName={fileName}
      className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors shadow-sm ${className}`}
    >
      {({ loading }) => (
        <>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 text-blue-500" />
          )}
          {loading ? 'Preparing...' : label}
        </>
      )}
    </PDFDownloadLink>
  );
}
