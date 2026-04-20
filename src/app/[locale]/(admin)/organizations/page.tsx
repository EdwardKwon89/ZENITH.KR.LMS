'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZenCard, ZenButton } from '@/components/ui/ZenUI';
import { Building, FileText, CheckCircle, XCircle, AlertCircle, ExternalLink, ShieldCheck, Fingerprint, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminApprovalPage() {
  const [pendingOrgs, setPendingOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformVersion, setPlatformVersion] = useState<string>('v2.1 Premium');
  const supabase = createClient();

  const fetchPendingOrgs = async () => {
    setLoading(true);
    
    // 버전 정보 실시간 동기화
    const { data: verData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'PLATFORM_VERSION')
      .single();
    if (verData?.value) setPlatformVersion(verData.value);

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_documents(*)
      `)
      .in('status', ['PENDING', 'SUPPLEMENT_REQUIRED'])
      .order('created_at', { ascending: false });
    
    if (data) setPendingOrgs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingOrgs();
  }, []);

  const handleApprove = async (orgId: string) => {
    if (!confirm('해당 법인을 최종 승인하고 6자리 ZENITH Corporate ID를 발급하시겠습니까?\n이 작업은 되돌릴 수 없으며, 즉시 마스터 데이터에 배포됩니다.')) return;
    
    setLoading(true);
    const { data: newId, error } = await supabase.rpc('approve_organization', {
      target_org_id: orgId
    });

    if (error) {
      alert(`SYSTEM_ERROR: 승인 프로토콜 실행 실패 - ${error.message}`);
    } else {
      alert(`SUCCESS: 승인 완료! 발급된 Corporate ID: [ ${newId} ]\n해당 법인은 이제 ZENITH 네트워크에서 즉시 활동 가능합니다.`);
      fetchPendingOrgs();
    }
    setLoading(false);
  };

  const handleRequestSupplement = async (orgId: string) => {
    const reason = prompt('보완이 필요한 항목과 상세 사유를 입력해주세요:');
    if (!reason) return;

    setLoading(true);
    const { error } = await supabase.rpc('request_organization_supplement', {
      target_org_id: orgId,
      comment: reason
    });

    if (error) alert(`ERROR: 보완 요청 실패 - ${error.message}`);
    else {
      alert('SUCCESS: 해당 법인에 보완 요청이 전달되었습니다.');
      fetchPendingOrgs();
    }
    setLoading(false);
  };

  const handleReject = async (orgId: string) => {
    const reason = prompt('반려 사유를 입력해주세요 (사용자에게 통보됩니다):');
    if (!reason) return;

    setLoading(true);
    const { error } = await supabase.rpc('reject_organization', {
      target_org_id: orgId,
      comment: reason
    });

    if (error) alert(`ERROR: 반려 처리 실패 - ${error.message}`);
    else {
      alert('SUCCESS: 해당 법인의 가입 요청이 반려되었습니다.');
      fetchPendingOrgs();
    }
    setLoading(false);
  };

  const handleViewDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('business_docs').createSignedUrl(filePath, 60 * 60); // 1 hour
    if (error) {
      alert('문서를 불러오는 중 오류가 발생했습니다: ' + error.message);
      return;
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-8 space-y-10">
      {/* Premium Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-500 font-bold tracking-tighter text-sm uppercase">
            <ShieldCheck className="w-4 h-4" />
            Governance Command
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            법인 가입 승인 센터
            <span className="text-xs bg-white/10 text-white/40 px-3 py-1 rounded-full border border-white/5 font-mono">
              {platformVersion}
            </span>
          </h1>
          <p className="text-white/40 max-w-xl">
            ZENITH 네트워크에 합류를 요청한 신규 법인들의 사업자 정보 및 증빙 서류를 검토하고, 고유 식별 번호(Corporate ID)를 발급합니다.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <div className="text-right">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">검토 대기중</p>
              <p className="text-lg font-mono font-bold text-white">{pendingOrgs.length} OPS</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/20 font-mono text-xs animate-pulse">SECRET_DATA_FETCHING...</p>
          </div>
        ) : pendingOrgs.length === 0 ? (
          <ZenCard className="bg-[#111112] border-white/5 flex flex-col items-center justify-center py-32 text-white/20">
            <Building className="w-16 h-16 mb-6 opacity-5" />
            <p className="text-lg font-medium">인증 대기 중인 법인이 없습니다.</p>
            <p className="text-sm mt-2">모든 네트워크 노드가 승인되었습니다.</p>
          </ZenCard>
        ) : (
          <div className="grid gap-8">
            {pendingOrgs.map((org) => (
              <ZenCard 
                key={org.id} 
                className="bg-[#111112] border-white/5 hover:border-white/10 transition-all duration-500 group overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10 group-hover:bg-blue-500/10 transition-colors" />
                
                <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                  {/* Left: Identity Info */}
                  <div className="flex-1 space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Building className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-2xl font-bold text-white tracking-tight">{org.name}</h3>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border tracking-widest",
                            org.type === 'SHIPPER' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                            "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}>
                            {org.type}
                          </span>
                        </div>
                        <p className="text-xs text-white/30 font-mono">REQUESTED_AT: {new Date(org.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:bg-black/40 transition-colors">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">사업자 등록 번호</p>
                        <p className="text-white font-mono">{org.biz_no || 'NOT_FOUND'}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:bg-black/40 transition-colors">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">대표자 성명</p>
                        <p className="text-white font-medium">{org.rep_name || '-'}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:bg-black/40 transition-colors">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">가입 채널</p>
                        <p className="text-white font-medium">Direct Platform</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText className="w-3 h-3 text-blue-500" /> 증빙 서류 오딧 (Verification Documents)
                        </p>
                        <span className="text-[10px] text-white/20 font-mono">READY_TO_REVIEW</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {org.organization_documents?.length > 0 ? (
                          org.organization_documents.map((doc: any) => (
                            <button 
                              key={doc.id}
                              onClick={() => handleViewDocument(doc.file_path)}
                              className="group/doc px-5 py-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all flex items-center justify-between gap-4 min-w-[240px]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/30 group-hover/doc:text-blue-400 transition-colors border border-white/5">
                                  <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.1em] group-hover/doc:text-blue-400/60">{doc.doc_type}</p>
                                  <p className="text-sm text-white/60 group-hover/doc:text-white font-medium">Digital Verification</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-white/10 group-hover/doc:text-blue-400 transition-colors" />
                            </button>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-white/20 italic text-sm">
                            <AlertCircle className="w-4 h-4" />
                            업로드된 증빙 서류가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="w-full lg:w-72 flex flex-col gap-3 py-2">
                    <div className="mb-4 text-center p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                      <Fingerprint className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-pulse" />
                      <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-widest">Awaiting Command</p>
                    </div>

                    <ZenButton 
                      onClick={() => handleApprove(org.id)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm tracking-tight"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> 법인 최종 승인 (Assign ID)
                    </ZenButton>
                    
                    <ZenButton 
                      onClick={() => handleRequestSupplement(org.id)}
                      variant="glass" 
                      className="w-full h-14 rounded-2xl border-amber-500/10 text-amber-500/80 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all text-sm"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" /> 서류 보완 요청
                    </ZenButton>

                    <ZenButton 
                      onClick={() => handleReject(org.id)}
                      variant="glass" 
                      className="w-full h-14 rounded-2xl border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> 심사 반려
                    </ZenButton>

                    <div className="mt-auto pt-6">
                      <button className="w-full py-2 text-[10px] text-white/20 hover:text-white/40 font-bold uppercase tracking-[0.2em] transition-colors border-t border-white/5">
                        Audit Trail Logic
                      </button>
                    </div>
                  </div>
                </div>
              </ZenCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
