'use client';

import { useState } from 'react';
import { ZenCard, ZenButton } from '@/components/ui/ZenUI';
import { 
  Settings, 
  Shield, 
  Globe, 
  Save, 
  RotateCcw, 
  Activity, 
  Terminal,
  Info,
  CheckCircle2,
  AlertCircle,
  Hash,
  FileJson,
  Type,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateSystemParam, getSystemParams } from '@/app/actions/master';
import { useParams } from 'next/navigation';

interface SystemParam {
  id: string;
  key: string;
  category: string;
  value_text: string | null;
  value_numeric: number | null;
  value_jsonb: any | null;
  description: string;
  updated_at: string;
}

interface AdminSettingsClientProps {
  initialData: any[];
}

export default function AdminSettingsClient({ initialData }: AdminSettingsClientProps) {
  const params = useParams();
  const locale = params.locale as string;
  const [paramsList, setParamsList] = useState<SystemParam[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchParams = async () => {
    setLoading(true);
    try {
      const data = await getSystemParams();
      setParamsList(data);
    } catch (error: any) {
      showToast('설정을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, field: 'value_text' | 'value_numeric' | 'value_jsonb', value: any) => {
    setParamsList(prev => prev.map(p => {
      if (p.key === key) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSave = async (key: string) => {
    const param = paramsList.find(p => p.key === key);
    if (!param) return;

    setSaving(key);
    try {
      const payload = {
        value_text: param.value_text,
        value_numeric: param.value_numeric,
        value_jsonb: param.value_jsonb,
        description: param.description
      };
      
      await updateSystemParam(key, payload);
      showToast(`${param.key} 정책이 성공적으로 업데이트되었습니다.`, 'success');
    } catch (error: any) {
      showToast(`저장 실패: ${error.message}`, 'error');
    }
    setSaving(null);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const categories = Array.from(new Set(paramsList.map(p => p.category)));

  return (
    <div className="space-y-12">
      {/* Premium Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest text-[10px] uppercase">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            Core Governance Controller
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            시스템 파라미터 제어
            <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 font-mono uppercase">
              OPS_v4_STABLE
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
            재무 요율, 부피 계수, 라우팅 가중치 등 ZENITH LMS의 핵심 비즈니스 로직 상수를 관리합니다.<br/>
            수정된 값은 캐시 무효화 기술을 통해 전 시스템에 실시간 반영됩니다.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchParams}
            disabled={loading}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all group disabled:opacity-50"
          >
            <RotateCcw className={cn("w-5 h-5 transition-transform duration-500", loading ? "animate-spin" : "group-active:rotate-180")} />
          </button>
        </div>
      </header>

      {/* Settings Grid */}
      <main className="max-w-6xl mx-auto space-y-12">
        {loading && paramsList.length === 0 ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-mono text-[10px] tracking-widest uppercase italic">SYNCHRONIZING_SYSTEM_CORE...</p>
          </div>
        ) : (
          categories.map(category => (
            <section key={category} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    {category} PARAMETERS
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-400 italic">#CATEGORY_{category}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paramsList.filter(p => p.category === category).map(param => (
                  <ZenCard 
                    key={param.key}
                    className="bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all duration-300 p-6 flex flex-col gap-5 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Activity className="w-4 h-4 text-slate-300" />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-[15px] font-bold text-slate-900 tracking-tight">{param.key}</label>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-50 px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                          {param.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                        {param.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        {param.value_numeric !== null ? (
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50">
                              <Hash className="w-3.5 h-3.5" />
                            </div>
                            <input 
                              type="number"
                              step="any"
                              value={param.value_numeric ?? ''}
                              onChange={(e) => handleValueChange(param.key, 'value_numeric', parseFloat(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-blue-600 font-mono focus:outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                              placeholder="Numeric Value"
                            />
                          </div>
                        ) : param.value_jsonb !== null ? (
                          <div className="flex-1 relative">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500/50">
                              <FileJson className="w-3.5 h-3.5" />
                            </div>
                            <textarea 
                              value={typeof param.value_jsonb === 'string' ? param.value_jsonb : JSON.stringify(param.value_jsonb, null, 2)}
                              onChange={(e) => {
                                try {
                                  handleValueChange(param.key, 'value_jsonb', JSON.parse(e.target.value));
                                } catch (err) {
                                  handleValueChange(param.key, 'value_jsonb', e.target.value);
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-purple-600 font-mono focus:outline-none focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all min-h-[80px]"
                              placeholder="JSON Config"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50">
                              <Type className="w-3.5 h-3.5" />
                            </div>
                            <input 
                              type="text"
                              value={param.value_text ?? ''}
                              onChange={(e) => handleValueChange(param.key, 'value_text', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-emerald-600 font-mono focus:outline-none focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all"
                              placeholder="Text Value"
                            />
                          </div>
                        )}

                        <ZenButton 
                          onClick={() => handleSave(param.key)}
                          loading={saving === param.key}
                          className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 h-[42px] px-5 rounded-xl transition-all flex items-center gap-2 group"
                        >
                          <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold uppercase tracking-tighter">Apply</span>
                        </ZenButton>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                        <span className="flex items-center gap-1">
                          <Info className="w-2.5 h-2.5" />
                          Last Update: {new Date(param.updated_at).toLocaleString()}
                        </span>
                        <span className="group-hover:text-blue-500/60 transition-colors uppercase">Real-time Hook Active</span>
                      </div>
                    </div>
                  </ZenCard>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl",
          toast.type === 'success' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
        </div>
      )}

      {/* Footer / Status */}
      <footer className="max-w-6xl mx-auto pt-10 border-t border-slate-200 flex justify-between items-center opacity-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 tracking-tighter">
            <Activity className="w-3 h-3 text-emerald-500" />
            NODE_PARAMS_ACTIVE
          </div>
        </div>
        <p className="text-[10px] font-mono text-slate-500 tracking-tighter uppercase">
          Governance_Locale: {locale?.toUpperCase()} | Secure_Handoff_Ready
        </p>
      </footer>
    </div>
  );
}
