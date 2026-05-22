"use client";

import React, { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ZenButton } from '@/components/ui/ZenUI';

interface ExportButtonProps {
  data?: any[];
  filename?: string;
  type?: 'REVENUE' | 'COST' | 'SETTLEMENT';
  className?: string;
}

export default function ExportButton({
  data,
  filename = 'report',
  type = 'REVENUE',
  className = ""
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('내보낼 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/finance/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, filename, type }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);

      toast.success('Excel file generated successfully.');
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <ZenButton 
      onClick={handleExport}
      disabled={isExporting}
      variant="glass"
      className={className}
      data-action="export-finance"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      ) : (
        <Download className="w-4 h-4 text-blue-600" />
      )}
      <span className="text-blue-700 font-bold">
        {isExporting ? 'Preparing...' : 'Export Excel'}
      </span>
    </ZenButton>
  );
}
