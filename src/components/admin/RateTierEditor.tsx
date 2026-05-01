'use client';

import React from 'react';
import { ZenInput, ZenButton } from '@/components/ui/ZenUI';
import { Plus, Trash2, Hash, DollarSign, Weight } from 'lucide-react';

export interface RateTier {
  id?: string;
  weight_min: number;
  unit_price: number;
}

interface RateTierEditorProps {
  tiers: RateTier[];
  onChange: (tiers: RateTier[]) => void;
}

export const RateTierEditor: React.FC<RateTierEditorProps> = ({ tiers, onChange }) => {
  const addTier = () => {
    onChange([...tiers, { weight_min: 0, unit_price: 0 }]);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof RateTier, value: number) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    onChange(newTiers);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Weight className="w-3 h-3 text-blue-500" /> Weight Slab Configuration
        </h4>
        <ZenButton 
          onClick={addTier} 
          variant="ghost" 
          className="text-[10px] text-blue-600 hover:text-blue-300 py-1"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Tier
        </ZenButton>
      </div>

      <div className="space-y-3">
        {tiers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-300 text-xs italic">
            No tiers defined. Base rate will apply for all weights.
          </div>
        ) : (
          tiers.sort((a, b) => a.weight_min - b.weight_min).map((tier, index) => (
            <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Min Weight (kg)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <ZenInput 
                    type="number" 
                    value={tier.weight_min}
                    onChange={(e) => updateTier(index, 'weight_min', Number(e.target.value))}
                    className="pl-12 bg-slate-50 border-slate-300 text-slate-900"
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Unit Price ($/kg)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                  <ZenInput 
                    type="number" 
                    value={tier.unit_price}
                    onChange={(e) => updateTier(index, 'unit_price', Number(e.target.value))}
                    className="pl-12 bg-slate-50 border-slate-300 text-emerald-600 font-bold"
                  />
                </div>
              </div>

              <ZenButton 
                onClick={() => removeTier(index)}
                variant="ghost"
                className="p-3 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </ZenButton>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
