"use client";

import { useEffect, useState } from "react";
import { 
  getCodeGroups, 
  getCommonCodes, 
  upsertCommonCode, 
  deleteCommonCode 
} from "@/app/actions/master";
import { ZenCard, ZenButton, ZenBadge, ZenInput } from "@/components/ui/ZenUI";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Settings2,
  Database,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MasterCodesPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Edit State
  const [editingCode, setEditingCode] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsData, codesData] = await Promise.all([
        getCodeGroups(),
        getCommonCodes()
      ]);
      setGroups(groupsData);
      setCodes(codesData);
      if (groupsData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsData[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch codes:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;

    try {
      await upsertCommonCode(editingCode);
      setEditingCode(null);
      setIsAdding(false);
      fetchData();
    } catch (error) {
      alert("저장 실패: " + error);
    }
  };

  const handleDelete = async (groupId: string, code: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteCommonCode(groupId, code);
      fetchData();
    } catch (error) {
      alert("삭제 실패: " + error);
    }
  };

  const filteredCodes = codes.filter(c => 
    c.group_id === selectedGroupId && 
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest text-[10px] uppercase">
            <Database className="w-3.5 h-3.5" />
            Governance Master Data
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">공통코드 관리</h1>
          <p className="text-slate-400 text-sm">시스템 전반에서 사용되는 표준 코드 체계를 정의하고 제어합니다.</p>
        </div>
        
        <ZenButton 
          onClick={() => {
            setIsAdding(true);
            setEditingCode({ group_id: selectedGroupId, code: "", name: "", sort_order: 0, is_active: true });
          }}
          className="bg-blue-600 text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          신규 코드 추가
        </ZenButton>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar: Groups */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
            <Filter className="w-3 h-3" />
            Code Groups
          </div>
          <div className="space-y-1">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 flex flex-col gap-0.5",
                  selectedGroupId === group.id 
                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className="font-bold text-sm">{group.name}</span>
                <span className="text-[10px] font-mono opacity-50">{group.id}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content: Codes List */}
        <main className="col-span-12 md:col-span-9 space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="코드명 또는 코드값으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none pl-10 pr-4 py-2 text-sm focus:ring-0 placeholder:text-slate-300"
              />
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-4 text-xs font-medium text-slate-400">
              Total {filteredCodes.length} items
            </div>
          </div>

          {/* Table / Cards Grid */}
          <div className="grid gap-4">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <div className="inline-block w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-mono tracking-widest">LOADING_STANDARDS...</p>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-300 text-sm">해당 그룹에 등록된 코드가 없습니다.</p>
              </div>
            ) : (
              filteredCodes.map(item => (
                <ZenCard key={item.code} className="p-0 overflow-hidden border-slate-100 group">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-mono font-bold text-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        {item.code}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          {item.is_active ? (
                            <ZenBadge variant="success" className="text-[9px] px-2 py-0">ACTIVE</ZenBadge>
                          ) : (
                            <ZenBadge variant="default" className="text-[9px] px-2 py-0">INACTIVE</ZenBadge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">{item.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCode(item);
                          setIsAdding(false);
                        }}
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.group_id, item.code)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-slate-50 group-hover:bg-blue-100 transition-colors" />
                </ZenCard>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal: Add/Edit Code */}
      {(isAdding || editingCode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <ZenCard className="w-full max-w-lg bg-white p-0 overflow-hidden shadow-2xl scale-in-center">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 tracking-tight">
                  {isAdding ? "신규 코드 등록" : "코드 정보 수정"}
                </h3>
              </div>
              <button onClick={() => {setEditingCode(null); setIsAdding(false);}} className="text-slate-300 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Code ID (Key)</label>
                  <ZenInput 
                    value={editingCode.code}
                    onChange={(e) => setEditingCode({...editingCode, code: e.target.value})}
                    placeholder="e.g. 10, AIR, PENDING"
                    disabled={!isAdding}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Code Name (Label)</label>
                  <ZenInput 
                    value={editingCode.name}
                    onChange={(e) => setEditingCode({...editingCode, name: e.target.value})}
                    placeholder="e.g. 항공, 대기중"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</label>
                <textarea 
                  value={editingCode.description || ""}
                  onChange={(e) => setEditingCode({...editingCode, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all h-24 resize-none"
                  placeholder="코드에 대한 설명을 입력하세요..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sort Order</label>
                  <ZenInput 
                    type="number"
                    value={editingCode.sort_order}
                    onChange={(e) => setEditingCode({...editingCode, sort_order: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input 
                    type="checkbox"
                    id="is_active"
                    checked={editingCode.is_active}
                    onChange={(e) => setEditingCode({...editingCode, is_active: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-slate-700 select-none">활성화 상태</label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <ZenButton type="submit" className="flex-1 bg-blue-600 text-white rounded-2xl py-4 shadow-xl shadow-blue-100">
                  <Save className="w-4 h-4 mr-2" />
                  코드 정보 저장
                </ZenButton>
                <ZenButton type="button" variant="ghost" onClick={() => {setEditingCode(null); setIsAdding(false);}}>
                  취소
                </ZenButton>
              </div>
            </form>
          </ZenCard>
        </div>
      )}
    </div>
  );
}
