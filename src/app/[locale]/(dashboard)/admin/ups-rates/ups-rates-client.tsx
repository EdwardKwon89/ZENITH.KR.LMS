'use client';

import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, XCircle, Globe, Package, DollarSign, Fuel, FileText, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { USER_ROLES } from '@/lib/auth/rbac';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import type { UpsZoneWithCountries, UpsProduct, UpsBaseRateWithRefs, UpsFuelSurcharge, UpsOtherCharge } from '@/types/ups';
import {
  createUpsZone, updateUpsZone, deleteUpsZone,
  addZoneCountry, removeZoneCountry,
  createUpsProduct, updateUpsProduct,
  upsertUpsBaseRate,
  upsertUpsFuelSurcharge,
  createUpsOtherCharge, updateUpsOtherCharge, deleteUpsOtherCharge,
  upsertAgencyPricingPolicy,
} from '@/app/actions/ups/rates-mutation';
import type { ColumnDef } from '@tanstack/react-table';

interface AgencyPolicy { id: string; agency_org_id: string; discount_rate: string; is_active: boolean; agency: { name: string } | null; }
interface Agency { id: string; name: string; }
interface FuelSurchargeRow extends UpsFuelSurcharge { product: { product_code: string; product_name: string } | null; }

interface Props {
  zones: UpsZoneWithCountries[];
  products: UpsProduct[];
  baseRates: UpsBaseRateWithRefs[];
  fuelSurcharges: FuelSurchargeRow[];
  otherCharges: UpsOtherCharge[];
  agencyPolicies: AgencyPolicy[];
  agencies: Agency[];
  userRole: string;
}

type TabKey = 'zones' | 'products' | 'baseRates' | 'fuelSurcharges' | 'otherCharges' | 'agencyPolicies';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'zones', label: 'Zone 관리', icon: Globe },
  { key: 'products', label: '제품 관리', icon: Package },
  { key: 'baseRates', label: '기준요금', icon: DollarSign },
  { key: 'fuelSurcharges', label: '유류할증', icon: Fuel },
  { key: 'otherCharges', label: '부가요금', icon: FileText },
  { key: 'agencyPolicies', label: 'Agency 할인율 정책', icon: Building },
];

