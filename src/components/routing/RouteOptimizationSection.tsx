"use client";

import { useState, useEffect, useTransition } from "react";
import { getRouteOptions, selectRoute, getRouteVisualization } from "@/app/actions/routing";
import { RouteOptionCard } from "./RouteOptionCard";
import { RouteMilestoneTimeline } from "./RouteMilestoneTimeline";
import { ZenButton } from "@/components/ui/ZenUI";
import { RefreshCw, Calculator, MapPin, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
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
  const [options, setOptions] = useState<Record<string, any> | null>(null);
  const [appliedRouteId, setAppliedRouteId] = useState<string | null>(initialAppliedRouteId || null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialAppliedRouteId || null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);

  // Fetch options if already applied but not loaded
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
          // Refresh visualization
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
      console.error("Failed to fetch visualization:", error);
    } finally {
      setIsLoadingVisual(false);
    }
  };

  useEffect(() => {
    if (appliedRouteId) {
      fetchVisualization();
    }
  }, [appliedRouteId]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(options).map(([key, opt]) => (
            <RouteOptionCard 
              key={key}
              option={opt}
              isSelected={selectedOptionId === opt.id}
              onSelect={handleSelect}
              isLoading={isPending}
            />
          ))}
        </div>
      )}

      {appliedRouteId && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {isLoadingVisual ? (
            <div className="h-40 flex items-center justify-center bg-secondary/10 rounded-xl border">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RouteMilestoneTimeline milestones={milestones} />
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
