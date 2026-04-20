"use client";

import React, { useState, useEffect } from 'react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';

interface OverrideRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentSnapshot: any;
  onSubmit: (data: { baseAmount: number; currency: string; reason: string }) => Promise<void>;
}

export const OverrideRateModal: React.FC<OverrideRateModalProps> = ({
  isOpen,
  onClose,
  currentSnapshot,
  onSubmit
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentSnapshot) {
      setAmount(currentSnapshot.baseAmount?.toString() || '');
      setCurrency(currentSnapshot.currency || 'USD');
      setReason('');
    }
  }, [isOpen, currentSnapshot]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        baseAmount: Number(amount),
        currency,
        reason
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <ZenCard className="relative w-full max-w-lg shadow-2xl p-0 overflow-hidden" hoverEffect={false}>
        <div className="p-6 border-b border-white/20">
          <h3 className="text-xl font-bold text-slate-800">Override Rate</h3>
          <p className="text-sm text-slate-500 mt-1">Manual adjustment of the applied rate for the specific order.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Base Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select 
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="bg-slate-50/50 backdrop-blur-sm border border-white/20 px-3 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 text-sm font-medium w-24"
                >
                  <option value="USD">USD</option>
                  <option value="KRW">KRW</option>
                  <option value="EUR">EUR</option>
                </select>
                <ZenInput
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Override Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Please explicitly state the reason for manual rate override..."
                className="w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all resize-none text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">This context will be recorded in audit logs.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/20 mt-6">
            <ZenButton 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="text-sm px-4 py-2"
              disabled={isSubmitting}
            >
              Cancel
            </ZenButton>
            <ZenButton 
              type="submit" 
              variant="tactile"
              className="text-sm px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity border-none shadow-md shadow-blue-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Apply Override'}
            </ZenButton>
          </div>
        </form>
      </ZenCard>
    </div>
  );
};
