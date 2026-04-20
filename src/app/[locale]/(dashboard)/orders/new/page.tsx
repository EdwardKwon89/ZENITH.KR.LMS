import React from 'react';
import BookingWizard from '@/components/ui/BookingWizard';

export default function NewOrderPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
            Smart Booking Engine
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Book your global logistics in seconds with AI-optimized routing 
            and real-time carrier rate comparison.
          </p>
        </div>

        {/* Wizard Component */}
        <div className="relative pb-24">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-blue-600/5 blur-[120px] rounded-full -z-10" />
          <BookingWizard />
        </div>

        {/* Dynamic Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/10">
          <FeatureCard 
            title="Real-time Tracking" 
            desc="Every booking includes 24/7 real-time milestone tracking by default."
          />
          <FeatureCard 
            title="AI Rate Engine" 
            desc="Our algorithms analyze thousands of carrier contracts to find your best price."
          />
          <FeatureCard 
            title="Global Network" 
            desc="Access to over 450+ airports and ports across the ZENITH network."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-3 hover:bg-white/10 transition-all">
      <h3 className="font-bold text-white tracking-wide">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
