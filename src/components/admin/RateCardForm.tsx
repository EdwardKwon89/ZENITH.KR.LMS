'use client';

import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { RateTierEditor } from '@/components/admin/RateTierEditor';
import { SurchargeEditor } from '@/components/admin/SurchargeEditor';
import { RateTier } from '@/components/admin/RateTierEditor';
import { Surcharge } from '@/components/admin/SurchargeEditor';
import {
  Globe, MapPin, Truck, Save, ChevronRight, Settings2, Box, Plane, Ship, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RateCardFormProps {
  carriers: any[];
  ports: any[];
  selectedCarrier: string;
  onCarrierChange: (v: string) => void;
  originPort: string;
  onOriginPortChange: (v: string) => void;
  destPort: string;
  onDestPortChange: (v: string) => void;
  serviceType: string;
  onServiceTypeChange: (v: string) => void;
  baseRate: number;
  onBaseRateChange: (v: number) => void;
  priority: number;
  onPriorityChange: (v: number) => void;
  selectedCustomer: string;
  onCustomerChange: (v: string) => void;
  baseDateRule: string;
  onBaseDateRuleChange: (v: string) => void;
  validFrom: string;
  onValidFromChange: (v: string) => void;
  validTo: string;
  onValidToChange: (v: string) => void;
  shippers: any[];
  tiers: RateTier[];
  onTiersChange: (v: RateTier[]) => void;
  surcharges: Surcharge[];
  onSurchargesChange: (v: Surcharge[]) => void;
  loading: boolean;
  onSave: () => void;
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
                  <option key={c.id} value={c.id} className="bg-white">{c.name} ({c.org_id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 className="w-3 h-3 text-blue-500" /> Service Mode
              </label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                {[
                  { id: 'AIR', icon: Plane, label: 'Air' },
                  { id: 'SEA', icon: Ship, label: 'Sea' },
                  { id: 'CIR', icon: Box, label: 'Express' }
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
                <Box className="w-3 h-3 text-amber-500" /> Target Customer (Optional)
              </label>
              <select
                value={props.selectedCustomer}
                onChange={(e) => props.onCustomerChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
              >
                <option value="" className="bg-white">All Customers (General Rate)</option>
                {props.shippers.map(s => (
                  <option key={s.id} value={s.id} className="bg-white">{s.org_name_ko} ({s.org_code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 className="w-3 h-3 text-amber-500" /> Rate Priority
              </label>
              <input
                type="number"
                value={props.priority}
                onChange={(e) => props.onPriorityChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                placeholder="0 (Highest priority wins overlaps)"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar className="w-3 h-3 text-amber-500" /> Settlement Base Date
              </label>
              <select
                value={props.baseDateRule}
                onChange={(e) => props.onBaseDateRuleChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="RECEIPT_DATE" className="bg-white">Cargo Receipt Date (Default)</option>
                <option value="ORDER_DATE" className="bg-white">Order Date</option>
                <option value="CONFIRM_DATE" className="bg-white">Confirmation Date</option>
              </select>
              <p className="text-[9px] text-slate-500 leading-relaxed px-1">
                * Determines which date on the order determines the applicable rate version.
              </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin className="w-3 h-3 text-emerald-500" /> Loading Port (Origin)
              </label>
              <select
                value={props.originPort}
                onChange={(e) => props.onOriginPortChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
              >
                <option value="" className="bg-white">Origin Select...</option>
                {props.ports.map(p => (
                  <option key={p.port_code} value={p.port_code} className="bg-white">{p.port_code} - {p.port_name_ko}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Globe className="w-3 h-3 text-emerald-500" /> Discharge Port (Dest)
              </label>
              <select
                value={props.destPort}
                onChange={(e) => props.onDestPortChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
              >
                <option value="" className="bg-white">Dest Select...</option>
                {props.ports.map(p => (
                  <option key={p.port_code} value={p.port_code} className="bg-white">{p.port_code} - {p.port_name_ko}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <RateTierEditor tiers={props.tiers} onChange={props.onTiersChange} />
          </div>

          <div className="pt-6 border-t border-slate-200">
            <SurchargeEditor surcharges={props.surcharges} onChange={props.onSurchargesChange} />
          </div>
        </ZenCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <ZenCard className="bg-white border-slate-200 sticky top-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">요율 정보 요약</h3>

          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-500">기본 단가</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-mono">$</span>
                <input
                  type="number"
                  value={props.baseRate}
                  onChange={(e) => props.onBaseRateChange(Number(e.target.value))}
                  className="bg-transparent text-slate-900 font-mono text-right w-20 focus:outline-none focus:text-emerald-600"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Route</p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-slate-900">{props.originPort || '???'}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className="text-lg font-black text-slate-900">{props.destPort || '???'}</span>
              </div>
            </div>

            <div className="p-4 border border-dashed border-slate-300 rounded-2xl space-y-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pricing Formula</p>
              <div className="text-xs text-slate-500 leading-relaxed font-mono">
                {props.tiers.length === 0 ? (
                  `BASE_VAL: $${props.baseRate}/KG (Flat)`
                ) : (
                  `IF WEIGHT >= ${props.tiers.sort((a,b) => b.weight_min - a.weight_min)[0].weight_min}KG -> $${props.tiers.sort((a,b) => b.weight_min - a.weight_min)[0].unit_price}/KG...`
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
              MASTER DATA DEPLOY
            </ZenButton>
          </div>
        </ZenCard>
      </div>
    </main>
  );
}
