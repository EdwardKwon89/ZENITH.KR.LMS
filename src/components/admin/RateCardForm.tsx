'use client';

import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { RateTierEditor } from '@/components/admin/RateTierEditor';
import { RateTier } from '@/components/admin/RateTierEditor';
import {
  Truck, Save, Settings2, Box, Plane, Ship, Calendar, DollarSign, Percent, MapPin, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  carrierCost: number;
  onCarrierCostChange: (v: number) => void;
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
  tiers: RateTier[];
  onTiersChange: (v: RateTier[]) => void;
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
                <DollarSign className="w-3 h-3 text-emerald-500" /> Carrier Cost (kg당)
              </label>
              <div className="flex gap-2">
                <select
                  value={props.currency}
                  onChange={(e) => props.onCurrencyChange(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-300 text-slate-900 px-3 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none text-sm font-mono"
                >
                  {['USD', 'KRW', 'EUR', 'JPY', 'CNY', 'GBP', 'SGD', 'HKD'].map(c => (
                    <option key={c} value={c} className="bg-white">{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={props.carrierCost}
                  onChange={(e) => props.onCarrierCostChange(Number(e.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="0.00"
                />
              </div>
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
            <RateTierEditor tiers={props.tiers} onChange={props.onTiersChange} />
          </div>
        </ZenCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <ZenCard className="bg-white border-slate-200 sticky top-8">
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
            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">Carrier Cost</span>
              <span className="text-slate-900 font-mono font-bold">{props.currency} {props.carrierCost.toFixed(2)} /kg</span>
            </div>

            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">Margin Rate</span>
              <span className="text-slate-900 font-mono font-bold">{props.marginRate.toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">Platform Fee</span>
              <span className="text-slate-900 font-mono font-bold">{props.platformFeeRate.toFixed(1)}%</span>
            </div>

            <div className="p-4 border border-dashed border-slate-300 rounded-2xl space-y-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pricing Formula</p>
              <div className="text-xs text-slate-500 leading-relaxed font-mono">
                {props.tiers.length === 0 ? (
                  `Carrier Cost: ${props.currency} ${props.carrierCost.toFixed(2)}/kg × (1 + ${(props.marginRate + props.platformFeeRate).toFixed(1)}%)`
                ) : (
                  `Tiered: ${props.tiers.length} brackets, starting at ${props.currency} ${Math.min(...props.tiers.map(t => t.unit_price)).toFixed(2)}/kg`
                )}
              </div>
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
