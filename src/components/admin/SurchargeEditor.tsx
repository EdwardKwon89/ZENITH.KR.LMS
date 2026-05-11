'use client';

import React from 'react';
import { ZenInput, ZenButton, ZenSelect } from '@/components/ui/ZenUI';
import { Plus, Trash2, Tag, Percent, DollarSign, Type } from 'lucide-react';

export interface Surcharge {
  id?: string;
  surcharge_type: 'FSC' | 'SSC' | 'THC' | 'DG' | 'PEAK' | 'CUSTOM';
  calc_type: 'PERCENT' | 'FIXED';
  amount: number;
  currency: string;
  description?: string;
}

interface SurchargeEditorProps {
  surcharges: Surcharge[];
  onChange: (surcharges: Surcharge[]) => void;
}

const SURCHARGE_TYPES = [
  { value: 'FSC', label: 'Fuel Surcharge (FSC)' },
  { value: 'SSC', label: 'Security Surcharge (SSC)' },
  { value: 'THC', label: 'Terminal Handling (THC)' },
  { value: 'DG', label: 'Dangerous Goods (DG)' },
  { value: 'PEAK', label: 'Peak Season Surcharge' },
  { value: 'CUSTOM', label: 'Custom Surcharge' },
];

const CALC_TYPES = [
  { value: 'PERCENT', label: 'Percentage (%)' },
  { value: 'FIXED', label: 'Fixed Amount ($)' },
];

export const SurchargeEditor: React.FC<SurchargeEditorProps> = ({ surcharges, onChange }) => {
  const addSurcharge = () => {
    onChange([...surcharges, { 
      surcharge_type: 'FSC', 
      calc_type: 'PERCENT', 
      amount: 0, 
      currency: 'USD' 
    }]);
  };

  const removeSurcharge = (index: number) => {
    onChange(surcharges.filter((_, i) => i !== index));
  };

  const updateSurcharge = (index: number, field: keyof Surcharge, value: any) => {
    const newSurcharges = [...surcharges];
    newSurcharges[index] = { ...newSurcharges[index], [field]: value };
    onChange(newSurcharges);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Tag className="w-3 h-3 text-emerald-500" /> Surcharge & Fee Configuration
        </h4>
        <ZenButton 
          onClick={addSurcharge} 
          variant="ghost" 
          className="text-[10px] text-emerald-600 hover:text-emerald-700 py-1"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Fee
        </ZenButton>
      </div>

      <div className="space-y-3">
        {surcharges.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-300 text-xs italic">
            No surcharges defined for this rate card.
          </div>
        ) : (
          surcharges.map((s, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
              <div className="col-span-4 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Fee Type</label>
                <ZenSelect
                  value={s.surcharge_type}
                  onValueChange={(val) => updateSurcharge(index, 'surcharge_type', val)}
                  options={SURCHARGE_TYPES}
                  className="bg-white border-slate-300"
                />
              </div>
              
              <div className="col-span-3 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Calculation</label>
                <ZenSelect
                  value={s.calc_type}
                  onValueChange={(val) => updateSurcharge(index, 'calc_type', val)}
                  options={CALC_TYPES}
                  className="bg-white border-slate-300"
                />
              </div>

              <div className="col-span-4 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Amount</label>
                <div className="relative">
                  {s.calc_type === 'PERCENT' ? (
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                  ) : (
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                  )}
                  <ZenInput 
                    type="number" 
                    value={s.amount}
                    onChange={(e) => updateSurcharge(index, 'amount', Number(e.target.value))}
                    className="pl-12 bg-white border-slate-300 text-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div className="col-span-1 flex justify-center">
                <ZenButton 
                  onClick={() => removeSurcharge(index)}
                  variant="ghost"
                  className="p-3 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </ZenButton>
              </div>

              {s.surcharge_type === 'CUSTOM' && (
                <div className="col-span-12 mt-2 space-y-2 animate-in fade-in slide-in-from-left-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Custom Description</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <ZenInput 
                      placeholder="Enter specific fee description..."
                      value={s.description || ''}
                      onChange={(e) => updateSurcharge(index, 'description', e.target.value)}
                      className="pl-12 bg-white border-slate-300 text-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
