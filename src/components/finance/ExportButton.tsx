"use client";

import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  shipperId?: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  status,
  dateFrom,
  dateTo,
  shipperId,
  className = ""
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (shipperId) params.append("shipperId", shipperId);

      const response = await fetch(`/api/finance/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from header if possible
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `settlement_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        fileName = contentDisposition.split('filename=')[1].split(';')[0];
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('엑셀 파일이 성공적으로 생성되었습니다.');
    } catch (error: any) {
      console.error("[FIN-02] Export Error:", error);
      toast.error(`엑셀 내보내기 실패: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className={`px-6 py-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {isExporting ? 'Exporting...' : 'Export Report'}
    </button>
  );
};
