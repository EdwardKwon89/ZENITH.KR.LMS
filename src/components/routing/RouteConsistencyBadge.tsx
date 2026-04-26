import { getRouteConsistencyStatus } from "@/app/actions/routing";
import { ZenBadge } from "@/components/ui/ZenUI";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteConsistencyBadgeProps {
  orderId: string;
  isAdmin: boolean;
}

export default async function RouteConsistencyBadge({ 
  orderId, 
  isAdmin 
}: RouteConsistencyBadgeProps) {
  if (!isAdmin) return null;

  const result = await getRouteConsistencyStatus(orderId);

  if (!result.success) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 border border-primary/20 rounded-md">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold text-primary tracking-tight">ADMIN MONITORING</span>
      </div>
      
      <ZenBadge 
        variant="info" 
        className={cn(
          "flex items-center gap-1.5 h-6 px-2 text-[11px] font-semibold border-2 transition-colors",
          result.isConsistent 
            ? "border-green-500/30 bg-green-50 text-green-700" 
            : "border-red-500/30 bg-red-50 text-red-700"
        )}
      >
        {result.isConsistent ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            경로 정합
          </>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            불일치 {result.discrepancies.length}건
          </>
        )}
      </ZenBadge>
    </div>
  );
}
