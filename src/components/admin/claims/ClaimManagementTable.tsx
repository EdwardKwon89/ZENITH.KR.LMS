"use client";
import { logger } from '@/lib/logger';

import React, { useState } from 'react';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { ZenBadge, ZenButton } from '@/components/ui/ZenUI';
import { ColumnDef } from '@tanstack/react-table';
import { Claim, ClaimStatus } from '@/types/claims';
import { format } from 'date-fns';
import { Edit3, PlusCircle, ExternalLink, Info, FileText } from 'lucide-react';
import { ClaimStatusModal } from './ClaimStatusModal';
import { IncidentFeeModal } from './IncidentFeeModal';
import { getClaimDetails } from '@/app/actions/claims';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import CommercialInvoicePDF from '@/components/documents/CommercialInvoicePDF';
import PackingListPDF from '@/components/documents/PackingListPDF';
import DocumentDownloadButton from '@/components/documents/DocumentDownloadButton';

interface ClaimManagementTableProps {
  initialClaims: any[];
}

export const ClaimManagementTable: React.FC<ClaimManagementTableProps> = ({ initialClaims }) => {
  const t = useTranslations('Claims');
  const [claims, setClaims] = useState(initialClaims);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [claimDetail, setClaimDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusUpdate = (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (claim) {
      setSelectedClaimId(claimId);
      setClaimDetail(claim);
      setShowStatusModal(true);
    }
  };

  const handleAddFee = async (claimId: string) => {
    setIsLoading(true);
    try {
      const details = await getClaimDetails(claimId);
      setClaimDetail(details);
      setSelectedClaimId(claimId);
      setShowFeeModal(true);
    } catch (error) {
      logger.error("Failed to fetch claim details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    // In a real app, you'd re-fetch from server action
    // For now, let's just close modals. revalidatePath in server actions will handle page refresh.
    window.location.reload();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'INVESTIGATING': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  const getCIData = (claim: any) => {
    const order = claim.order || {};
    return {
      invoice_no: `INV-${order.order_no || 'PENDING'}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      shipper: {
        name: claim.shipper?.name || 'N/A',
        address: (claim.shipper?.metadata as any)?.address || 'N/A'
      },
      consignee: {
        name: order.recipient_name || 'N/A',
        address: order.recipient_address || 'N/A'
      },
      order_no: order.order_no || 'N/A',
      items: order.packages?.flatMap((pkg: any) => pkg.items || []).map((item: any) => ({
        description: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        amount: (item.quantity || 0) * (item.unit_price || 0)
      })) || [],
      total_amount: order.packages?.reduce((sum: number, pkg: any) => 
        sum + (pkg.items?.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0) || 0)
      , 0) || 0,
      currency: order.packages?.[0]?.items?.[0]?.currency || 'USD'
    };
  };

  const getPLData = (claim: any) => {
    const order = claim.order || {};
    const items = order.packages?.flatMap((pkg: any) => pkg.items || []).map((item: any) => ({
      description: item.item_name,
      quantity: item.quantity,
      pkgs: 1,
      net_weight: 0,
      gross_weight: 0
    })) || [];

    return {
      pl_no: `PL-${order.order_no || 'PENDING'}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      shipper: {
        name: claim.shipper?.name || 'N/A',
        address: (claim.shipper?.metadata as any)?.address || 'N/A'
      },
      consignee: {
        name: order.recipient_name || 'N/A',
        address: order.recipient_address || 'N/A'
      },
      order_no: order.order_no || 'N/A',
      items,
      total_pkgs: order.packages?.length || 0,
      total_net_weight: 0,
      total_gross_weight: 0
    };
  };

  const getCILabels = () => ({
    invoice_no: "Commercial Invoice",
    issue_date: "Issue Date",
    shipper: "Shipper",
    consignee: "Consignee",
    order_ref: "Order Ref.",
    item_desc: "Description",
    quantity: "Qty",
    unit_price: "Unit Price",
    sub_total: "Sub Total",
    total: "Total Amount",
    currency: "Currency",
    trade_terms: "Trade Terms",
    declaration: "Declaration",
    declaration_text: "The goods described herein are in full compliance with export regulations.",
    generated_on: "Generated on",
  });

  const getPLLabels = () => ({
    pl_no: "Packing List",
    issue_date: "Issue Date",
    shipper: "Shipper",
    consignee: "Consignee",
    order_ref: "Order Ref.",
    item_desc: "Description",
    qty: "Qty",
    pkgs: "Pkgs",
    net_weight: "Net W. (kg)",
    gross_weight: "Gross W. (kg)",
    total_pkgs: "Total Pkgs",
    transport_mode: "Transport Mode",
    express_air: "Express Air",
    remarks: "Remarks",
    remarks_text: "All weights are approximate.",
    generated_on: "Generated on",
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Order Info',
      accessorKey: 'order.order_no',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 tracking-tight">{row.original.order?.order_no}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {format(new Date(row.original.created_at), 'yyyy.MM.dd HH:mm')}
          </span>
        </div>
      )
    },
    {
      header: 'Shipper / Organization',
      accessorKey: 'shipper.name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">{row.original.shipper?.name}</span>
          <span className="text-[10px] text-slate-400 font-medium">ORG_ID: {row.original.org_id.slice(0, 8)}...</span>
        </div>
      )
    },
    {
      header: 'Reason',
      accessorKey: 'reason_code',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-[10px] font-black w-fit uppercase tracking-wider">
            {t(`reason_${row.original.reason_code.toLowerCase()}`)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-[150px]">
            {row.original.description}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <ZenBadge variant={getStatusVariant(row.original.status)} className="font-black text-[10px] px-3">
          {t(`status_${row.original.status.toLowerCase()}`)}
        </ZenBadge>
      )
    },
    {
      header: 'Financials',
      id: 'financials',
      cell: ({ row }) => {
        const fees = row.original.incident_fees || [];
        const totalFee = fees.reduce((sum: number, f: any) => sum + f.fee_amount, 0);
        return (
          <div className="flex flex-col">
            <span className={`font-black ${totalFee > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
              -${totalFee.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              {fees.length} Incident{fees.length !== 1 ? 's' : ''}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Documents',
      id: 'documents',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <DocumentDownloadButton 
            document={<CommercialInvoicePDF data={getCIData(row.original)} labels={getCILabels()} />}
            fileName={`CI_${row.original.order?.order_no}.pdf`}
            label="CI"
            className="px-2.5 py-1 h-8 text-[11px] font-black min-w-0 rounded-lg shadow-sm"
          />
          <DocumentDownloadButton 
            document={<PackingListPDF data={getPLData(row.original)} labels={getPLLabels()} />}
            fileName={`PL_${row.original.order?.order_no}.pdf`}
            label="PL"
            className="px-2.5 py-1 h-8 text-[11px] font-black min-w-0 rounded-lg shadow-sm"
          />
        </div>
      )
    },
    {
      header: 'Control',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ZenButton 
            variant="glass" 
            className="p-2 h-9 w-9 rounded-xl border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            onClick={() => handleStatusUpdate(row.original.id)}
          >
            <Edit3 size={16} className="text-slate-400 group-hover:text-blue-600" />
          </ZenButton>
          <ZenButton 
            variant="tactile" 
            className="p-2 h-9 w-9 rounded-xl bg-slate-100 border-none shadow-sm hover:bg-rose-500 group transition-all"
            onClick={() => handleAddFee(row.original.id)}
          >
            <PlusCircle size={16} className="text-rose-500 group-hover:text-white" />
          </ZenButton>
        </div>
      )
    }
  ];

  return (
    <div className="w-full">
      <ZenDataGrid 
        columns={columns} 
        data={claims} 
        title={t('title')}
        description="고객 클레임 현황을 확인하고 사고 비용을 처리합니다."
        loading={isLoading}
      />

      <AnimatePresence>
        {showStatusModal && claimDetail && (
          <ClaimStatusModal 
            claimId={selectedClaimId!}
            currentStatus={claimDetail.status}
            onClose={() => setShowStatusModal(false)}
            onSuccess={refreshData}
          />
        )}

        {showFeeModal && claimDetail && (
          <IncidentFeeModal 
            claimId={selectedClaimId!}
            invoices={claimDetail.order?.costs?.map((c: any) => c.invoice).filter(Boolean) || []}
            onClose={() => setShowFeeModal(false)}
            onSuccess={refreshData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
