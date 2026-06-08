'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, ShieldAlert, RefreshCw, ArrowUpDown } from 'lucide-react';
import { ZenCard } from '@/components/ui/ZenUI';
import { listMembers, changeMemberStatus, changeMemberGrade } from '@/app/actions/admin/member';

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string | null;
  grade_code: string | null;
  org_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
}

const STATUS_OPTIONS = ['', 'ACTIVE', 'PENDING', 'SUSPENDED'] as const;
const ROLE_OPTIONS = ['', 'INDIVIDUAL', 'CORPORATE', 'ADMIN', 'CARRIER'] as const;
const GRADE_OPTIONS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  SUPPLEMENT_REQUIRED: 'bg-purple-100 text-purple-800',
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMembers({
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        keyword: keyword || undefined,
        limit,
        offset,
      });
      setMembers(result.members);
      setTotal(result.total);
    } catch {
      alert('회원 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, keyword, offset]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleStatusChange = async (userId: string, status: string) => {
    const label = status === 'SUSPENDED' ? '이용 제한' : '이용 제한 해제';
    if (!confirm(`해당 회원을 ${label}하시겠습니까?`)) return;
    try {
      await changeMemberStatus(userId, status);
      fetchMembers();
    } catch {
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleGradeChange = async (userId: string, grade: string) => {
    if (!confirm(`회원 등급을 ${grade}로 변경하시겠습니까?`)) return;
    try {
      await changeMemberGrade(userId, grade);
      fetchMembers();
    } catch {
      alert('등급 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-500 font-bold tracking-tighter text-sm uppercase">
            <Users className="w-4 h-4" />
            System Administration
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            회원 관리
          </h1>
          <p className="text-slate-500">전체 회원 목록 — 등급 및 이용 상태를 관리합니다.</p>
        </div>
        <button
          onClick={fetchMembers}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </header>

      <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="이름 또는 이메일 검색"
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setOffset(0); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setOffset(0); }}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">전체 유형</option>
          {ROLE_OPTIONS.filter(Boolean).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="max-w-7xl mx-auto">
        <ZenCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">이름</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">이메일</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">유형</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">등급</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">상태</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">가입일</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">로딩 중...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">회원이 없습니다.</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{m.full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue={m.grade_code || 'IRON'}
                        onChange={e => handleGradeChange(m.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        {GRADE_OPTIONS.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_BADGE[m.status ?? ''] || 'bg-slate-100 text-slate-700'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(m.created_at ?? '').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {m.status !== 'SUSPENDED' ? (
                          <button
                            onClick={() => handleStatusChange(m.id, 'SUSPENDED')}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <ShieldAlert className="w-3 h-3 inline mr-1" />
                            정지
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(m.id, 'ACTIVE')}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" />
                            해제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">총 {total}명</span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(o => Math.max(0, o - limit))}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  이전
                </button>
                <button
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(o => o + limit)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </ZenCard>
      </div>
    </div>
  );
}
