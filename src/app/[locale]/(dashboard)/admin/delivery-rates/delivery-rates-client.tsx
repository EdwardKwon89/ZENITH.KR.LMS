"use client";

import { useState, useCallback } from "react";
import { USER_ROLES } from "@/lib/auth/rbac";
import {
  createDeliveryRate,
  updateDeliveryRate,
  deleteDeliveryRate,
} from "@/app/actions/admin/delivery-rates";
import type { DeliveryRate, CreateDeliveryRateData } from "@/app/actions/admin/delivery-rates";

interface Organization {
  id: string;
  name: string;
}

interface Props {
  initialRates: DeliveryRate[];
  organizations: Organization[];
  userRole: string;
  userOrgId: string;
}

type TabType = 'LOCAL' | 'TOTAL';

export default function DeliveryRatesClient({ initialRates, organizations, userRole, userOrgId }: Props) {
  const [rates, setRates] = useState(initialRates);
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<DeliveryRate | null>(null);
  const [form, setForm] = useState<CreateDeliveryRateData>({
    org_id: userRole === USER_ROLES.DELIVERY_AGENT ? userOrgId : '',
    service_type: 'LOCAL',
    country_code: null,
    transport_mode: null,
    origin_code: null,
    dest_code: null,
    currency: 'USD',
    cost_per_kg: null,
    cost_per_cbm: null,
    transit_days: null,
    valid_from: '',
    valid_until: null,
  });
  const [loading, setLoading] = useState(false);

  const canEdit = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.DELIVERY_AGENT;
  const isAgent = userRole === USER_ROLES.DELIVERY_AGENT;

  const resetForm = useCallback((serviceType: TabType) => {
    setForm({
      org_id: isAgent ? userOrgId : '',
      service_type: serviceType,
      country_code: null,
      transport_mode: null,
      origin_code: null,
      dest_code: null,
      currency: 'USD',
      cost_per_kg: null,
      cost_per_cbm: null,
      transit_days: null,
      valid_from: '',
      valid_until: null,
    });
    setEditingRate(null);
  }, [isAgent, userOrgId]);

  const openEdit = (rate: DeliveryRate) => {
    setForm({
      org_id: rate.org_id,
      service_type: rate.service_type as TabType,
      country_code: rate.country_code,
      transport_mode: rate.transport_mode,
      origin_code: rate.origin_code,
      dest_code: rate.dest_code,
      currency: rate.currency,
      cost_per_kg: rate.cost_per_kg,
      cost_per_cbm: rate.cost_per_cbm,
      transit_days: rate.transit_days,
      valid_from: rate.valid_from,
      valid_until: rate.valid_until,
    });
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.org_id || !form.valid_from) return;

    setLoading(true);
    try {
      if (editingRate) {
        const { error } = await updateDeliveryRate(editingRate.id, form);
        if (error) throw new Error(error);
      } else {
        const { error } = await createDeliveryRate(form);
        if (error) throw new Error(error);
      }
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 요율을 비활성화하시겠습니까?')) return;
    setLoading(true);
    try {
      const { error } = await deleteDeliveryRate(id);
      if (error) throw new Error(error);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRates = rates.filter(r => {
    if (r.service_type !== activeTab) return false;
    if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER) return true;
    if (isAgent) return r.org_id === userOrgId;
    return r.is_active;
  });

  const orgMap = Object.fromEntries(organizations.map(o => [o.id, o.name]));

  const tabs: { key: TabType; label: string }[] = [
    { key: 'LOCAL', label: '배송(Local)' },
    { key: 'TOTAL', label: '배송(Total)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); resetForm(tab.key); }}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab.key ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={() => { resetForm(activeTab); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + 신규 등록
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-medium">조직</th>
                {activeTab === 'LOCAL' ? (
                  <th className="text-left p-3 font-medium">국가</th>
                ) : (
                  <>
                    <th className="text-center p-3 font-medium">운송수단</th>
                    <th className="text-center p-3 font-medium">출발</th>
                    <th className="text-center p-3 font-medium">도착</th>
                  </>
                )}
                <th className="text-right p-3 font-medium">무게/kg</th>
                <th className="text-right p-3 font-medium">부피/CBM</th>
                <th className="text-center p-3 font-medium">통화</th>
                <th className="text-center p-3 font-medium">소요일</th>
                <th className="text-center p-3 font-medium">유효기간</th>
                <th className="text-center p-3 font-medium">상태</th>
                {canEdit && <th className="text-center p-3 font-medium">관리</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? (activeTab === 'TOTAL' ? 10 : 8) : (activeTab === 'TOTAL' ? 9 : 7)} className="text-center p-6 text-gray-400">
                    등록된 배송 요율이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => (
                  <tr key={rate.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{orgMap[rate.org_id] || rate.org_id}</td>
                    {activeTab === 'LOCAL' ? (
                      <td className="p-3 font-medium">{rate.country_code}</td>
                    ) : (
                      <>
                        <td className="p-3 text-center font-medium">{rate.transport_mode}</td>
                        <td className="p-3 text-center">{rate.origin_code}</td>
                        <td className="p-3 text-center">{rate.dest_code}</td>
                      </>
                    )}
                    <td className="p-3 text-right">{rate.cost_per_kg?.toLocaleString() ?? '-'}</td>
                    <td className="p-3 text-right">{rate.cost_per_cbm?.toLocaleString() ?? '-'}</td>
                    <td className="p-3 text-center">{rate.currency}</td>
                    <td className="p-3 text-center">{rate.transit_days ?? '-'}</td>
                    <td className="p-3 text-center text-xs">
                      {rate.valid_from} ~ {rate.valid_until ?? '무기한'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${rate.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rate.is_active ? '활성' : '만료'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="p-3 text-center space-x-1">
                        <button onClick={() => openEdit(rate)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">수정</button>
                        <button onClick={() => handleDelete(rate.id)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingRate ? '배송 요율 수정' : '배송 요율 등록'} ({activeTab === 'LOCAL' ? 'Local' : 'Total'})</h2>
            <div className="space-y-3">
              {!isAgent && (
                <div>
                  <label className="block text-sm font-medium mb-1">배송사 조직</label>
                  <select
                    value={form.org_id}
                    onChange={e => setForm({ ...form, org_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">선택</option>
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {activeTab === 'LOCAL' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">국가 코드</label>
                  <input
                    type="text"
                    value={form.country_code ?? ''}
                    onChange={e => setForm({ ...form, country_code: e.target.value.toUpperCase() || null })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="KR, US, JP..."
                    maxLength={3}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">운송수단</label>
                    <select value={form.transport_mode ?? ''} onChange={e => setForm({ ...form, transport_mode: e.target.value || null })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">선택</option>
                      <option value="AIR">항공</option>
                      <option value="SEA">해상</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">출발항</label>
                    <input type="text" value={form.origin_code ?? ''} onChange={e => setForm({ ...form, origin_code: e.target.value.toUpperCase() || null })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ICN, LAX..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">도착항</label>
                    <input type="text" value={form.dest_code ?? ''} onChange={e => setForm({ ...form, dest_code: e.target.value.toUpperCase() || null })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="NRT, JFK..." />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">무게/kg</label>
                  <input type="number" value={form.cost_per_kg ?? ''} onChange={e => setForm({ ...form, cost_per_kg: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">부피/CBM</label>
                  <input type="number" value={form.cost_per_cbm ?? ''} onChange={e => setForm({ ...form, cost_per_cbm: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">통화</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="USD">USD</option>
                    <option value="KRW">KRW</option>
                    <option value="JPY">JPY</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">시작일</label>
                  <input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">종료일 (선택)</label>
                  <input type="date" value={form.valid_until ?? ''} onChange={e => setForm({ ...form, valid_until: e.target.value || null })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">소요일 (선택)</label>
                <input type="number" value={form.transit_days ?? ''} onChange={e => setForm({ ...form, transit_days: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.org_id || !form.valid_from}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
