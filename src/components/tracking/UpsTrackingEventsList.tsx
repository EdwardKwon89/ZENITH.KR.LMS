"use client";

import React from "react";
import { ZenBadge } from "@/components/ui/ZenUI";
import { MapPin, Calendar, Clock, Package } from "lucide-react";

interface UpsTrackingEvent {
  id: string;
  tracking_number: string;
  event_date: string;
  event_time: string;
  event_code: string;
  event_desc: string;
  location_city: string | null;
  location_country: string | null;
}

interface UpsTrackingEventsListProps {
  events: UpsTrackingEvent[];
}

export default function UpsTrackingEventsList({ events }: UpsTrackingEventsListProps) {
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
                {event.event_desc}
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
              {event.event_time?.split(" ")[1] || event.event_time}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
