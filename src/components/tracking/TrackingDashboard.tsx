"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Package, 
  MapPin, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getGlobalTrackingOverview, syncExternalTracking } from "@/app/actions/tracking";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

export default function TrackingDashboard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await getGlobalTrackingOverview();
      setTracks(data);
    } catch (error) {
      console.error("Failed to fetch tracking overview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncExternalTracking();
      await fetchOverview();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const filteredTracks = tracks.filter(track => 
    track.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header section with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 zen-shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Tracks</p>
          <p className="text-3xl font-bold text-slate-900">{tracks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 zen-shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">In Transit</p>
          <p className="text-3xl font-bold text-blue-600">
            {tracks.filter(t => t.latest_event?.event_code === 'IN_TRANSIT').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 zen-shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Delivered</p>
          <p className="text-3xl font-bold text-green-600">
            {tracks.filter(t => t.latest_event?.event_code === 'DELIVERED').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 zen-shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Issues</p>
          <p className="text-3xl font-bold text-red-600">
            {tracks.filter(t => t.latest_event?.event_code === 'EXCEPTION').length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search Order # or Tracking #"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={fetchOverview}
            className="flex-1 md:flex-none p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={18} className={cn("text-slate-600", loading && "animate-spin")} />
          </button>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-200"
          >
            <RefreshCw size={16} className={cn(syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync All API"}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden zen-shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Carrier / Mode</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-10 bg-slate-50 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredTracks.length > 0 ? (
                filteredTracks.map((track) => (
                  <tr key={track.order_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {track.order?.order_number || "NO_NUMBER"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {track.order?.customer_id || "Direct Order"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {track.tracking_number || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900 font-medium">
                          {track.provider_name || "—"}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-1 border",
                          track.provider_type === 'API' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          track.provider_type === 'VIRTUAL' ? "bg-purple-50 text-purple-600 border-purple-100" :
                          "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {track.provider_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {track.latest_event ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {track.latest_event.event_code === 'DELIVERED' ? (
                              <CheckCircle2 size={14} className="text-green-500" />
                            ) : track.latest_event.event_code === 'EXCEPTION' ? (
                              <AlertCircle size={14} className="text-red-500" />
                            ) : (
                              <RefreshCw size={14} className="text-blue-500 animate-spin-slow" />
                            )}
                            <span className="text-sm font-semibold text-slate-800">
                              {track.latest_event.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            <span>{track.latest_event.location}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No events yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={14} />
                        <span>
                          {track.updated_at ? format(new Date(track.updated_at), 'yyyy-MM-dd HH:mm') : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/orders/${track.order_id}`}
                        className="p-2 inline-flex items-center gap-1 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Detail
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p>No tracking records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
