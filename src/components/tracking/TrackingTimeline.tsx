"use client";

import React from "react";
import { format } from "date-fns";
import { MapPin, Clock, Info, CheckCircle2, Package, Truck, Ship, Plane, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { USER_ROLES } from "@/lib/auth/rbac";
import "./TrackingTimeline.css";


interface TrackingEvent {
  id: string;
  event_code: string;
  event_time: string;
  location: string;
  description: string;
  source_type: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  isLoading?: boolean;
}

/**
 * [Execution] Premium Logistics Tracking Timeline Component
 * 실시간 애니메이션과 유리 질감 디자인이 적용된 물류 가시성 컴포넌트
 */
export default function TrackingTimeline({ events, isLoading }: TrackingTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-4 px-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
          <Info className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">준비된 트래킹 정보가 없습니다</h3>
        <p className="text-sm text-gray-500 max-w-xs mt-2">
          오더가 아직 접수 단계이거나 시뮬레이션 데이터가 생성되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="zen-timeline-container px-2">
      <ul className="zen-timeline">
        <AnimatePresence mode="popLayout">
          {events.map((event, index) => {
            const isFirst = index === 0;
            
            // 이벤트 코드별 아이콘 매핑
            const getIcon = (code: string) => {
              switch (code) {
                case 'DELIVERED': return <CheckCircle2 className="w-4 h-4" />;
                case 'OUT_FOR_DELIVERY': return <Truck className="w-4 h-4" />;
                case 'IN_TRANSIT': return <Truck className="w-4 h-4" />;
                case 'BOOKED': return <Package className="w-4 h-4" />;
                case 'EXCEPTION':
                case 'DELAYED': return <AlertCircle className="w-4 h-4" />;
                default: return <Package className="w-4 h-4" />;
              }
            };

            return (
              <motion.li 
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05 
                }}
                className={`zen-timeline-item ${isFirst ? 'is-latest' : ''}`}
              >
                <div className={`zen-timeline-dot ${isFirst ? 'active' : ''}`}>
                  <div className="zen-dot-inner">
                    {getIcon(event.event_code)}
                  </div>
                </div>
                
                <div className="zen-timeline-content">
                  <div className="zen-timeline-glass-shimmer" />
                  <div className="zen-timeline-header">
                    <div className="flex flex-col gap-0.5">
                      <span className="zen-timeline-status flex items-center gap-1.5">
                        {event.event_code}
                        {isFirst && (
                          <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="bg-blue-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20"
                          >
                            Live
                          </motion.span>
                        )}
                      </span>
                    </div>
                    <span className="zen-timeline-time flex items-center gap-1">
                      <Clock className="w-3 h-3 opacity-60" />
                      {format(new Date(event.event_time), "yyyy.MM.dd HH:mm")}
                    </span>
                  </div>

                  <div className="zen-timeline-body mt-3">
                    <div className="zen-timeline-location">
                      <div className="p-1 bg-red-50 dark:bg-red-950/30 rounded-md">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {event.location || "Location Unknown"}
                      </span>
                    </div>

                    <p className="zen-timeline-desc mt-2 text-gray-500 dark:text-gray-400">
                      {event.description}
                    </p>

                    {event.source_type === USER_ROLES.ADMIN && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[10px] text-amber-500/80 font-medium flex items-center gap-1.5 uppercase tracking-wider">
                        <Info className="w-3 h-3" />
                        Verified by Zenith Operations
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
