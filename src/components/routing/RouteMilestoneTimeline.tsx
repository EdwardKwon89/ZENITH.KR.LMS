"use client";

import React from "react";
import { CheckCircle2, CircleDashed, MapPin, Navigation, Plane, Ship, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteMilestoneTimelineProps {
  milestones: Array<{
    name: string;
    location: { lat: number; lng: number };
    mode: 'AIR' | 'SEA' | 'LAND';
    status: 'PENDING' | 'COMPLETED';
  }>;
  className?: string;
}

const MODE_ICONS = {
  AIR: Plane,
  SEA: Ship,
  LAND: Truck,
} as const;

/**
 * [SCR-ROU-02] 확정 경로의 마일스톤 진행 상황을 시각화하는 타임라인 컴포넌트
 */
export function RouteMilestoneTimeline({ milestones, className }: RouteMilestoneTimelineProps) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className={cn("p-6 rounded-2xl bg-slate-50/50 border border-slate-100", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
          <Navigation className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">경로 마일스톤 (Route Milestones)</h4>
      </div>

      <div className="relative flex flex-col md:flex-row items-start justify-between gap-8 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* 가로 연결 선 (Desktop) */}
        <div className="hidden md:block absolute top-[19px] left-[40px] right-[40px] h-0.5 bg-slate-200 z-0" />

        {milestones.map((milestone, index) => {
          const isCompleted = milestone.status === "COMPLETED";
          
          return (
            <div key={index} className="flex md:flex-col items-center gap-4 md:gap-3 relative z-10 min-w-[120px]">
              {/* 상태 아이콘 */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                isCompleted 
                  ? "bg-blue-600 border-blue-600 text-white" 
                  : "bg-white border-slate-200 text-slate-300"
              )}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <CircleDashed className="w-5 h-5 animate-spin-slow" />}
              </div>

              {/* 정보 */}
              <div className="flex flex-col md:items-center text-left md:text-center">
                <p className={cn(
                  "text-sm font-bold truncate max-w-[150px]",
                  isCompleted ? "text-slate-800" : "text-slate-400"
                )}>
                  {milestone.name}
                </p>
                
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-medium">
                    {milestone.location.lat.toFixed(2)}, {milestone.location.lng.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-1.5">
                  {React.createElement(MODE_ICONS[milestone.mode], { className: "w-3 h-3 text-slate-400" })}
                  <span className="text-[9px] text-slate-400 font-medium uppercase">{milestone.mode}</span>
                </div>

                <div className={cn(
                  "mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                  isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>
                  {milestone.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200/50">
        <p className="text-[11px] text-slate-400 italic">
          * 지도 시각화는 Phase 4 실시간 위치 정보 연동 시 활성화될 예정입니다.
        </p>
      </div>
    </div>
  );
}
