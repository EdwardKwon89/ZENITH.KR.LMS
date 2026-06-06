"use client";

import { useState } from "react";
import type { AssignedOrder } from "@/app/actions/operations/assigned-orders";

interface Props {
  initialOrders: AssignedOrder[];
  userRole: string;
}

type TabType = 'ALL' | 'TRANSPORT' | 'CUSTOMS' | 'DELIVERY';

const TAB_LABELS: Record<TabType, string> = {
  ALL: '전체',
  TRANSPORT: '운송',
  CUSTOMS: '통관',
  DELIVERY: '배송',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: '요청',
  ACCEPTED: '승인',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export default function AssignedOrdersClient({ initialOrders, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  const filteredOrders = activeTab === 'ALL'
    ? initialOrders
    : initialOrders.filter(o => o.service_category === activeTab);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'TRANSPORT', label: '운송' },
    { key: 'CUSTOMS', label: '통관' },
    { key: 'DELIVERY', label: '배송' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab.key ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-medium">오더 번호</th>
                <th className="text-left p-3 font-medium">화주</th>
                <th className="text-center p-3 font-medium">서비스 유형</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-center p-3 font-medium">배정일</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-gray-400">
                    할당된 오더가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={`${order.id}-${order.service_type}`} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{order.order_no}</td>
                    <td className="p-3">{order.shipper_name || '-'}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        {order.service_type}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500">
                      {new Date(order.assigned_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
