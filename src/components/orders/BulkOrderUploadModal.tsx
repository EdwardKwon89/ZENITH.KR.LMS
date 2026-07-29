"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { ZenButton } from '@/components/ui/ZenUI';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { bulkCreateOrders, generateBulkOrderTemplate, BulkOrderResult } from '@/app/actions/operations/bulk-orders';
import { logger } from '@/lib/logger';

interface BulkOrderUploadModalProps {
  onClose: () => void;
}

type Step = 'select' | 'preview' | 'result';

interface ParsedSheets {
  orders: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  items: Record<string, unknown>[];
}

export default function BulkOrderUploadModal({ onClose }: BulkOrderUploadModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [sheets, setSheets] = useState<ParsedSheets | null>(null);
  const [results, setResults] = useState<BulkOrderResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateDownload = useCallback(async () => {
    try {
      const base64 = await generateBulkOrderTemplate();
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArr = new Uint8Array(byteNums);
      const blob = new Blob([byteArr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_order_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('템플릿 다운로드 완료');
    } catch (err: any) {
      toast.error('템플릿 다운로드 실패: ' + err.message);
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      const sheetNames = wb.SheetNames;
      const findSheet = (keyword: string) => sheetNames.find((n) => n.includes(keyword));
      const orderSheetName = findSheet('오더') || findSheet('Order') || sheetNames[0];
      const pkgSheetName = findSheet('패키지') || findSheet('Package') || sheetNames[1];
      const itemSheetName = findSheet('아이템') || findSheet('Item') || sheetNames[2];

      if (!orderSheetName || !pkgSheetName || !itemSheetName) {
        toast.error('엑셀 파일에 오더/패키지/아이템 시트가 모두 필요합니다.');
        return;
      }

      const rawOrders = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[orderSheetName]);
      const rawPackages = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[pkgSheetName]);
      const rawItems = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[itemSheetName]);

      if (rawOrders.length === 0) {
        toast.error('오더 시트에 데이터가 없습니다.');
        return;
      }

      setSheets({ orders: rawOrders, packages: rawPackages, items: rawItems });
      setStep('preview');
    } catch (err: any) {
      toast.error('파일 파싱 실패: ' + err.message);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sheets) return;
    setIsSubmitting(true);
    try {
      const { results: res } = await bulkCreateOrders(sheets);
      setResults(res);
      setStep('result');
      const successCount = res.filter((r) => r.success).length;
      const failCount = res.filter((r) => !r.success).length;
      if (failCount === 0) {
        toast.success(`전체 ${successCount}건 성공`);
      } else {
        toast.warning(`${successCount}건 성공, ${failCount}건 실패`);
      }
    } catch (err: any) {
      toast.error('등록 실패: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [sheets]);

  const handleResultDownload = useCallback(() => {
    const rows = results.map((r) => ({
      'order_seq': r.orderSeq,
      '성공': r.success ? 'Y' : 'N',
      '오더ID': r.orderId || '',
      '오더번호': r.orderNo || '',
      '오류사유': r.error || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '결과');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_order_result.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-slate-50/50 dark:bg-neutral-800/30 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet size={24} className="text-brand-600" />
              엑셀 일괄등록
            </h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
              {step === 'select' && '템플릿을 다운로드하고 데이터를 채워 업로드하세요.'}
              {step === 'preview' && '업로드된 데이터를 확인하고 등록하세요.'}
              {step === 'result' && '등록 결과입니다.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'select' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-6 border border-slate-100 dark:border-neutral-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">시트 구성 안내</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>• <strong>오더(Order)</strong>: 1행 = 1오더, order_seq는 고유 식별자</li>
                  <li>• <strong>패키지(Package)</strong>: 1행 = 1패키지, order_seq로 오더에 연결</li>
                  <li>• <strong>아이템(Item)</strong>: 1행 = 1아이템, package_seq로 패키지에 연결</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <ZenButton onClick={handleTemplateDownload} className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Download size={16} />
                  템플릿 다운로드
                </ZenButton>
                <ZenButton onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Upload size={16} />
                  엑셀 업로드
                </ZenButton>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {step === 'preview' && sheets && (
            <div className="space-y-4">
              <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                <span>오더 {sheets.orders.length}건</span>
                <span>·</span>
                <span>패키지 {sheets.packages.length}건</span>
                <span>·</span>
                <span>아이템 {sheets.items.length}건</span>
              </div>
              <div className="overflow-x-auto border border-slate-100 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-neutral-800/50 text-slate-500 font-semibold border-b border-slate-100 dark:border-neutral-800">
                    <tr>
                      <th className="py-2 px-3 text-left">order_seq</th>
                      <th className="py-2 px-3 text-left">order_type</th>
                      <th className="py-2 px-3 text-left">transport_mode</th>
                      <th className="py-2 px-3 text-left">recipient_name</th>
                      <th className="py-2 px-3 text-left">recipient_address</th>
                      <th className="py-2 px-3 text-left">패키지 수</th>
                      <th className="py-2 px-3 text-left">아이템 수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {sheets.orders.map((row, idx) => {
                      const orderSeq = row.order_seq;
                      const pkgs = sheets.packages.filter((p) => p.order_seq === orderSeq);
                      const totalItems = pkgs.reduce((sum, p) => sum + sheets.items.filter((it) => it.package_seq === p.package_seq).length, 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-neutral-900/40">
                          <td className="py-2 px-3 font-mono">{String(orderSeq)}</td>
                          <td className="py-2 px-3">{String(row.order_type || '')}</td>
                          <td className="py-2 px-3">{String(row.transport_mode || '')}</td>
                          <td className="py-2 px-3">{String(row.recipient_name || '')}</td>
                          <td className="py-2 px-3 max-w-[200px] truncate">{String(row.recipient_address || '')}</td>
                          <td className="py-2 px-3">{pkgs.length}</td>
                          <td className="py-2 px-3">{totalItems}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{results.filter((r) => r.success).length}</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">성공</div>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-950/20 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 text-center">
                  <div className="text-2xl font-bold text-red-600">{results.filter((r) => !r.success).length}</div>
                  <div className="text-xs text-red-600 font-semibold mt-1">실패</div>
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-100 dark:border-neutral-800 rounded-xl max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-neutral-800/50 text-slate-500 font-semibold border-b border-slate-100 dark:border-neutral-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">order_seq</th>
                      <th className="py-2 px-3 text-left">결과</th>
                      <th className="py-2 px-3 text-left">오더번호</th>
                      <th className="py-2 px-3 text-left">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {results.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-neutral-900/40">
                        <td className="py-2 px-3 font-mono">{String(r.orderSeq)}</td>
                        <td className="py-2 px-3">
                          {r.success ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 size={14} /> 성공
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                              <AlertCircle size={14} /> 실패
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono">{r.orderNo || '-'}</td>
                        <td className="py-2 px-3 text-slate-500">{r.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ZenButton onClick={handleResultDownload} className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                <Download size={16} />
                결과 엑셀 다운로드
              </ZenButton>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-neutral-800/50 border-t border-slate-100 dark:border-neutral-800 flex gap-3 shrink-0">
          {step === 'select' && (
            <ZenButton variant="ghost" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold">
              취소
            </ZenButton>
          )}
          {step === 'preview' && (
            <>
              <ZenButton variant="ghost" onClick={() => setStep('select')} className="flex-1 py-3 rounded-2xl font-bold">
                다시 선택
              </ZenButton>
              <ZenButton
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? '등록 중...' : '등록'}
              </ZenButton>
            </>
          )}
          {step === 'result' && (
            <ZenButton onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold">
              닫기
            </ZenButton>
          )}
        </div>
      </motion.div>
    </div>
  );
}
