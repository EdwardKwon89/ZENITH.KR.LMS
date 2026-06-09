'use client';

import React from 'react';
import { ZenInput, ZenButton } from '@/components/ui/ZenUI';
import { Plus, Trash2, Hash, DollarSign, Weight, Package } from 'lucide-react';

export interface WeightSlab {
  weight_min: number;
  unit_price: number;
  min_charge: number;
  max_charge?: number;
}

export interface CbmSlab {
  cbm_min: number;
  cbm_price: number;
  min_charge: number;
  max_charge?: number;
}

export interface RateTiers {
  weight_slabs: WeightSlab[];
  cbm_slabs: CbmSlab[];
}

interface RateTierEditorProps {
  tiers: RateTiers;
  onChange: (tiers: RateTiers) => void;
  currency?: string;
}

export const RateTierEditor: React.FC<RateTierEditorProps> = ({ tiers, onChange, currency = 'USD' }) => {
  const addWeightSlab = () => {
    onChange({
      ...tiers,
      weight_slabs: [...tiers.weight_slabs, { weight_min: 0, unit_price: 0, min_charge: 0 }],
    });
  };

  const removeWeightSlab = (index: number) => {
    onChange({
      ...tiers,
      weight_slabs: tiers.weight_slabs.filter((_, i) => i !== index),
    });
  };

  const updateWeightSlab = (index: number, field: keyof WeightSlab, value: number) => {
    const slabs = [...tiers.weight_slabs];
    slabs[index] = { ...slabs[index], [field]: value };
    onChange({ ...tiers, weight_slabs: slabs });
  };

  const addCbmSlab = () => {
    onChange({
      ...tiers,
      cbm_slabs: [...tiers.cbm_slabs, { cbm_min: 0, cbm_price: 0, min_charge: 0 }],
    });
  };

  const removeCbmSlab = (index: number) => {
    onChange({
      ...tiers,
      cbm_slabs: tiers.cbm_slabs.filter((_, i) => i !== index),
    });
  };

  const updateCbmSlab = (index: number, field: keyof CbmSlab, value: number) => {
    const slabs = [...tiers.cbm_slabs];
    slabs[index] = { ...slabs[index], [field]: value };
    onChange({ ...tiers, cbm_slabs: slabs });
  };

  const updateWeightSlabMaxCharge = (index: number, value: string) => {
    const slabs = [...tiers.weight_slabs];
    slabs[index] = { ...slabs[index], max_charge: value === '' ? undefined : Number(value) };
    onChange({ ...tiers, weight_slabs: slabs });
  };

  const updateCbmSlabMaxCharge = (index: number, value: string) => {
    const slabs = [...tiers.cbm_slabs];
    slabs[index] = { ...slabs[index], max_charge: value === '' ? undefined : Number(value) };
    onChange({ ...tiers, cbm_slabs: slabs });
  };

  return (
    <div className="space-y-8">
      {/* Weight Slabs Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Weight className="w-3 h-3 text-blue-500" /> Weight Slabs (무게 요율)
          </h4>
          <ZenButton
            onClick={addWeightSlab}
            variant="ghost"
            className="text-[10px] text-blue-600 hover:text-blue-700 py-1"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Slab
          </ZenButton>
        </div>

        <div className="space-y-3">
          {tiers.weight_slabs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-300 text-xs italic">
              No weight slabs defined. Add at least one weight slab.
            </div>
          ) : (
            [...tiers.weight_slabs]
              .sort((a, b) => a.weight_min - b.weight_min)
              .map((slab, index) => (
                <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Min (kg)</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <ZenInput
                        type="number"
                        value={slab.weight_min}
                        onChange={(e) => updateWeightSlab(index, 'weight_min', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Unit Price ({currency}/kg)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                      <ZenInput
                        type="number"
                        value={slab.unit_price}
                        onChange={(e) => updateWeightSlab(index, 'unit_price', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-emerald-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Min. Charge ({currency})</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <ZenInput
                        type="number"
                        value={slab.min_charge}
                        onChange={(e) => updateWeightSlab(index, 'min_charge', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-amber-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Max. Charge ({currency}, 선택)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/50" />
                      <ZenInput
                        type="number"
                        value={slab.max_charge ?? ''}
                        onChange={(e) => updateWeightSlabMaxCharge(index, e.target.value)}
                        className="pl-12 bg-slate-50 border-slate-300 text-red-500 font-bold"
                        placeholder="상한 없음"
                      />
                    </div>
                  </div>

                  <ZenButton
                    onClick={() => removeWeightSlab(index)}
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

      {/* CBM Slabs Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Package className="w-3 h-3 text-blue-500" /> CBM Slabs (부피 요율)
          </h4>
          <ZenButton
            onClick={addCbmSlab}
            variant="ghost"
            className="text-[10px] text-blue-600 hover:text-blue-700 py-1"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Slab
          </ZenButton>
        </div>

        <div className="space-y-3">
          {tiers.cbm_slabs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-300 text-xs italic">
              No CBM slabs defined. Add at least one CBM slab.
            </div>
          ) : (
            [...tiers.cbm_slabs]
              .sort((a, b) => a.cbm_min - b.cbm_min)
              .map((slab, index) => (
                <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Min (㎥)</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <ZenInput
                        type="number"
                        value={slab.cbm_min}
                        onChange={(e) => updateCbmSlab(index, 'cbm_min', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">CBM Price ({currency}/㎥)</label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                      <ZenInput
                        type="number"
                        value={slab.cbm_price}
                        onChange={(e) => updateCbmSlab(index, 'cbm_price', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-blue-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Min. Charge ({currency})</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <ZenInput
                        type="number"
                        value={slab.min_charge}
                        onChange={(e) => updateCbmSlab(index, 'min_charge', Number(e.target.value))}
                        className="pl-12 bg-slate-50 border-slate-300 text-amber-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Max. Charge ({currency}, 선택)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/50" />
                      <ZenInput
                        type="number"
                        value={slab.max_charge ?? ''}
                        onChange={(e) => updateCbmSlabMaxCharge(index, e.target.value)}
                        className="pl-12 bg-slate-50 border-slate-300 text-red-500 font-bold"
                        placeholder="상한 없음"
                      />
                    </div>
                  </div>

                  <ZenButton
                    onClick={() => removeCbmSlab(index)}
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

      {tiers.weight_slabs.length === 0 || tiers.cbm_slabs.length === 0 ? (
        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
          Both Weight Slabs and CBM Slabs must have at least 1 entry.
        </p>
      ) : null}
    </div>
  );
};
