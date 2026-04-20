'use client';

import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, ChevronRight, Check, Ship, Plane, Truck, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Step = 'route' | 'cargo' | 'rates';

interface Port {
  code: string;
  name: string;
  type: 'AIR' | 'SEA' | 'LAND';
  country_code: string;
}

export default function BookingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('route');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState({ origin: '', destination: '' });
  const [ports, setPorts] = useState<Port[]>([]);
  
  // Fake data for demo until Supabase hooks are ready
  useEffect(() => {
    // In a real app, match with Database types
    setPorts([
      { code: 'ICN', name: 'Incheon International Airport', type: 'AIR', country_code: 'KR' },
      { code: 'PUS', name: 'Busan Port', type: 'SEA', country_code: 'KR' },
      { code: 'LAX', name: 'Los Angeles International Airport', type: 'AIR', country_code: 'US' },
      { code: 'SHA', name: 'Shanghai Port', type: 'SEA', country_code: 'CN' }
    ]);
  }, []);

  const handleNext = () => {
    if (currentStep === 'route') setCurrentStep('cargo');
    else if (currentStep === 'cargo') setCurrentStep('rates');
  };

  const ProgressHeader = () => (
    <div className="flex items-center justify-between mb-10 px-4">
      {[
        { id: 'route', label: 'Route', icon: MapPin },
        { id: 'cargo', label: 'Cargo', icon: Package },
        { id: 'rates', label: 'Rates', icon: Info },
      ].map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
              currentStep === s.id 
                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                : i < ['route', 'cargo', 'rates'].indexOf(currentStep)
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-slate-400 border border-white/20"
            )}>
              {i < ['route', 'cargo', 'rates'].indexOf(currentStep) ? <Check size={20} /> : <s.icon size={20} />}
            </div>
            <span className={cn(
              "text-xs font-medium",
              currentStep === s.id ? "text-white" : "text-slate-400"
            )}>{s.label}</span>
          </div>
          {i < 2 && <div className="flex-1 h-[2px] bg-white/10 mx-4 -mt-6" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Premium Glassmorphism Container */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-slate-900/40 backdrop-blur-3xl p-8 lg:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />

        <ProgressHeader />

        {/* Step 1: Route Selection */}
        {currentStep === 'route' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 ml-1">Origin Port</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search origin..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300 ml-1">Destination Port</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search destination..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleNext}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 group"
              >
                Search Available Logistics
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Cargo Details */}
        {currentStep === 'cargo' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Package size={20} className="text-blue-400" />
                   Package Specifications
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <span className="text-xs text-slate-400 ml-1 uppercase tracking-wider">Gross Weight (kg)</span>
                     <input type="number" defaultValue={10} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                   </div>
                   <div className="space-y-2">
                     <span className="text-xs text-slate-400 ml-1 uppercase tracking-wider">Volume (CBM)</span>
                     <input type="number" defaultValue={1.5} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                   </div>
                 </div>
               </div>
               <div className="p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex flex-col justify-between">
                 <div>
                    <h4 className="text-blue-400 font-bold mb-2">Smart Tip</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">Most cargo on this route is optimized for Sea Freight (CBM units).</p>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Info size={20} className="text-blue-400" />
                 </div>
               </div>
             </div>

             <div className="flex gap-4">
              <button onClick={() => setCurrentStep('route')} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-5 rounded-2xl border border-white/10 transition-all">Back</button>
              <button onClick={handleNext} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-lg transition-all">Calculate Rates</button>
             </div>
          </div>
        )}

        {/* Step 3: Rate Selection */}
        {currentStep === 'rates' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
            <h3 className="text-xl font-bold text-white mb-4">Recommended Carriers</h3>
            
            {[
              { carrier: 'SNTL Express', mode: 'AIR', price: 1250.00, time: '2-3 Days', icon: Plane, color: 'text-orange-400' },
              { carrier: 'Global Maritime', mode: 'SEA', price: 420.50, time: '14-18 Days', icon: Ship, color: 'text-blue-400' },
            ].map((rate, i) => (
              <div key={i} className="group relative p-6 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center", rate.color)}>
                      <rate.icon size={28} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{rate.carrier}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Info size={14} /> {rate.mode}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>EST: {rate.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">$ {rate.price.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">All-in Price</div>
                  </div>
                </div>
              </div>
            ))}

            <button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
              Complete Reservation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
