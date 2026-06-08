'use client';

import { useState, useMemo } from 'react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { RateTierEditor, RateTiers, WeightSlab, CbmSlab } from '@/components/admin/RateTierEditor';
import {
  Truck, Save, Settings2, Box, Plane, Ship, Calendar, DollarSign, Percent, MapPin, Globe, Calculator, Weight, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

function findMatchingSlab<T extends { weight_min?: number; cbm_min?: number }>(
  slabs: T[], value: number, key: 'weight_min' | 'cbm_min'
): T | null {
  if (!slabs.length) return null;
  const sorted = [...slabs].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
  return sorted.find(s => value >= (s[key] ?? 0)) ?? slabs[0];
}

interface RatePreviewResult {
  weightSlab: WeightSlab | null;
  cbmSlab: CbmSlab | null;
  unitPrice: number;
  cbmPrice: number;
  weightCost: number;
  cbmCost: number;
  total: number;
}

function calcRatePreview(tiers: RateTiers, weight: number, cbm: number): RatePreviewResult | null {
  if (!tiers.weight_slabs.length || !tiers.cbm_slabs.length) return null;
  const weightSlab = findMatchingSlab(tiers.weight_slabs, weight, 'weight_min');
  const cbmSlab = findMatchingSlab(tiers.cbm_slabs, cbm, 'cbm_min');
  const unitPrice = weightSlab?.unit_price ?? 0;
  const cbmPrice = cbmSlab?.cbm_price ?? 0;
  const weightCost = weight * unitPrice;
  const cbmCost = cbm * cbmPrice;
  const minCharge = Math.max(weightSlab?.min_charge ?? 0, cbmSlab?.min_charge ?? 0);
  const total = Math.max(weightCost, cbmCost, minCharge);
  return { weightSlab, cbmSlab, unitPrice, cbmPrice, weightCost, cbmCost, total };
}

function RatePreview({ tiers, currency }: { tiers: RateTiers; currency: string }) {
  const [weight, setWeight] = useState(100);
  const [cbm, setCbm] = useState(1);
  const result = useMemo(() => calcRatePreview(tiers, weight, cbm), [tiers, weight, cbm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Calculator className="w-4 h-4 text-brand-600" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.1em]">운송비 시뮬레이션</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <Weight className="w-3 h-3" /> Test Weight (kg)
          </label>
          <ZenInput
            type="number" min={0} value={weight}
            onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
            className="bg-slate-50 border-slate-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <Package className="w-3 h-3" /> Test CBM (㎥)
          </label>
          <ZenInput
            type="number" min={0} step={0.1} value={cbm}
            onChange={(e) => setCbm(Math.max(0, Number(e.target.value)))}
            className="bg-slate-50 border-slate-200 text-sm"
          />
        </div>
      </div>

      {result ? (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 px-3 bg-blue-50 rounded-xl">
            <span className="text-slate-500">Weight Bracket</span>
            <span className="font-mono font-semibold text-slate-700">
              ≥{result.weightSlab?.weight_min}kg @ {currency} {result.unitPrice.toFixed(4)}/kg
            </span>
          </div>
          <div className="flex justify-between py-1.5 px-3 bg-blue-50 rounded-xl">
            <span className="text-slate-500">CBM Bracket</span>
            <span className="font-mono font-semibold text-slate-700">
              ≥{result.cbmSlab?.cbm_min}㎥ @ {currency} {result.cbmPrice.toFixed(4)}/㎥
            </span>
          </div>
          <div className="border-t border-dashed border-slate-200 pt-2 mt-2 space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Weight Cost</span>
              <span className="font-mono">{currency} {result.weightCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>CBM Cost</span>
              <span className="font-mono">{currency} {result.cbmCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Estimated Total (WM)</span>
              <span className="font-mono">{currency} {result.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          Weight/CBM slabs 입력 후 시뮬레이션 가능
        </p>
      )}
    </div>
  );
}

interface PortOption {
  id: string;
  name: string;
  code: string;
  country_code: string;
  type: string;
}

interface RateCardFormProps {
  carriers: any[];
  selectedCarrier: string;
  onCarrierChange: (v: string) => void;
  serviceType: string;
  onServiceTypeChange: (v: string) => void;
  currency: string;
  onCurrencyChange: (v: string) => void;
  marginRate: number;
  onMarginRateChange: (v: number) => void;
  platformFeeRate: number;
  onPlatformFeeRateChange: (v: number) => void;
  ports: PortOption[];
  originPortId: string;
  onOriginPortIdChange: (v: string) => void;
  destPortId: string;
  onDestPortIdChange: (v: string) => void;
  transitDays: number;
  onTransitDaysChange: (v: number) => void;
  validFrom: string;
  onValidFromChange: (v: string) => void;
  validTo: string;
  onValidToChange: (v: string) => void;
  tiers: RateTiers;
  onTiersChange: (v: RateTiers) => void;
  loading: boolean;
  onSave: () => void;
  onResetForm: () => void;
  profile: any;
  isCarrierRole: boolean;
}

export function RateCardForm(props: RateCardFormProps) {
  return (
    <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className={cn(
        "lg:col-span-8 space-y-8 transition-all",
        props.isCarrierRole && "opacity-50 pointer-events-none scale-[0.98] blur-[2px]"
      )}>
        <ZenCard className="bg-white border-slate-200 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Truck className="w-3 h-3 text-blue-500" /> Carrier Partner
              </label>
              <select
                value={props.selectedCarrier}
                onChange={(e) => props.onCarrierChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
              >
                <option value="" className="bg-white">선택하세요...</option>
                {props.carriers.map(c => (
                  <option key={c.id} value={c.id} className="bg-white">{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 className="w-3 h-3 text-blue-500" /> Transport Mode
              </label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                {[
                  { id: 'AIR', icon: Plane, label: 'Air' },
                  { id: 'SEA', icon: Ship, label: 'Sea' },
                  { id: 'LAND', icon: Truck, label: 'Land' },
                  { id: 'EXP', icon: Box, label: 'Express' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => props.onServiceTypeChange(mode.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                      props.serviceType === mode.id
                        ? "bg-slate-100 text-slate-900 shadow-lg"
                        : "text-slate-400 hover:text-slate-500"
                    )}
                  >
                    <mode.icon className="w-3 h-3" /> {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin className="w-3 h-3 text-blue-500" /> Origin Port
              </label>
              <select
                value={props.originPortId}
                onChange={(e) => props.onOriginPortIdChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
              >
                <option value="" className="bg-white">All Origins (Fallback)</option>
                {props.ports.map(p => (
                  <option key={p.id} value={p.id} className="bg-white">{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Globe className="w-3 h-3 text-emerald-500" /> Destination Port
              </label>
              <select
                value={props.destPortId}
                onChange={(e) => props.onDestPortIdChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-emerald-500/30 transition-all appearance-none"
              >
                <option value="" className="bg-white">All Destinations (Fallback)</option>
                {props.ports.map(p => (
                  <option key={p.id} value={p.id} className="bg-white">{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            {props.originPortId && props.destPortId ? (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-blue-500" /> Transit Days
                </label>
                <input
                  type="number"
                  min={1}
                  value={props.transitDays}
                  onChange={(e) => props.onTransitDaysChange(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            ) : <div />}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-emerald-500" /> Currency
              </label>
              <select
                value={props.currency}
                onChange={(e) => props.onCurrencyChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none text-sm font-mono"
              >
                {['USD', 'KRW', 'EUR', 'JPY', 'CNY', 'GBP', 'SGD', 'HKD'].map(c => (
                  <option key={c} value={c} className="bg-white">{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Percent className="w-3 h-3 text-amber-500" /> Margin Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={props.marginRate}
                onChange={(e) => props.onMarginRateChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                placeholder="15.0"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Percent className="w-3 h-3 text-purple-500" /> Platform Fee Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={props.platformFeeRate}
                onChange={(e) => props.onPlatformFeeRateChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                placeholder="5.0"
              />
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-emerald-500" /> Valid From
                </label>
                <ZenInput
                  type="date"
                  value={props.validFrom}
                  onChange={(e) => props.onValidFromChange(e.target.value)}
                  className="bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-red-400" /> Valid To
                </label>
                <ZenInput
                  type="date"
                  value={props.validTo}
                  onChange={(e) => props.onValidToChange(e.target.value)}
                  className="bg-slate-50 border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <RateTierEditor tiers={props.tiers} onChange={props.onTiersChange} currency={props.currency} />
          </div>
        </ZenCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <ZenCard className="bg-white border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">TISA 3-Tier Rate Summary</h3>
            {props.selectedCarrier && props.originPortId ? (
              <button
                onClick={props.onResetForm}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
              >
                ✕ New
              </button>
            ) : null}
          </div>

          <div className="space-y-6">
            <RatePreview tiers={props.tiers} currency={props.currency} />

            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">Margin Rate</span>
              <span className="text-slate-900 font-mono font-bold">{props.marginRate.toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">Platform Fee</span>
              <span className="text-slate-900 font-mono font-bold">{props.platformFeeRate.toFixed(1)}%</span>
            </div>

            <ZenButton
              onClick={props.onSave}
              disabled={props.loading}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {props.loading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-200 rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              DEPLOY RATE CARD
            </ZenButton>
          </div>
        </ZenCard>
      </div>
    </main>
  );
}
