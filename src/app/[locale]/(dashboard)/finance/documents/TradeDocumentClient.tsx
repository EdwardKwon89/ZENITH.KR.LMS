"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  Search, 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  AlertCircle,
  Package,
  User,
  MapPin
} from "lucide-react";
import { getOrderDocumentData } from "@/app/actions/finance";
import { ZenButton, ZenInput, ZenCard } from "@/components/ui/ZenUI";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic import for PDF components to avoid SSR issues
const CommercialInvoicePDF = dynamic(() => import("@/components/documents/CommercialInvoicePDF"), { ssr: false });
const PackingListPDF = dynamic(() => import("@/components/documents/PackingListPDF"), { ssr: false });
const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFDownloadLink), { ssr: false });

export default function TradeDocumentClient({ locale }: { locale: string }) {
  const t = useTranslations("Documents");
  const [orderNo, setOrderNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNo.trim()) return;

    setLoading(true);
    try {
      const data = await getOrderDocumentData(orderNo.trim());
      setOrderData(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t("error_fetch"));
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map order data to PDF props
  const getCIData = () => {
    if (!orderData) return {
      invoice_no: "",
      date: "",
      shipper: { name: "", address: "" },
      consignee: { name: "", address: "" },
      order_no: "",
      items: [],
      total_amount: 0,
      currency: "USD"
    };
    return {
      invoice_no: `INV-${orderData.order_no}`,
      date: new Date().toISOString().split('T')[0],
      shipper: {
        name: orderData.shipper?.name || "ZENITH LOGISTICS",
        address: orderData.shipper?.address || "Seoul, Korea"
      },
      consignee: {
        name: orderData.recipient_name || "VALUED CUSTOMER",
        address: orderData.recipient_address || "TBD"
      },
      order_no: orderData.order_no,
      items: orderData.packages.flatMap((pkg: any) => 
        pkg.items.map((item: any) => ({
          description: item.item_name,
          hs_code: item.hs_code || "0000.00.0000",
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          amount: (item.quantity || 0) * (item.unit_price || 0)
        }))
      ),
      total_amount: orderData.packages.reduce((acc: number, pkg: any) => 
        acc + pkg.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0), 0
      ),
      currency: "USD"
    };
  };

  const getPLData = () => {
    if (!orderData) return {
      pl_no: "",
      date: "",
      shipper: { name: "", address: "" },
      consignee: { name: "", address: "" },
      order_no: "",
      items: [],
      total_pkgs: 0,
      total_net_weight: 0,
      total_gross_weight: 0
    };
    return {
      pl_no: `PL-${orderData.order_no}`,
      date: new Date().toISOString().split('T')[0],
      shipper: {
        name: orderData.shipper?.name || "ZENITH LOGISTICS",
        address: orderData.shipper?.address || "Seoul, Korea"
      },
      consignee: {
        name: orderData.recipient_name || "VALUED CUSTOMER",
        address: orderData.recipient_address || "TBD"
      },
      order_no: orderData.order_no,
      items: orderData.packages.map((pkg: any) => ({
        description: pkg.package_no || "Package",
        quantity: pkg.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        pkgs: 1,
        net_weight: pkg.net_weight || 0,
        gross_weight: pkg.gross_weight || 0
      })),
      total_pkgs: orderData.packages.length,
      total_net_weight: orderData.packages.reduce((sum: number, pkg: any) => sum + (pkg.net_weight || 0), 0),
      total_gross_weight: orderData.packages.reduce((sum: number, pkg: any) => sum + (pkg.gross_weight || 0), 0)
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("description")}</p>
        </div>
      </div>

      {/* Search Section */}
      <ZenCard className="border-none shadow-premium-sm bg-gradient-to-br from-white to-slate-50 p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <ZenInput 
              placeholder={t("search_placeholder")}
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              className="pl-10 h-12 border-slate-200 focus:ring-brand-500 rounded-xl"
            />
          </div>
          <ZenButton 
            type="submit" 
            loading={loading}
            className="h-12 px-8 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-200 transition-all active:scale-95"
          >
            {t("search_button")}
          </ZenButton>
        </form>
      </ZenCard>

      {/* Results Section */}
      {orderData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Order Summary Card */}
          <ZenCard className="lg:col-span-1 border-slate-100 shadow-premium-sm p-6">
            <div className="border-b border-slate-50 pb-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Package className="w-5 h-5 text-brand-500" />
                {orderData.order_no}
              </h2>
              <p className="text-sm text-slate-500">
                {new Date(orderData.created_at).toLocaleDateString(locale)}
              </p>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Shipper</p>
                    <p className="text-sm font-semibold text-slate-700">{orderData.shipper?.name || "Unknown"}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Route</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {orderData.origin_port?.port_name} → {orderData.dest_port?.port_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                <span className="text-slate-500">Total Items</span>
                <span className="font-bold text-slate-900">
                  {orderData.packages.reduce((acc: number, p: any) => acc + p.items.length, 0)} Items
                </span>
              </div>
            </div>
          </ZenCard>

          {/* Document Generation Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* CI Card */}
            <ZenCard className="border-none bg-brand-50/50 shadow-sm overflow-hidden relative group p-6">
              <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <FileText className="w-24 h-24" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("ci")}</h3>
                    <p className="text-sm text-slate-500">Commercial Invoice Generation</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <PDFDownloadLink 
                    document={<CommercialInvoicePDF data={getCIData()} />} 
                    fileName={`CI_${orderData.order_no}.pdf`}
                  >
                    {({ loading: pdfLoading }) => (
                      <ZenButton 
                        variant="glass" 
                        disabled={pdfLoading}
                        className="bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl px-6 gap-2 h-11"
                      >
                        {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {t("download")}
                      </ZenButton>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </ZenCard>

            {/* PL Card */}
            <ZenCard className="border-none bg-emerald-50/50 shadow-sm overflow-hidden relative group p-6">
              <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Package className="w-24 h-24" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("pl")}</h3>
                    <p className="text-sm text-slate-500">Packing List Generation</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <PDFDownloadLink 
                    document={<PackingListPDF data={getPLData()} />} 
                    fileName={`PL_${orderData.order_no}.pdf`}
                  >
                    {({ loading: pdfLoading }) => (
                      <ZenButton 
                        variant="glass" 
                        disabled={pdfLoading}
                        className="bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl px-6 gap-2 h-11"
                      >
                        {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {t("download")}
                      </ZenButton>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </ZenCard>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!orderData && !loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <div>
            <p className="text-slate-500 font-medium">{t("select_order")}</p>
            <p className="text-slate-400 text-sm">{t("description")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
