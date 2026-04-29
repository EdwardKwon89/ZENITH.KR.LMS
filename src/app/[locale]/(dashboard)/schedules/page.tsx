import { getVesselSchedules } from "@/app/actions/schedules";
import { getPorts } from "@/app/actions/master";
import { validateUserAction } from "@/lib/auth/guards";
import { CalendarDays, MapPin, Anchor, Plane, Clock, Info, Search } from "lucide-react";
import { ZenCard, ZenBadge, ZenButton } from "@/components/ui/ZenUI";
import Link from "next/link";

export default async function VesselSchedulePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearch = await searchParams;
  await validateUserAction(); // Available to all users

  const filters = {
    originPortId: typeof resolvedSearch.origin === 'string' ? resolvedSearch.origin : undefined,
    destinationPortId: typeof resolvedSearch.dest === 'string' ? resolvedSearch.dest : undefined,
    startDate: typeof resolvedSearch.start === 'string' ? resolvedSearch.start : undefined,
    endDate: typeof resolvedSearch.end === 'string' ? resolvedSearch.end : undefined,
  };

  const [schedules, ports] = await Promise.all([
    getVesselSchedules(filters),
    getPorts()
  ]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white shadow-2xl shadow-indigo-200/50 transform -rotate-2">
            <CalendarDays size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Schedules</h1>
            <p className="text-slate-500 font-semibold text-sm opacity-80 uppercase tracking-widest">Vessel & Flight Operations</p>
          </div>
        </div>
      </div>

      {/* Modern Filter Strip */}
      <ZenCard className="p-4 bg-white/40 backdrop-blur-xl border-white/40 shadow-xl">
        <form className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={12} className="text-blue-500" /> Origin
            </label>
            <select name="origin" defaultValue={filters.originPortId} className="w-full bg-white/60 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
              <option value="">Select Origin</option>
              {ports.map(port => <option key={port.id} value={port.id}>{port.code} - {port.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={12} className="text-rose-500" /> Destination
            </label>
            <select name="dest" defaultValue={filters.destinationPortId} className="w-full bg-white/60 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
              <option value="">Select Destination</option>
              {ports.map(port => <option key={port.id} value={port.id}>{port.code} - {port.name}</option>)}
            </select>
          </div>
          <ZenButton type="submit" className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100">
            <Search size={18} className="mr-2" />
            Find Schedules
          </ZenButton>
        </form>
      </ZenCard>

      {/* Schedule Grid/List */}
      <div className="grid grid-cols-1 gap-4">
        {schedules.length === 0 ? (
          <ZenCard className="py-20 text-center">
            <Info size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold tracking-tight">No schedules found for the selected route.</p>
          </ZenCard>
        ) : (
          schedules.map((schedule: any) => (
            <ZenCard key={schedule.id} className="p-0 overflow-hidden hover:shadow-2xl transition-all group border-white/40 bg-white/60">
              <div className="flex flex-col md:flex-row">
                {/* Left: Mode & Carrier */}
                <div className="w-full md:w-48 p-6 flex flex-col items-center justify-center border-r border-slate-100 bg-slate-50/50">
                  <div className={`p-3 rounded-2xl mb-3 ${schedule.mode === 'AIR' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {schedule.mode === 'AIR' ? <Plane size={24} /> : <Anchor size={24} />}
                  </div>
                  <p className="text-sm font-black text-slate-900 text-center uppercase tracking-tighter leading-tight">
                    {schedule.carrier}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{schedule.vessel_no || schedule.flight_no || 'Vessel/Flight TBD'}</p>
                </div>

                {/* Middle: Route & Times */}
                <div className="flex-1 p-6 flex items-center justify-between gap-8">
                  <div className="text-right flex-1">
                    <p className="text-xl font-black text-slate-900 mb-1">{schedule.origin_port?.code}</p>
                    <p className="text-xs font-bold text-slate-400 truncate">{schedule.origin_port?.name}</p>
                    <div className="mt-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Departure (ETD)</p>
                      <p className="text-sm font-black text-slate-700">{new Date(schedule.etd).toLocaleString(locale)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2 relative w-24">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                    <Clock size={16} className="text-slate-300 animate-pulse" />
                    <ZenBadge variant="info" className="text-[9px] font-black uppercase tracking-tighter bg-white px-2 py-0.5 border-slate-200 shadow-sm">
                      Direct
                    </ZenBadge>
                  </div>

                  <div className="text-left flex-1">
                    <p className="text-xl font-black text-slate-900 mb-1">{schedule.destination_port?.code}</p>
                    <p className="text-xs font-bold text-slate-400 truncate">{schedule.destination_port?.name}</p>
                    <div className="mt-3">
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Arrival (ETA)</p>
                      <p className="text-sm font-black text-slate-700">{new Date(schedule.eta).toLocaleString(locale)}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Action */}
                <div className="w-full md:w-56 p-6 flex flex-col items-center justify-center bg-white/40 border-l border-slate-100">
                  <ZenBadge 
                    variant={schedule.status === 'DEPARTED' ? 'info' : schedule.status === 'ARRIVED' ? 'success' : 'warning'}
                    className="mb-4 px-4 py-1 font-black text-[10px] tracking-widest uppercase"
                  >
                    {schedule.status}
                  </ZenBadge>
                  <ZenButton className="w-full bg-slate-900 text-white rounded-xl text-xs font-black h-10 hover:bg-slate-800 shadow-lg shadow-slate-100">
                    Book Shipment
                  </ZenButton>
                </div>
              </div>
            </ZenCard>
          ))
        )}
      </div>
    </div>
  );
}
