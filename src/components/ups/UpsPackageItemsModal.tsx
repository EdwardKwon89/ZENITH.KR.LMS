'use client';

import React, { useState } from 'react';
import { Package, X, FileText, Layers } from 'lucide-react';

interface PackageItem {
  id?: string;
  item_name: string;
  hs_code?: string | null;
  quantity: number;
  unit_price?: number | null;
  currency?: string | null;
}

interface PackageData {
  id?: string;
  domestic_ref_no?: string | null;
  intl_ref_no?: string | null;
  gross_weight?: number | null;
  net_weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  items: PackageItem[];
}

interface UpsPackageItemsModalProps {
  packages: PackageData[];
}

export default function UpsPackageItemsModal({ packages }: UpsPackageItemsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalItemsCount = packages.reduce((sum, pkg) => sum + (pkg.items?.length || 0), 0);
  const totalQuantity = packages.reduce(
    (sum, pkg) => sum + pkg.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
    0
  );
  const totalAmountUsd = packages.reduce(
    (sum, pkg) =>
      sum + pkg.items.reduce((itemSum, item) => itemSum + (item.quantity || 0) * (item.unit_price || 0), 0),
    0
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-200 dark:border-zinc-700 shadow-xs"
      >
        <Layers className="w-3.5 h-3.5 text-amber-500" />
        <span>품목 정보 보기 ({totalItemsCount}개 품목)</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    배송 화물 품목 상세 정보 (Package Items)
                  </h3>
                  <p className="text-xs text-slate-400">
                    오더에 등록된 전체 패키지별 상세 품목 내역입니다.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {packages.length === 0 || totalItemsCount === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  등록된 품목 정보가 없습니다.
                </div>
              ) : (
                packages.map((pkg, pkgIdx) => (
                  <div
                    key={pkg.id || pkgIdx}
                    className="bg-slate-50/50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-zinc-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-amber-500" />
                        패키지 #{pkgIdx + 1} {pkg.domestic_ref_no ? `(${pkg.domestic_ref_no})` : ''}
                      </span>
                      <span className="text-slate-400 font-mono">
                        중량: {pkg.gross_weight || 0} kg | 규격: {pkg.length && pkg.width && pkg.height ? `${pkg.length}x${pkg.width}x${pkg.height} cm` : 'N/A'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-zinc-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">품명 (Description)</th>
                            <th className="py-2 px-3 font-mono">HS 코드</th>
                            <th className="py-2 px-3 text-right font-mono">수량</th>
                            <th className="py-2 px-3 text-right font-mono">단가 (USD)</th>
                            <th className="py-2 px-3 text-right font-mono">합계 (USD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {(pkg.items || []).map((item, itemIdx) => {
                            const amount = (item.quantity || 0) * (item.unit_price || 0);
                            return (
                              <tr key={item.id || itemIdx} className="hover:bg-slate-100/50 dark:hover:bg-zinc-900/60">
                                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{itemIdx + 1}</td>
                                <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{item.item_name}</td>
                                <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{item.hs_code || '-'}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold">{item.quantity}</td>
                                <td className="py-2 px-3 text-right font-mono">${(item.unit_price || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                  ${amount.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Summary */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                <span>총 수량: <strong className="text-slate-900 dark:text-white font-mono">{totalQuantity}개</strong></span>
                <span>총 신고 금액: <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold">${totalAmountUsd.toFixed(2)} USD</strong></span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
