'use client';

import Link from 'next/link';

interface OrderDataTableProps {
  orders: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  locale: string;
}

export default function OrderDataTable({ 
  orders, 
  totalCount, 
  currentPage, 
  pageSize, 
  locale 
}: OrderDataTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      REGISTERED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      CONFIRMED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    return styles[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Order No</th>
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Shipper</th>
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Route (Origin-Dest)</th>
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-white/30 italic">
                  No orders found. Use the filters to refine your search.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium group-hover:text-blue-400 transition-colors">{order.order_no}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white/70">{order.order_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white/80 font-medium">{order.shipper?.name || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span className="text-white/90">{order.origin_port?.code}</span>
                      <span className="text-white/30">→</span>
                      <span className="text-white/90">{order.dest_port?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/${locale}/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-t border-white/5">
        <span className="text-xs text-white/40">
          Showing <span className="text-white/70">{orders.length}</span> of <span className="text-white/70">{totalCount}</span> results
        </span>
        
        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                currentPage === p 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
