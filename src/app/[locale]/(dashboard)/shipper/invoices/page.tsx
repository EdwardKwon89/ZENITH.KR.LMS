"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ZenCard, ZenBadge, ZenInput } from "@/components/ui/ZenUI";
import { getShipperInvoices } from "@/app/actions/finance/shipper-invoices";
import { Package, Search, Loader2, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShipperInvoicesPage({ locale }: { locale: string }) {
  const t = useTranslations("ShipperInvoices");

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await getShipperInvoices(params);
      setInvoices(data);
    } catch (err: any) {
      toast.error(err.message || "청구서 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = search.trim()
    ? invoices.filter((inv) => inv.invoice_no?.toLowerCase().includes(search.toLowerCase()))
    : invoices;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNPAID":
        return <ZenBadge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">미결제</ZenBadge>;
      case "PARTIAL":
        return <ZenBadge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">부분결제</ZenBadge>;
      case "PAID":
        return <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">결제완료</ZenBadge>;
      case "OVERDUE":
        return <ZenBadge className="bg-red-50 text-red-700 border-red-200 text-[10px]">연체</ZenBadge>;
      case "CANCELED":
        return <ZenBadge className="bg-slate-50 text-slate-400 border-slate-200 text-[10px]">취소</ZenBadge>;
      default:
        return <ZenBadge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">{status}</ZenBadge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency || "KRW",
    }).format(amount || 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <ZenCard className="p-6 bg-white/70 backdrop-blur-md border-slate-100 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {t("title")}
            </h1>
            <p className="text-xs text-slate-500">
              {invoices.length}건의 청구서가 있습니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <ZenInput
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white/70"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white/70"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white/70"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
          >
            {t("search_btn")}
          </button>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-xs font-semibold">로딩 중...</span>
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {invoice.invoice_no}
                      </span>
                      {getStatusBadge(invoice.status)}
                      {invoice.is_finalized && (
                        <ZenBadge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">확정</ZenBadge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(invoice.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">{invoice.currency}</p>
                  </div>
                </div>
                {invoice.metadata && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    {invoice.metadata.order_no && <span>오더: {invoice.metadata.order_no}</span>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <Package size={36} className="text-slate-300 mb-3" />
              <p className="text-xs font-semibold">
                {search.trim() ? "검색 결과가 없습니다." : "청구서가 없습니다."}
              </p>
            </div>
          )}
        </div>
      </ZenCard>
    </div>
  );
}