export default function UpsRatesClient({ zones, products, baseRates, fuelSurcharges, otherCharges, agencyPolicies, agencies, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('zones');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const canEdit = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.ZENITH_SUPER_ADMIN;

  const resetForm = useCallback(() => { setForm({}); setEditingItem(null); }, []);

  const openNew = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (item: any) => { setForm({ ...item }); setEditingItem(item); setIsModalOpen(true); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submit: Record<string, any> = { zones: createUpsZone, products: createUpsProduct, baseRates: upsertUpsBaseRate, fuelSurcharges: upsertUpsFuelSurcharge, otherCharges: createUpsOtherCharge, agencyPolicies: upsertAgencyPricingPolicy };
      const update: Record<string, any> = { zones: updateUpsZone, products: updateUpsProduct, otherCharges: updateUpsOtherCharge };
      if (editingItem && update[activeTab]) {
        const { error } = await update[activeTab](editingItem.id, form);
        if (error) throw new Error(error);
      } else if (submit[activeTab]) {
        const { error } = await submit[activeTab](form);
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
    if (!confirm('비활성화하시겠습니까?')) return;
    setLoading(true);
    try {
      const del: Record<string, any> = { zones: deleteUpsZone, products: (id: string) => updateUpsProduct(id, { is_active: false }), otherCharges: deleteUpsOtherCharge };
      await del[activeTab]?.(id);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'zones': return <ZoneForm form={form} setForm={setForm} editingItem={editingItem} zones={zones} addZoneCountry={addZoneCountry} removeZoneCountry={removeZoneCountry} />;
      case 'products': return <ProductForm form={form} setForm={setForm} editingItem={editingItem} />;
      case 'baseRates': return <BaseRateForm form={form} setForm={setForm} products={products} zones={zones} />;
      case 'fuelSurcharges': return <FuelSurchargeForm form={form} setForm={setForm} products={products} />;
      case 'otherCharges': return <OtherChargeForm form={form} setForm={setForm} editingItem={editingItem} />;
      case 'agencyPolicies': return <AgencyPolicyForm form={form} setForm={setForm} agencies={agencies} />;
      default: return null;
    }
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'zones': return <ZoneTable zones={zones} canEdit={canEdit} onEdit={openEdit} onDelete={handleDelete} />;
      case 'products': return <ProductTable products={products} canEdit={canEdit} onEdit={openEdit} onDelete={handleDelete} />;
      case 'baseRates': return <BaseRateTable baseRates={baseRates} />;
      case 'fuelSurcharges': return <FuelSurchargeTable rows={fuelSurcharges} />;
      case 'otherCharges': return <OtherChargeTable otherCharges={otherCharges} canEdit={canEdit} onEdit={openEdit} onDelete={handleDelete} />;
      case 'agencyPolicies': return <AgencyPolicyTable policies={agencyPolicies} canEdit={canEdit} onEdit={openEdit} agencies={agencies} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setIsModalOpen(false); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key ? 'border-brand-600 text-brand-700 bg-brand-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        {canEdit && activeTab !== 'baseRates' && activeTab !== 'fuelSurcharges' && (
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20">
            <Plus size={18} />
            {activeTab === 'zones' ? 'Zone 등록' : activeTab === 'products' ? '제품 등록' : activeTab === 'otherCharges' ? '부가요금 등록' : activeTab === 'agencyPolicies' ? '할인율 정책 등록' : '등록'}
          </button>
        )}
      </div>

      {renderTable()}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">{editingItem ? '수정' : '등록'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={20} className="text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {renderForm()}
                <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50">
                  {loading ? '저장 중...' : editingItem ? '수정 완료' : '등록'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Zone ─────────────────────────────────────────────────────

function ZoneForm({ form, setForm, editingItem, zones, addZoneCountry, removeZoneCountry }: any) {
  const [countryCode, setCountryCode] = useState('');
  const [countryFamily, setCountryFamily] = useState('EXPRESS');
  const [countryDirection, setCountryDirection] = useState('EXPORT');
  const zoneCountries = zones.find((z: any) => z.id === form.id)?.countries ?? form.countries ?? [];

  const handleAddCountry = async () => {
    if (!countryCode.trim()) return;
    const zoneId = editingItem?.id || form.id;
    if (!zoneId) return;
    await addZoneCountry(zoneId, countryCode.trim(), countryFamily, countryDirection);
    setCountryCode('');
    window.location.reload();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zone 코드" value={form.zone_code} onChange={(v: string) => setForm({ ...form, zone_code: v?.toUpperCase() })} placeholder="Z1" />
        <Field label="Sort Order" type="number" value={form.sort_order} onChange={(v: any) => setForm({ ...form, sort_order: v ? Number(v) : 0 })} />
      </div>
      <Field label="Zone 명칭" value={form.zone_name} onChange={(v: string) => setForm({ ...form, zone_name: v })} />
      <Field label="설명" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} />
      {editingItem && !editingItem._isNew && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-500 uppercase">국가 매핑</label>
          <div className="flex gap-2">
            <input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} placeholder="ISO 3자리 코드" maxLength={3} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
            <select value={countryFamily} onChange={e => setCountryFamily(e.target.value)} className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium">
              <option value="EXPRESS">EXPRESS</option>
              <option value="SAVER">SAVER</option>
              <option value="EXPEDITED">EXPEDITED</option>
              <option value="FREIGHT">FREIGHT</option>
            </select>
            <select value={countryDirection} onChange={e => setCountryDirection(e.target.value)} className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium">
              <option value="EXPORT">EXPORT</option>
              <option value="IMPORT">IMPORT</option>
            </select>
            <button onClick={handleAddCountry} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-all">추가</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(zoneCountries as any[]).map((c: any) => (
              <span key={c.id || c.country_code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-mono font-medium">
                {c.country_code}
                {c.product_family && <span className="text-[10px] text-slate-400">| {c.product_family}</span>}
                {c.direction && <span className="text-[10px] text-slate-400">| {c.direction}</span>}
                <button onClick={() => removeZoneCountry(c.id)} className="text-slate-400 hover:text-rose-500"><XCircle size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Product ──────────────────────────────────────────────────

function ProductForm({ form, setForm, editingItem }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="제품 코드" value={form.product_code} onChange={(v: string) => setForm({ ...form, product_code: v?.toUpperCase() })} />
        <Field label="서브 코드" value={form.sub_code} onChange={(v: string) => setForm({ ...form, sub_code: v })} />
      </div>
      <Field label="제품명" value={form.product_name} onChange={(v: string) => setForm({ ...form, product_name: v })} />
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase">화물 유형</label>
        <select value={form.cargo_type || 'BOTH'} onChange={e => setForm({ ...form, cargo_type: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <option value="DOC">서류</option>
          <option value="NON_DOC">비서류</option>
          <option value="BOTH">전체</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Box 최대중량 (kg, Box 상품만)" type="number" value={form.max_weight_kg} onChange={(v: any) => setForm({ ...form, max_weight_kg: v ? Number(v) : null })} />
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ddu_available ?? false} onChange={e => setForm({ ...form, ddu_available: e.target.checked })} /> DDU 가능</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ddp_available ?? false} onChange={e => setForm({ ...form, ddp_available: e.target.checked })} /> DDP 가능</label>
        </div>
      </div>
      <Field label="Sort Order" type="number" value={form.sort_order} onChange={(v: any) => setForm({ ...form, sort_order: v ? Number(v) : 0 })} />
      {editingItem && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> 활성</label>
      )}
    </>
  );
}

// ─── Base Rate ────────────────────────────────────────────────

function BaseRateForm({ form, setForm, products, zones }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">제품</label>
          <select value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <option value="">선택</option>
            {(products as UpsProduct[]).map((p: any) => <option key={p.id} value={p.id}>{p.product_code} - {p.product_name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Zone</label>
          <select value={form.zone_id || ''} onChange={e => setForm({ ...form, zone_id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <option value="">선택</option>
            {(zones as UpsZoneWithCountries[]).map((z: any) => <option key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</option>)}
          </select>
        </div>
      </div>
      <Field label="중량 (kg)" type="number" step="0.5" value={form.weight_kg} onChange={(v: any) => setForm({ ...form, weight_kg: v ? Number(v) : '' })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="판매가 (KRW)" type="number" value={form.selling_price} onChange={(v: any) => setForm({ ...form, selling_price: v ? Number(v) : '' })} />
        <Field label="원가 (KRW, 원본)" type="number" value={form.cost_price} onChange={(v: any) => setForm({ ...form, cost_price: v ? Number(v) : '' })} />
      </div>
      <p className="text-xs text-slate-400">※ 원가표 원본값을 입력하세요. 시스템이 +7%를 자동 적용합니다.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="시작일" type="date" value={form.valid_from} onChange={(v: string) => setForm({ ...form, valid_from: v })} />
        <Field label="종료일" type="date" value={form.valid_until || ''} onChange={(v: string) => setForm({ ...form, valid_until: v || null })} />
      </div>
    </>
  );
}

// ─── Fuel Surcharge ──────────────────────────────────────────

function FuelSurchargeForm({ form, setForm, products }: any) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase">적용 제품 (선택)</label>
        <select value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: e.target.value || null })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <option value="">전체 제품</option>
          {(products as UpsProduct[]).map((p: any) => <option key={p.id} value={p.id}>{p.product_code}</option>)}
        </select>
      </div>
      <Field label="적용 주차 (월요일 기준)" type="date" value={form.effective_week} onChange={(v: string) => setForm({ ...form, effective_week: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="판매 할증률 (%)" type="number" step="0.001" value={form.selling_rate != null ? form.selling_rate * 100 : ''} onChange={(v: any) => setForm({ ...form, selling_rate: v ? Number(v) / 100 : 0 })} />
        <Field label="원가 할증률 (%)" type="number" step="0.001" value={form.cost_rate != null ? form.cost_rate * 100 : ''} onChange={(v: any) => setForm({ ...form, cost_rate: v ? Number(v) / 100 : 0 })} />
      </div>
    </>
  );
}

// ─── Other Charge ────────────────────────────────────────────

function OtherChargeForm({ form, setForm, editingItem }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Charge Code" value={form.charge_code} onChange={(v: string) => setForm({ ...form, charge_code: v?.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} placeholder="DUTY_AMOUNT" />
        <Field label="단위" value={form.unit || 'LOT'} onChange={(v: string) => setForm({ ...form, unit: v?.toUpperCase() })} placeholder="PKG / KG / LOT" />
      </div>
      <Field label="명칭" value={form.charge_name} onChange={(v: string) => setForm({ ...form, charge_name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="판매가" type="number" value={form.selling_price ?? ''} onChange={(v: any) => setForm({ ...form, selling_price: v ? Number(v) : null })} />
        <Field label="원가" type="number" value={form.cost_price ?? ''} onChange={(v: any) => setForm({ ...form, cost_price: v ? Number(v) : null })} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.fuel_surcharge_applicable ?? false} onChange={e => setForm({ ...form, fuel_surcharge_applicable: e.target.checked })} /> 유류할증 부과 대상</label>
      {editingItem && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> 활성</label>
      )}
    </>
  );
}

// ─── Agency Policy ───────────────────────────────────────────

function AgencyPolicyForm({ form, setForm, agencies }: any) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase">대리점</label>
        <select value={form.agency_org_id || ''} onChange={e => setForm({ ...form, agency_org_id: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <option value="">선택</option>
          {(agencies as Agency[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <Field label="할인율 (%)" type="number" step="0.01" value={form.discount_rate != null ? Number(form.discount_rate) * 100 : ''} onChange={(v: any) => setForm({ ...form, discount_rate: v ? Number(v) / 100 : 0 })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> 활성</label>
    </>
  );
}

// ─── Tables ──────────────────────────────────────────────────

function ZoneTable({ zones, canEdit, onEdit, onDelete }: any) {
  const columns: ColumnDef<UpsZoneWithCountries>[] = [
    { accessorKey: 'zone_code', header: '코드', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone_code}</ZenBadge> },
    { accessorKey: 'zone_name', header: '명칭' },
    { accessorKey: 'description', header: '설명', cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.description ?? '-'}</span> },
    { id: 'countries', header: '국가 (서비스/방향)', cell: ({ row }) => <span className="font-mono text-xs leading-relaxed">{row.original.countries.map(c => `${c.country_code}(${c.product_family ?? 'EXPRESS'}/${c.direction ?? 'EXPORT'})`).join(', ')}</span> },
    { accessorKey: 'sort_order', header: '순서', cell: ({ row }) => <span className="text-sm font-mono">{row.original.sort_order}</span> },
    ...(canEdit ? [{ id: 'actions' as const, header: '관리', cell: ({ row }: any) => <ActionsCell row={row} onEdit={onEdit} onDelete={onDelete} /> }] : []),
  ];
  return <ZenDataGrid columns={columns} data={zones} />;
}

function ProductTable({ products, canEdit, onEdit, onDelete }: any) {
  const columns: ColumnDef<UpsProduct>[] = [
    { accessorKey: 'product_code', header: '코드', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.product_code}</ZenBadge> },
    { accessorKey: 'product_name', header: '명칭' },
    { accessorKey: 'cargo_type', header: '유형', cell: ({ row }) => <ZenBadge variant={row.original.cargo_type === 'DOC' ? 'info' : 'warning'}>{row.original.cargo_type}</ZenBadge> },
    { id: 'max_weight_kg', header: 'Box 최대중량', cell: ({ row }) => <span className="font-mono text-xs">{row.original.max_weight_kg != null ? `${row.original.max_weight_kg}kg` : '-'}</span> },
    { id: 'ddu', header: 'DDU', cell: ({ row }) => <ZenBadge variant={row.original.ddu_available ? 'success' : 'default'}>{row.original.ddu_available ? '가능' : '불가'}</ZenBadge> },
    { id: 'ddp', header: 'DDP', cell: ({ row }) => <ZenBadge variant={row.original.ddp_available ? 'success' : 'default'}>{row.original.ddp_available ? '가능' : '불가'}</ZenBadge> },
    { accessorKey: 'sort_order', header: '순서', cell: ({ row }) => <span className="font-mono text-sm">{row.original.sort_order}</span> },
    ...(canEdit ? [{ id: 'actions' as const, header: '관리', cell: ({ row }: any) => <ActionsCell row={row} onEdit={onEdit} onDelete={onDelete} /> }] : []),
  ];
  return <ZenDataGrid columns={columns} data={products} />;
}

function BaseRateTable({ baseRates }: any) {
  const columns: ColumnDef<UpsBaseRateWithRefs>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { accessorKey: 'weight_kg', header: '중량', cell: ({ row }) => <span className="font-mono text-sm">{row.original.weight_kg}kg</span> },
    { accessorKey: 'selling_price', header: '판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.selling_price.toLocaleString()}원</span> },
    { accessorKey: 'cost_price', header: '원가', cell: ({ row }) => <span className="font-mono text-sm text-slate-500">{row.original.cost_price.toLocaleString()}원</span> },
    { id: 'validity', header: '유효기간', cell: ({ row }) => <span className="text-xs font-mono text-slate-500">{row.original.valid_from}~{row.original.valid_until ?? '무기한'}</span> },
  ];
  return <ZenDataGrid columns={columns} data={baseRates} />;
}

function FuelSurchargeTable({ rows }: any) {
  const columns: ColumnDef<FuelSurchargeRow>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm">{row.original.product?.product_code ?? '전체'}</span> },
    { accessorKey: 'effective_week', header: '적용 주차', cell: ({ row }) => <span className="font-mono text-sm">{row.original.effective_week}</span> },
    { accessorKey: 'selling_rate', header: '판매 할증', cell: ({ row }) => <span className="font-mono text-sm">{(Number(row.original.selling_rate) * 100).toFixed(1)}%</span> },
    { accessorKey: 'cost_rate', header: '원가 할증', cell: ({ row }) => <span className="font-mono text-sm text-slate-500">{(Number(row.original.cost_rate) * 100).toFixed(1)}%</span> },
  ];
  return <ZenDataGrid columns={columns} data={rows} />;
}

function OtherChargeTable({ otherCharges, canEdit, onEdit, onDelete }: any) {
  const columns: ColumnDef<UpsOtherCharge>[] = [
    { accessorKey: 'charge_code', header: '코드', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.charge_code}</ZenBadge> },
    { accessorKey: 'charge_name', header: '명칭' },
    { accessorKey: 'unit', header: '단위', cell: ({ row }) => <span className="text-xs font-mono">{row.original.unit}</span> },
    { accessorKey: 'selling_price', header: '판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.selling_price?.toLocaleString() ?? '-'}원</span> },
    { accessorKey: 'cost_price', header: '원가', cell: ({ row }) => <span className="font-mono text-sm text-slate-500">{row.original.cost_price?.toLocaleString() ?? '-'}원</span> },
    { id: 'fuel', header: '유류할증', cell: ({ row }) => <ZenBadge variant={row.original.fuel_surcharge_applicable ? 'success' : 'default'}>{row.original.fuel_surcharge_applicable ? '적용' : '미적용'}</ZenBadge> },
    ...(canEdit ? [{ id: 'actions' as const, header: '관리', cell: ({ row }: any) => <ActionsCell row={row} onEdit={onEdit} onDelete={onDelete} /> }] : []),
  ];
  return <ZenDataGrid columns={columns} data={otherCharges} />;
}

function AgencyPolicyTable({ policies, canEdit, onEdit, agencies }: any) {
  const orgMap = Object.fromEntries((agencies as Agency[]).map((a: any) => [a.id, a.name]));
  const columns: ColumnDef<AgencyPolicy>[] = [
    { id: 'agency', header: '대리점', cell: ({ row }) => <span className="font-medium">{row.original.agency?.name ?? orgMap[row.original.agency_org_id] ?? row.original.agency_org_id}</span> },
    { accessorKey: 'discount_rate', header: '할인율', cell: ({ row }) => <span className="font-mono font-semibold text-brand-700">{(Number(row.original.discount_rate) * 100).toFixed(2)}%</span> },
    { id: 'status', header: '상태', cell: ({ row }) => <ZenBadge variant={row.original.is_active ? 'success' : 'default'}>{row.original.is_active ? '활성' : '비활성'}</ZenBadge> },
    ...(canEdit ? [{ id: 'actions' as const, header: '관리', cell: ({ row }: any) => <ActionsCell row={row} onEdit={onEdit} onDelete={() => {}} /> }] : []),
  ];
  return <ZenDataGrid columns={columns} data={policies} />;
}

// ─── Shared ──────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder, step }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
      {type === 'select' ? (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">{placeholder && <option value="">{placeholder}</option>}</select>
      ) : (
        <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)} placeholder={placeholder} step={step}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
      )}
    </div>
  );
}

function ActionsCell({ row, onEdit, onDelete }: any) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onEdit(row.original)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"><Edit2 size={16} /></button>
      <button onClick={() => onDelete(row.original.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
    </div>
  );
}
