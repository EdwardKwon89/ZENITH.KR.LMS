'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getWalletBalance, getWalletTransactions, requestRefund } from '@/app/actions/wallet';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCcw, History } from 'lucide-react';

export function WalletDashboard() {
  const t = useTranslations('Wallet');
  const [balanceData, setBalanceData] = useState<{ balance: number; currency: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const balance = await getWalletBalance();
      const txs = await getWalletTransactions(10);
      setBalanceData(balance);
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefundRequest = async () => {
    const amountStr = prompt(t('refund') + " - " + t('balance') + ": " + balanceData?.balance);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const res = await requestRefund(amount, "User requested refund from UI");
      if (res.success) {
        alert(t('success_refund_request'));
        fetchData();
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const columns: any[] = [
    { 
      header: t('date') || 'Date', 
      accessorKey: 'created_at', 
      cell: ({ getValue }: any) => new Date(getValue()).toLocaleString() 
    },
    { 
      header: t('type') || 'Type', 
      accessorKey: 'type', 
      cell: ({ getValue }: any) => <span className="font-semibold">{t(`type_${getValue().toLowerCase()}`)}</span> 
    },
    { 
      header: t('amount') || 'Amount', 
      accessorKey: 'amount', 
      cell: ({ row }: any) => {
        const val = row.original.amount;
        return (
          <span className={row.original.type === 'TOP_UP' ? 'text-green-600' : 'text-red-600'}>
            {row.original.type === 'TOP_UP' ? '+' : '-'}{val.toLocaleString()} {balanceData?.currency}
          </span>
        );
      }
    },
    { 
      header: t('status') || 'Status', 
      accessorKey: 'status', 
      cell: ({ getValue }: any) => {
        const val = getValue();
        return (
          <span className={`px-2 py-1 rounded text-xs ${
            val === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
            val === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {t(`status_${val.toLowerCase()}`)}
          </span>
        );
      }
    },
    { 
      header: t('description') || 'Description', 
      accessorKey: 'description' 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between h-48 transform hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{t('balance')}</p>
            <h2 className="text-4xl font-bold mt-1">
              {balanceData ? balanceData.balance.toLocaleString() : '0.00'} <span className="text-xl font-normal opacity-80">{balanceData?.currency || 'USD'}</span>
            </h2>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <button 
            disabled 
            className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all opacity-60 cursor-not-allowed"
          >
            <div className="bg-green-100 p-3 rounded-full mb-3">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <span className="font-semibold text-gray-800">{t('topup')}</span>
            <p className="text-xs text-gray-500 mt-1">Admin Only</p>
          </button>

          <button 
            onClick={handleRefundRequest}
            className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all"
          >
            <div className="bg-orange-100 p-3 rounded-full mb-3">
              <ArrowDownLeft className="w-6 h-6 text-orange-600" />
            </div>
            <span className="font-semibold text-gray-800">{t('refund')}</span>
            <p className="text-xs text-gray-500 mt-1">Request to Admin</p>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-800">{t('transactions')}</h3>
        </div>
        <div className="p-0">
          <ZenDataGrid 
            data={transactions} 
            columns={columns} 
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
