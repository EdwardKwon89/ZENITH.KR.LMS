"use client";

import React from "react";
import { Ship, Plane, Truck, ArrowRight, Clock, DollarSign, CalendarDays } from "lucide-react";
import { RouteSegment } from "@/lib/logistics/routing";
import { cn } from "@/lib/utils";

interface RouteSegmentListProps {
  segments: RouteSegment[];
  className?: string;
}

/**
 * [SCR-ROU-01] 경로의 각 세그먼트 정보를 상세 리스트로 표시하는 컴포넌트
 */
export function RouteSegmentList({ segments, className }: RouteSegmentListProps) {
  const getIcon = (mode: string) => {
    switch (mode) {
      case "SEA": return <Ship className="w-4 h-4" />;
      case "AIR": return <Plane className="w-4 h-4" />;
      case "LAND": return <Truck className="w-4 h-4" />;
      default: return <ArrowRight className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {segments.map((segment, index) => (
        <div key={index} className="relative group">
          {/* 구간 연결 선 (마지막 요소 제외) */}
          {index < segments.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/30 to-transparent z-0" />
          )}

          <div className="flex items-start gap-3 relative z-10">
            {/* 아이콘 컨테이너 */}
            <div className={cn(
              "p-2 rounded-full shadow-sm border",
              segment.transport_mode === "SEA" ? "bg-blue-50 border-blue-100 text-blue-600" :
              segment.transport_mode === "AIR" ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
              "bg-emerald-50 border-emerald-100 text-emerald-600"
            )}>
              {getIcon(segment.transport_mode)}
            </div>

            {/* 정보 영역 */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {segment.from_port_id} <ArrowRight className="inline w-3 h-3 mx-1 opacity-50" /> {segment.to_port_id}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium border border-slate-200">
                  {segment.carrier}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center text-[11px] text-slate-500">
                  <Clock className="w-3 h-3 mr-1 opacity-70" />
                  {segment.transit_days}일
                </div>
                <div className="flex items-center text-[11px] text-slate-500">
                  <DollarSign className="w-3 h-3 mr-0.5 opacity-70" />
                  {segment.cost.toLocaleString()} {segment.currency}
                </div>
                {segment.flight_no && (
                  <div className="flex items-center text-[11px] text-indigo-600 font-medium">
                    <Plane className="w-3 h-3 mr-1" />
                    {segment.flight_no}
                  </div>
                )}
                {segment.etd && (
                  <div className="flex items-center text-[11px] text-slate-500">
                    <CalendarDays className="w-3 h-3 mr-1 opacity-70" />
                    {new Date(segment.etd).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
