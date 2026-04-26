"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Star, TrendingUp, Zap, Banknote } from "lucide-react";
import { RouteSegment } from "@/lib/logistics/routing";
import { RouteSegmentList } from "./RouteSegmentList";
import { cn } from "@/lib/utils";

interface RouteOptionCardProps {
  option: {
    id: string;
    option_type: 'COST' | 'TIME' | 'BALANCED';
    segments: RouteSegment[];
    total_cost: number;
    total_transit_days: number;
    score: number;
  };
  isSelected: boolean;
  onSelect: (optionId: string) => void;
  isLoading?: boolean;
}

/**
 * [SCR-ROU-01] 경로 옵션을 시각화하고 선택할 수 있는 카드 컴포넌트
 */
export function RouteOptionCard({ option, isSelected, onSelect, isLoading }: RouteOptionCardProps) {
  const isBalanced = option.option_type === "BALANCED";

  const getTheme = () => {
    switch (option.option_type) {
      case "COST": return { 
        label: "최저비용", 
        icon: <Banknote className="w-4 h-4" />,
        color: "blue"
      };
      case "TIME": return { 
        label: "최단시간", 
        icon: <Zap className="w-4 h-4" />,
        color: "indigo"
      };
      case "BALANCED": return { 
        label: "최적균형", 
        icon: <Star className="w-4 h-4" />,
        color: "amber"
      };
    }
  };

  const theme = getTheme();

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden",
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500/10 bg-white shadow-xl" 
          : "border-slate-200 bg-slate-50/30 hover:bg-white hover:border-slate-300 shadow-sm",
        isBalanced && !isSelected && "border-amber-200/60 bg-amber-50/10"
      )}
    >
      {/* 배경 장식 (Balanced 전용) */}
      {isBalanced && (
        <div className="absolute top-0 right-0 p-1">
          <div className="bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-current" /> 추천
          </div>
        </div>
      )}

      {/* 헤더 섹션 */}
      <div className="flex items-center gap-2 mb-4">
        <div className={cn(
          "p-1.5 rounded-lg",
          theme.color === "blue" ? "bg-blue-100 text-blue-600" :
          theme.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
          "bg-amber-100 text-amber-600"
        )}>
          {theme.icon}
        </div>
        <h4 className="text-sm font-bold text-slate-800">{theme.label}</h4>
      </div>

      {/* 요약 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Cost</p>
          <p className="text-lg font-extrabold text-slate-900">
            ${option.total_cost.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Transit Time</p>
          <p className="text-lg font-extrabold text-slate-900">
            {option.total_transit_days}일
          </p>
        </div>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-slate-100 mb-4" />

      {/* 세그먼트 상세 */}
      <RouteSegmentList segments={option.segments} className="mb-6" />

      {/* 스코어 표시 */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-3 h-3 text-slate-400" />
        <span className="text-[11px] text-slate-500 font-medium">Efficiency Score: </span>
        <span className="text-[11px] font-bold text-slate-700">{option.score.toFixed(2)}</span>
      </div>

      {/* 선택 버튼 */}
      <button
        onClick={() => onSelect(option.id)}
        disabled={isLoading || isSelected}
        className={cn(
          "w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2",
          isSelected
            ? "bg-blue-50 text-blue-600 border border-blue-200"
            : "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg disabled:opacity-50"
        )}
      >
        {isSelected ? (
          <>
            <Check className="w-4 h-4" /> 선택됨
          </>
        ) : (
          "이 경로 선택"
        )}
      </button>
    </motion.div>
  );
}
