"use client";
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search,
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

const statCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" as const },
  }),
};

function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 zen-shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-8 w-16 bg-slate-100 rounded" />
    </div>
  );
}

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
      logger.error("Failed to fetch tracking overview:", error);
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
      logger.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const filteredTracks = tracks.filter(track =>
    track.order?.order_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.tracking_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Tracks", value: tracks.length, color: "text-slate-900" },
    { label: "In Transit", value: tracks.filter(t => t.latest_event?.event_code === "IN_TRANSIT").length, color: "text-blue-600" },
    { label: "Delivered", value: tracks.filter(t => t.latest_event?.event_code === "DELIVERED").length, color: "text-green-600" },
    { label: "Issues", value: tracks.filter(t => t.latest_event?.event_code === "EXCEPTION").length, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={statCardVariants}
              initial="hidden"
              animate="visible"
              className="zen-glass p-6 rounded-2xl border border-white/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={cn("text-3xl font-black", stat.color)}>{stat.value}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm">
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
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchOverview}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={18} className={cn("text-slate-600", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-200 whitespace-nowrap"
          >
            <RefreshCw size={16} className={cn(syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync All API"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="relative zen-glass rounded-2xl border border-white/20 overflow-hidden shadow-xl">
        {/* Syncing overlay */}
        <AnimatePresence>
          {syncing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
            >
              <RefreshCw size={28} className="text-brand-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Syncing external data...</p>
            </motion.div>
          )}
        </AnimatePresence>

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
                      <div className="h-10 bg-slate-50 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredTracks.length > 0 ? (
                filteredTracks.map((track) => (
                  <motion.tr
                    key={track.order_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                          <Package size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {track.order?.order_no || "NO_NUMBER"}
                          </p>
                          {track.is_unassigned ? (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 mt-0.5">
                              Unassigned
                            </span>
                          ) : (
                            <p className="text-xs text-slate-500 truncate">
                              {track.order?.recipient_name || track.order?.shipper_id || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {track.tracking_no || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900 font-medium">
                          {track.provider_name || "—"}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-1 border",
                          track.provider_type === "API" ? "bg-blue-50 text-blue-600 border-blue-100" :
                          track.provider_type === "VIRTUAL" ? "bg-purple-50 text-purple-600 border-purple-100" :
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
                            {track.latest_event.event_code === "DELIVERED" ? (
                              <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                            ) : track.latest_event.event_code === "EXCEPTION" ? (
                              <AlertCircle size={14} className="text-red-500 shrink-0" />
                            ) : (
                              <RefreshCw size={14} className="text-blue-500 animate-spin-slow shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {track.latest_event.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{track.latest_event.location}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No events yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={14} className="shrink-0" />
                        <span>
                          {track.updated_at ? format(new Date(track.updated_at), "yyyy-MM-dd HH:mm") : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/orders/${track.order_id}`}
                        className="p-2 inline-flex items-center gap-1 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Detail
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </motion.tr>
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
