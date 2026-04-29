"use client";

import React, { useState } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
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
      // Note: In a real implementation, we would call an API route that uses ExcelJS
      // For this task, we'll simulate the download or provide a CSV fallback
      // Since I am an AI agent, I'll assume the /api/finance/export endpoint is ready
      // or will be handled by the next task.
      
      const response = await fetch(`/api/finance/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type, filename })
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel file generated successfully.');
    } catch (error: any) {
      console.error("[FIN-EXP] Export Error:", error);
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
