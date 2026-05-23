'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { RateCardsTab } from './RateCardsTab';
import { SurchargesTab } from './SurchargesTab';

type Tab = 'cards' | 'surcharges';

export default function RateCardsManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cards');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cards', label: 'Rate Cards' },
    { key: 'surcharges', label: 'Surcharges' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      <header className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-tighter text-sm uppercase mb-2">
          <DollarSign className="w-4 h-4" />
          Pricing Engine v2
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Rate Cards Management</h1>
        <p className="text-slate-500 mt-1">Manage rate cards and surcharges for the intelligent routing engine.</p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-semibold transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.key
                  ? 'text-emerald-600 border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'cards' && <RateCardsTab />}
        {activeTab === 'surcharges' && <SurchargesTab />}
      </div>
    </div>
  );
}
