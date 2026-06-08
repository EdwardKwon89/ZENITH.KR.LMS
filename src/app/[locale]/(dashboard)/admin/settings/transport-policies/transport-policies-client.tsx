"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, X, Edit2 } from "lucide-react";
import { USER_ROLES } from "@/lib/auth/rbac";
import { ZenBadge } from "@/components/ui/ZenUI";
import { updateTransportPolicy } from "@/app/actions/admin/transport-policies";
import type { TransportPolicy, TransportPolicyData } from "@/app/actions/admin/transport-policies";

interface Props {
  initialPolicies: TransportPolicy[];
  userRole: string;
}

const MODE_LABELS: Record<string, string> = {
  WEIGHT_ONLY: "중량 단가 (Weight Only)",
  VOLUMETRIC: "부피 중량 (Volumetric)",
  WM: "W/M 병산",
};

const MODE_COLORS: Record<string, "success" | "default" | "warning" | "danger" | "info"> = {
  WEIGHT_ONLY: "info",
  VOLUMETRIC: "warning",
  WM: "success",
};

const TRANSPORT_LABELS: Record<string, string> = {
  AIR: "항공 (Air Freight)",
  EXP: "특송 (Express)",
  SEA: "해운 (Sea Freight)",
  LAND: "육상 (Truck / Land)",
};

export default function TransportPoliciesClient({ initialPolicies, userRole }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TransportPolicyData>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.ZENITH_SUPER_ADMIN;

  const startEdit = (policy: TransportPolicy) => {
    setEditForm({
      pricing_method: policy.pricing_method,
      volumetric_divisor: policy.volumetric_divisor,
      description: policy.description,
      is_active: policy.is_active,
    });
    setEditingId(policy.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      await updateTransportPolicy(id, editForm);
      setPolicies(prev =>
        prev.map(p => (p.id === id ? { ...p, ...editForm } : p))
      );
      setEditingId(null);
      setEditForm({});
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {policies.map((policy) => {
        const isEditing = editingId === policy.id;
        const modeLabel = MODE_LABELS[policy.pricing_method] || policy.pricing_method;
        const modeColor = MODE_COLORS[policy.pricing_method] || "default";

        return (
          <motion.div
            key={policy.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                  policy.transport_mode === 'AIR' ? 'bg-sky-500' :
                  policy.transport_mode === 'EXP' ? 'bg-violet-500' :
                  policy.transport_mode === 'SEA' ? 'bg-blue-600' :
                  'bg-emerald-600'
                }`}>
                  {policy.transport_mode.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {TRANSPORT_LABELS[policy.transport_mode] || policy.transport_mode}
                  </h3>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={editForm.pricing_method || ''}
                        onChange={(e) => setEditForm(f => ({ ...f, pricing_method: e.target.value as TransportPolicyData['pricing_method'] }))}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="WEIGHT_ONLY">중량 단가</option>
                        <option value="VOLUMETRIC">부피 중량</option>
                        <option value="WM">W/M 병산</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                        <input
                          type="checkbox"
                          checked={editForm.is_active ?? true}
                          onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                          className="rounded"
                        />
                        활성
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <ZenBadge variant={modeColor}>{modeLabel}</ZenBadge>
                      {!policy.is_active && (
                        <ZenBadge variant="danger">비활성</ZenBadge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(policy.id)}
                        disabled={saving === policy.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving === policy.id ? "저장 중..." : "저장"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(policy)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      편집
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Volumetric Divisor</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.volumetric_divisor ?? ''}
                    onChange={(e) => setEditForm(f => ({ ...f, volumetric_divisor: e.target.value ? Number(e.target.value) : null }))}
                    placeholder={policy.pricing_method === 'VOLUMETRIC' ? '필수 입력' : '미사용'}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900">
                    {policy.volumetric_divisor ?? <span className="text-slate-300 italic">미사용</span>}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Description</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value || null }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    {policy.description ?? <span className="text-slate-300 italic">설명 없음</span>}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
