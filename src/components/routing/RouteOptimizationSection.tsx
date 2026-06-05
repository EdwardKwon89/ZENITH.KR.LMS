"use client";
import { logger } from '@/lib/logger';

import { useState, useEffect, useTransition } from "react";
import { getRouteOptions, selectRoute, getRouteVisualization } from "@/app/actions/routing";
import { RouteMilestoneTimeline } from "./RouteMilestoneTimeline";
import { RouteSegmentList } from "./RouteSegmentList";
import { ZenButton } from "@/components/ui/ZenUI";
import { RefreshCw, Calculator, MapPin, CheckCircle2, ChevronRight, Loader2, Banknote, Zap, Star, Ship, Plane, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RouteOptimizationSectionProps {
  orderId: string;
  initialAppliedRouteId?: string | null;
  isAdmin?: boolean;
  headerBadge?: React.ReactNode;
}

export default function RouteOptimizationSection({ 
  orderId, 
  initialAppliedRouteId,
  isAdmin = false,
  headerBadge
}: RouteOptimizationSectionProps) {
  const [options, setOptions] = useState<any[] | null>(null);
  const [appliedRouteId, setAppliedRouteId] = useState<string | null>(initialAppliedRouteId || null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialAppliedRouteId || null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);

  const handleCalculate = async () => {
    startTransition(async () => {
      try {
        const result = await getRouteOptions(orderId);
        if (result.success) {
          setOptions(result.options);
          toast.success("경로 옵션이 계산되었습니다.");
        }
      } catch (error: any) {
        toast.error(`경로 계산 실패: ${error.message}`);
      }
    });
  };

  const handleSelect = async (optionId: string) => {
    startTransition(async () => {
      try {
        const result = await selectRoute(orderId, optionId);
        if (result.success) {
          setAppliedRouteId(result.appliedRouteId);
          setSelectedOptionId(optionId);
          toast.success("경로가 확정되었습니다.");
          fetchVisualization();
        }
      } catch (error: any) {
        toast.error(`경로 선택 실패: ${error.message}`);
      }
    });
  };

  const fetchVisualization = async () => {
    setIsLoadingVisual(true);
    try {
      const result = await getRouteVisualization(orderId);
      if (result.success) {
        setMilestones(result.milestones);
      }
    } catch (error) {
      logger.error("Failed to fetch visualization:", error);
    } finally {
      setIsLoadingVisual(false);
    }
  };

  useEffect(() => {
    if (appliedRouteId) {
      fetchVisualization();
    }
  }, [appliedRouteId]);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'SEA': return <Ship className="w-3.5 h-3.5" />;
      case 'AIR': return <Plane className="w-3.5 h-3.5" />;
      case 'LAND': return <Truck className="w-3.5 h-3.5" />;
      default: return <ChevronRight className="w-3.5 h-3.5" />;
    }
  };

  const directOptions = (options || []).filter(o => (o.segments || []).length === 1);
  const hubOptions = (options || []).filter(o => (o.segments || []).length > 1);

  const formatCost = (cost: number) => {
    if (!cost || cost === 0) return <span className="text-amber-600 text-xs font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />요율 미등록</span>;
    return `$${Number(cost).toLocaleString()}`;
  };

  const getRecommendedBadges = (recommendedFor: string[] | undefined) => {
    if (!recommendedFor || recommendedFor.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {recommendedFor.map(r => {
          if (r === 'COST') return <span key={r} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100"><Banknote className="w-2.5 h-2.5" />최저비용</span>;
          if (r === 'TIME') return <span key={r} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"><Zap className="w-2.5 h-2.5" />최단시간</span>;
          if (r === 'BALANCED') return <span key={r} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100"><Star className="w-2.5 h-2.5" />균형 추천</span>;
          return null;
        })}
      </div>
    );
  };

  const renderOptionTable = (groupOptions: any[], groupLabel: string) => {
    if (groupOptions.length === 0) return null;
    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">{groupLabel}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 pr-2 font-medium">운송사</th>
                <th className="text-left py-2 px-2 font-medium">경로</th>
                <th className="text-center py-2 px-2 font-medium">운송 방식</th>
                <th className="text-right py-2 px-2 font-medium">비용</th>
                <th className="text-center py-2 px-2 font-medium">소요일</th>
                <th className="text-center py-2 px-2 font-medium">추천</th>
                <th className="text-right py-2 pl-2 font-medium">선택</th>
              </tr>
            </thead>
            <tbody>
              {groupOptions.map((opt: any, idx: number) => {
                const isSelected = selectedOptionId === opt.id;
                const segs = opt.segments || [];
                const carrierNames = segs.map((s: any) => s.carrier).filter(Boolean).join(', ');
                const routeLabel = segs.map((s: any) => `${s.from_port_id}→${s.to_port_id}`).join(' → ');
                const modes = [...new Set(segs.map((s: any) => s.transport_mode))];

                return (
                  <tr key={opt.id || idx} className={cn(
                    "border-b border-slate-100 transition-colors",
                    isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"
                  )}>
                    <td className="py-3 pr-2 font-medium text-slate-800">{carrierNames}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1 text-slate-600">
                        {segs.map((s: any, si: number) => (
                          <span key={si} className="flex items-center gap-0.5">
                            {si > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                            <span>{s.from_port_id}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span>{s.to_port_id}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex justify-center gap-1">
                        {modes.map((m: string) => (
                          <span key={m} className={cn(
                            "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded",
                            m === 'AIR' ? 'bg-indigo-50 text-indigo-600' :
                            m === 'SEA' ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          )}>
                            {getModeIcon(m)}{m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-slate-800">
                      {formatCost(opt.total_cost)}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-700">
                      {opt.total_transit_days}일
                    </td>
                    <td className="py-3 px-2 text-center">
                      {getRecommendedBadges(opt.recommended_for)}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      {appliedRouteId ? (
                        <div className="flex items-center justify-end gap-2">
                          {isSelected && <span className="text-xs font-medium text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />확정됨</span>}
                          <button
                            onClick={() => handleSelect(opt.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            재선택
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSelect(opt.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          선택
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground">경로 최적화 (Route Optimization)</h3>
            {headerBadge}
          </div>
          <p className="text-sm text-muted-foreground">
            {appliedRouteId 
              ? "선택된 경로에 따라 운송 마일스톤이 설정되었습니다." 
              : "오더 요건에 가장 적합한 운송 경로를 선택하십시오."}
          </p>
        </div>
        
        {!options && !appliedRouteId && (
          <ZenButton 
            onClick={handleCalculate} 
            disabled={isPending}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            {isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-2" />
            )}
            경로 계산하기
          </ZenButton>
        )}
        
        {(options || appliedRouteId) && (
          <ZenButton 
            variant="ghost" 
            onClick={handleCalculate} 
            disabled={isPending}
            className="text-xs h-8"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isPending && "animate-spin")} />
            경로 재계산
          </ZenButton>
        )}
      </div>

      {isPending && !options && (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-2xl border-2 border-dashed border-muted-foreground/20">
          <Loader2 className="w-10 h-10 text-primary/40 animate-spin mb-4" />
          <p className="text-sm font-medium text-muted-foreground">최적의 경로를 분석하고 있습니다...</p>
        </div>
      )}

      {options && (
        <div className="bg-white rounded-lg border p-4 space-y-6">
          {directOptions.length > 0 && renderOptionTable(directOptions, `직항 경로 (${directOptions.length}건)`)}
          {hubOptions.length > 0 && renderOptionTable(hubOptions, `경유 경로 (${hubOptions.length}건)`)}
          {options.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MapPin className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">조회 가능한 경로가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {appliedRouteId && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {isLoadingVisual ? (
            <div className="h-40 flex items-center justify-center bg-secondary/10 rounded-xl border">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <RouteMilestoneTimeline milestones={milestones} />
              {(() => {
                const sel = options?.find(o => o.id === selectedOptionId);
                return sel?.segments ? (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">확정 경로 상세</h4>
                    <RouteSegmentList segments={sel.segments} />
                  </div>
                ) : null;
              })()}
            </>
          )}
          
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              최종 확정된 경로입니다. 마송 마일스톤에 따라 실시간 트래킹이 진행됩니다.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
