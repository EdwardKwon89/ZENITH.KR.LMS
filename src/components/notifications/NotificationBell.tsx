"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight } from "lucide-react";
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

interface NotificationBellProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

export default function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen]             = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount]     = useState(initialUnreadCount);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative transition-all"
        aria-label="알림"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">알림</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={isPending}
                  className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
                >
                  <Check size={12} /> 모두 읽음
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">새 알림이 없습니다</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                      !n.is_read && "bg-brand-50/40"
                    )}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                      )}
                      <div className={cn("flex-1", n.is_read && "pl-4")}>
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString("ko-KR", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="w-full flex items-center justify-center gap-1 py-3 text-xs text-brand-600 hover:bg-brand-50 border-t border-slate-100 transition-colors font-medium"
            >
              전체 알림 보기 <ChevronRight size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
