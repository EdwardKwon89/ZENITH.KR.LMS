import { Bell, Check } from "lucide-react";
import { getNotifications } from "@/app/actions/notifications";
import NotificationsPageClient from "./NotificationsPageClient";

export default async function NotificationsPage() {
  const { notifications, unreadCount } = await getNotifications(50, 0).catch(() => ({
    notifications: [],
    unreadCount: 0,
  }));

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-xl">
            <Bell className="text-brand-600" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">알림</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-500">미읽음 {unreadCount}건</p>
            )}
          </div>
        </div>
      </div>

      <NotificationsPageClient
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
