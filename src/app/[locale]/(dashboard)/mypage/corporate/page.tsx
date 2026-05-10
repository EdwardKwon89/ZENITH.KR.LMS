'use client';

import { useState, useEffect } from 'react';
import { 
  getOrganizationInfo, 
  updateOrganizationInfo, 
  getDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '@/app/actions/corporate';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { 
  Building2, 
  Users, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Landmark, 
  MapPin, 
  Phone, 
  Mail, 
  FileText 
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function CorporatePage() {
  const t = useTranslations('Dashboard');
  const [activeTab, setActiveTab] = useState<'info' | 'dept'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [depts, setDepts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [orgData, deptsData] = await Promise.all([
          getOrganizationInfo(),
          getDepartments()
        ]);
        setOrg(orgData);
        setDepts(deptsData);
      } catch (err) {
        console.error(err);
        toast.error('데이터를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleUpdateOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      representative: formData.get('representative') as string,
      bizNo: formData.get('bizNo') as string,
      address: formData.get('address') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
    };

    try {
      await updateOrganizationInfo(payload);
      toast.success(t('success_save_org'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  }

   async function handleAddDept() {
    const name = prompt(t('prompt_add_dept'));
    if (!name) return;
    try {
      await createDepartment(name);
      setDepts(await getDepartments());
      toast.success(t('success_add_dept'));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleEditDept(id: string, currentName: string) {
    const name = prompt(t('prompt_edit_dept'), currentName);
    if (!name || name === currentName) return;
    try {
      await updateDepartment(id, name);
      setDepts(await getDepartments());
      toast.success(t('success_edit_dept'));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteDept(id: string) {
    if (!confirm(t('confirm_delete'))) return;
    try {
      await deleteDepartment(id);
      setDepts(await getDepartments());
      toast.success(t('success_delete_dept'));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">정보를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-heading text-slate-950 tracking-tight flex items-center gap-3">
          <Building2 className="text-brand-600 w-8 h-8" />
          {t('corporate_mgmt')}
        </h1>
        <p className="text-slate-500 text-lg">{t('corporate_mgmt_desc')}</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit shadow-inner">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'info' 
              ? 'bg-white text-brand-600 shadow-md scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          {t('tab_corporate_info')}
        </button>
        <button
          onClick={() => setActiveTab('dept')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'dept' 
              ? 'bg-white text-brand-600 shadow-md scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          {t('tab_dept_mgmt')}
        </button>
      </div>

      {/* Content Area */}
      <div className="transition-all duration-500">
        {activeTab === 'info' ? (
          <ZenCard className="p-10 bg-white border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl">
            <form onSubmit={handleUpdateOrg} className="space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm">
                  <Landmark size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('org_info_title')}</h3>
                  <p className="text-sm text-slate-500">{t('org_info_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_org_name')}</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput value={org?.name || ''} disabled className="pl-11 h-12 bg-slate-50/80 text-slate-500 border-slate-200 rounded-xl" />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1">{t('org_name_help')}</p>
                </div>
                
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_representative')}</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput name="representative" defaultValue={org?.metadata?.representative || ''} className="pl-11 h-12 border-slate-200 rounded-xl focus:ring-brand-500/20" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_biz_no')}</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput name="bizNo" defaultValue={org?.metadata?.bizNo || ''} className="pl-11 h-12 border-slate-200 rounded-xl focus:ring-brand-500/20" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_contact')}</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput name="contact" defaultValue={org?.metadata?.contact || ''} className="pl-11 h-12 border-slate-200 rounded-xl focus:ring-brand-500/20" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_email')}</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput name="email" defaultValue={org?.metadata?.email || ''} className="pl-11 h-12 border-slate-200 rounded-xl focus:ring-brand-500/20" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('label_address')}</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-500" />
                    <ZenInput name="address" defaultValue={org?.metadata?.address || ''} className="pl-11 h-12 border-slate-200 rounded-xl focus:ring-brand-500/20" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <ZenButton type="submit" disabled={isSaving} className="px-10 h-12 rounded-xl text-md font-bold shadow-lg shadow-brand-200 transition-all hover:scale-[1.02]">
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  정보 저장
                </ZenButton>
              </div>
            </form>
          </ZenCard>
        ) : (
          <ZenCard className="p-10 bg-white border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('dept_mgmt_title')}</h3>
                  <p className="text-sm text-slate-500">{t('dept_mgmt_desc')}</p>
                </div>
              </div>
              <ZenButton onClick={handleAddDept} variant="tactile" className="flex items-center gap-2 px-6 rounded-xl border-slate-200 font-bold transition-all hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200">
                <Plus size={18} />
                {t('add_dept')}
              </ZenButton>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <th className="px-8 py-5">{t('table_dept_name')}</th>
                    <th className="px-8 py-5">{t('table_created_at')}</th>
                    <th className="px-8 py-5 text-right">{t('table_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <Users size={48} className="text-slate-300" />
                          <p className="text-slate-500 font-medium tracking-tight">{t('empty_depts')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    depts.map((dept) => (
                      <tr key={dept.id} className="bg-white hover:bg-brand-50/30 transition-all duration-200 group">
                        <td className="px-8 py-5">
                          <span className="text-base font-semibold text-slate-800 tracking-tight">{dept.name}</span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-400 font-medium">
                          {new Date(dept.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={() => handleEditDept(dept.id, dept.name)}
                              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-600 transition-colors shadow-sm"
                              title="수정"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDept(dept.id)}
                              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ZenCard>
        )}
      </div>
    </div>
  );
}
