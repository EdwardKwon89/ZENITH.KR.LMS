"use client";

import { useState, useTransition } from "react";
import { Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

export default function NotificationsPageClient({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems]           = useState(initialNotifications);
  const [unread, setUnread]         = useState(initialUnreadCount);

  function handleRead(id: string, wasRead: boolean) {
    if (wasRead) return;
    startTransition(async () => {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnread((c) => Math.max(0, c - 1));
    });
  }

  function handleReadAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Package size={40} className="mb-3 opacity-30" />
        <p className="text-sm">알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleReadAll}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
          >
            <Check size={13} /> 모두 읽음 처리
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => handleRead(n.id, n.is_read)}
            className={cn(
              "flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors",
              !n.is_read && "bg-brand-50/30"
            )}
          >
            <div className="flex-shrink-0 mt-1">
              {!n.is_read ? (
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 block" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 block" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", n.is_read ? "text-slate-500" : "text-slate-900")}>
                {n.title}
              </p>
              <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1.5">
                {new Date(n.created_at).toLocaleString("ko-KR", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            {n.is_read && (
              <Check size={14} className="text-slate-300 flex-shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
