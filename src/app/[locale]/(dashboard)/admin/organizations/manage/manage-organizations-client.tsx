'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building, Search, Plus, X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrganizationsAdmin, createOrganization, updateOrganization } from "@/app/actions/organization";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  SUPPLEMENT_REQUIRED: 'bg-purple-100 text-purple-800 border-purple-200',
};

const TYPE_BADGE: Record<string, string> = {
  PLATFORM: 'bg-indigo-100 text-indigo-800',
  CARRIER: 'bg-blue-100 text-blue-800',
  SHIPPER: 'bg-cyan-100 text-cyan-800',
  CUSTOMS: 'bg-teal-100 text-teal-800',
  DELIVERY: 'bg-orange-100 text-orange-800',
  CORPORATE: 'bg-slate-100 text-slate-800',
  INDIVIDUAL: 'bg-stone-100 text-stone-800',
};

interface ManageOrganizationsClientProps {
  initialOrganizations: any[];
  initialTotal: number;
  orgTypes: readonly string[];
  orgStatuses: readonly string[];
}

export default function ManageOrganizationsClient({
  initialOrganizations,
  initialTotal,
  orgTypes,
  orgStatuses,
}: ManageOrganizationsClientProps) {
  const [organizations, setOrganizations] = useState<any[]>(initialOrganizations);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [error, setError] = useState('');

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchOrganizations = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await getOrganizationsAdmin({
        type: filterType || undefined,
        status: filterStatus || undefined,
        keyword: keyword || undefined,
        page: p,
        pageSize,
      });
      setOrganizations(result.organizations);
      setTotal(result.total);
      setPage(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, keyword]);

  useEffect(() => {
    fetchOrganizations(1);
  }, [fetchOrganizations]);

  const handleCreate = async (formData: FormData) => {
    setError('');
    try {
      await createOrganization({
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        biz_no: (formData.get('biz_no') as string) || undefined,
        rep_name: (formData.get('rep_name') as string) || undefined,
        status: (formData.get('status') as string) || undefined,
      });
      setShowCreateModal(false);
      fetchOrganizations(1);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (orgId: string, status: string) => {
    try {
      await updateOrganization(orgId, { status });
      fetchOrganizations(page);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">조직 관리</h1>
          <p className="text-sm text-slate-500 mt-1">전체 조직을 조회·등록·관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin/organizations"
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            가입 승인 센터 →
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> 신규 조직 등록
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="조직명·사업자번호·대표자 검색..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">전체 유형</option>
          {orgTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">전체 상태</option>
          {orgStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">조직명</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">유형</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">사업자번호</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">대표자</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">상태</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">생성일</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-20 text-center text-slate-400">로딩 중...</td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-20 text-center text-slate-400">
                  <Building size={32} className="mx-auto mb-2 text-slate-200" />
                  등록된 조직이 없습니다.
                </td></tr>
              ) : organizations.map((org: any) => (
                <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{org.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", TYPE_BADGE[org.type] || 'bg-slate-100 text-slate-600')}>
                      {org.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{org.biz_no || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{org.rep_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", STATUS_BADGE[org.status] || 'bg-slate-100 text-slate-600')}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {org.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(org.id, 'SUSPENDED')}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="SUSPENDED"
                        >
                          <XCircle size={16} />
                        </button>
                      ) : org.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleUpdateStatus(org.id, 'ACTIVE')}
                          className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="ACTIVE"
                        >
                          <CheckCircle size={16} />
                        </button>
                      ) : null}
                      {org.status === 'PENDING' && (
                        <a
                          href="/admin/organizations"
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                          title="승인 처리"
                        >
                          승인→
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">총 {total}개 조직</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchOrganizations(page - 1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchOrganizations(page + 1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <form
            action={handleCreate}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building size={18} className="text-blue-500" /> 신규 조직 등록
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">조직명 *</label>
                <input name="name" required className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">유형 *</label>
                  <select name="type" required className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">선택</option>
                    {orgTypes.filter(t => t !== 'PLATFORM' && t !== 'INDIVIDUAL').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">상태</label>
                  <select name="status" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">사업자번호</label>
                  <input name="biz_no" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">대표자명</label>
                  <input name="rep_name" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                취소
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                등록
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
