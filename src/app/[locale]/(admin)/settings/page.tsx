'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZenCard, ZenButton } from '@/components/ui/ZenUI';
import { 
  Settings, 
  Shield, 
  Clock, 
  Globe, 
  Save, 
  RotateCcw, 
  Activity, 
  Terminal,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemSetting {
  key: string;
  value: string;
  category: string;
  label: string;
  description: string;
  updated_at: string;
}

export default function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const supabase = createClient();

  // 1. 설정값 로드
  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });
    
    if (data) setSettings(data);
    if (error) showToast('설정을 불러오는 중 오류가 발생했습니다.', 'error');
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 2. 개별 설정값 변경 핸들러
  const handleValueChange = (key: string, newValue: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
  };

  // 3. 단일 설정값 저장
  const handleSave = async (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return;

    setSaving(key);
    const { error } = await supabase
      .from('system_settings')
      .update({ value: setting.value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      showToast(`${setting.label} 저장 실패: ${error.message}`, 'error');
    } else {
      showToast(`${setting.label} 정책이 즉시 반영되었습니다.`, 'success');
    }
    setSaving(null);
  };

  // 4. 토스트 알림
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const categories = Array.from(new Set(settings.map(s => s.category)));

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-8 space-y-12">
      {/* Premium Header */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-500 font-bold tracking-widest text-[10px] uppercase">
            <Terminal className="w-3.5 h-3.5" />
            System Governance Controller
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            플랫폼 운영 설정
            <span className="text-[10px] bg-white/10 text-white/40 px-3 py-1 rounded-full border border-white/5 font-mono uppercase">
              v2.1 Premium Logic
            </span>
          </h1>
          <p className="text-white/40 max-w-xl text-sm leading-relaxed">
            ZENITH LMS의 핵심 보안 정책 및 환경 변수를 실시간으로 제어합니다. <br/>
            변경 사항은 전체 시스템 엔드포인트에 즉각적으로 집행됩니다.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchSettings}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all group"
          >
            <RotateCcw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </header>

      {/* Settings Grid */}
      <main className="max-w-5xl mx-auto space-y-10">
        {loading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/20 font-mono text-[10px] tracking-widest uppercase">FETCHING_GOVERNANCE_DATA...</p>
          </div>
        ) : (
          categories.map(category => (
            <section key={category} className="space-y-5">
              <div className="flex items-center gap-3 px-2">
                <div className="h-4 w-1 bg-blue-500 rounded-full" />
                <h2 className="text-lg font-bold text-white/80 tracking-tight flex items-center gap-2">
                  {category === 'AUTH' && <Shield className="w-4 h-4 text-blue-500" />}
                  {category === 'UI' && <Globe className="w-4 h-4 text-blue-500" />}
                  {category === 'GENERAL' && <Settings className="w-4 h-4 text-blue-500" />}
                  {category} POLICIES
                </h2>
              </div>

              <div className="grid gap-4">
                {settings.filter(s => s.category === category).map(setting => (
                  <ZenCard 
                    key={setting.key}
                    className="bg-[#111112] border-white/5 hover:border-white/10 transition-all duration-300 p-6 flex flex-col md:flex-row items-start md:items-center gap-6"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-white tracking-tight">{setting.label}</label>
                        <span className="text-[10px] font-mono text-white/20">{setting.key}</span>
                      </div>
                      <p className="text-xs text-white/40 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-blue-500/50" />
                        {setting.description}
                      </p>
                    </div>

                    <div className="w-full md:w-[320px] flex items-center gap-3">
                      <input 
                        type="text"
                        value={setting.value}
                        onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                        disabled={saving === setting.key}
                      />
                      <ZenButton 
                        onClick={() => handleSave(setting.key)}
                        loading={saving === setting.key}
                        className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 h-10 px-4 rounded-xl transition-all"
                      >
                        <Save className="w-4 h-4" />
                      </ZenButton>
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
          "fixed bottom-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
          toast.type === 'success' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
        </div>
      )}

      {/* Footer / Status */}
      <footer className="max-w-5xl mx-auto pt-10 border-t border-white/5 flex justify-between items-center opacity-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-white tracking-tighter">
            <Activity className="w-3 h-3 text-emerald-500" />
            LIVE_GOVERNANCE_SYSTEM
          </div>
        </div>
        <p className="text-[10px] font-mono text-white tracking-tighter uppercase">
          Secret_Key_Validated: {locale.toUpperCase()}
        </p>
      </footer>
    </div>
  );
}
