"use client";

import React from "react";
import { useLocale } from "next-intl";
import { ZenBadge } from "@/components/ui/ZenUI";
import { MapPin, Calendar, Clock, Package } from "lucide-react";
import { pickShxkLocaleText } from "@/lib/shxk/translate";

interface UpsTrackingEvent {
  id: string;
  tracking_number: string;
  event_date: string;
  event_time: string;
  event_code: string;
  event_desc: string;
  event_desc_ko?: string | null;
  event_desc_en?: string | null;
  location_city: string | null;
  location_country: string | null;
}

interface UpsTrackingEventsListProps {
  events: UpsTrackingEvent[];
}

export default function UpsTrackingEventsList({ events }: UpsTrackingEventsListProps) {
  const locale = useLocale();

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <Package size={32} className="text-slate-300 mb-3" />
        <p className="text-xs font-semibold">
          UPS 트래킹 이벤트가 없습니다.
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          IN_TRANSIT 상태에서 폴링이 시작됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all"
        >
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <ZenBadge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                {event.event_code}
              </ZenBadge>
              <span className="text-xs font-semibold text-slate-700">
                {/* TASK-B-290 (④): 로케일별 번역 표출 — ko/en 번역본 없으면 중문 원문 */}
                {pickShxkLocaleText(locale, event.event_desc, event.event_desc_ko, event.event_desc_en)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {event.location_city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {event.location_city}
                {event.location_country && `, ${event.location_country}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {event.event_date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {/* TASK-B-290 (⑤): event_time은 TIME 포맷("HH:MM:SS")이라 split(" ")[1] 가정 제거 */}
              {event.event_time}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
