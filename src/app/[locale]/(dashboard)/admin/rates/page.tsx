'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZenCard, ZenButton, ZenInput, ZenSelect } from '@/components/ui/ZenUI';
import { RateTierEditor, RateTier } from '@/components/admin/RateTierEditor';
import { RateCardList } from '@/components/admin/RateCardList';
import { SurchargeEditor, Surcharge } from '@/components/admin/SurchargeEditor';
import { 
  getRateCards, 
  createRateCard, 
  deleteRateCard 
} from '@/app/actions/rates';
import { USER_ROLES } from '@/lib/auth/rbac';
import { 
  Globe, 
  MapPin, 
  Truck, 
  Save, 
  Search, 
  DollarSign, 
  ChevronRight, 
  Settings2,
  Ship,
  Plane,
  Box,
  LayoutGrid,
  ListFilter,
  Calendar,
  AlertCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';

export default function RatesManagementPage() {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [originPort, setOriginPort] = useState('');
  const [destPort, setDestPort] = useState('');
  const [serviceType, setServiceType] = useState('AIR');
  const [baseRate, setBaseRate] = useState(0);
  const [priority, setPriority] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [baseDateRule, setBaseDateRule] = useState('RECEIPT_DATE');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState('9999-12-31');
  const [shippers, setShippers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<RateTier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [profile, setProfile] = useState<any>(null);
  
  const supabase = createClient();


  // RBAC permissions
  const canEdit = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.MANAGER;
  const canDelete = profile?.role === USER_ROLES.ADMIN;

  const fetchRateCards = async () => {
    setListLoading(true);
    try {
      const data = await getRateCards();
      setRateCards(data);
    } catch (err: any) {
      console.error('Error fetching rate cards:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {

    const fetchData = async () => {
      // Get Profile for RBAC
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('zen_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }

      // Fetch Carriers (zen_organizations)
      const { data: carrierData } = await supabase
        .from('zen_organizations')
        .select('*')
        .eq('type', 'CARRIER')
        .eq('status', 'ACTIVE');
      
      if (carrierData) setCarriers(carrierData);

      // Fetch Shippers (Customers)
      const { data: shipperData } = await supabase
        .from('zen_organizations')
        .select('*')
        .in('type', ['SHIPPER', 'FORWARDER'])
        .eq('status', 'ACTIVE');
      
      if (shipperData) setShippers(shipperData);

      // Fetch Ports
      const { data: portData } = await supabase
        .from('zen_ports')
        .select('*')
        .order('port_code');
      
      if (portData) setPorts(portData);
    };

    fetchData();
    fetchRateCards();
  }, []);


  useEffect(() => {
    fetchRateCards();
  }, [statusFilter]);


  const handleSaveRate = async () => {
    if (!selectedCarrier || !originPort || !destPort) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await createRateCard({
        card: {
          carrier_id: selectedCarrier,
          origin_port: originPort,
          destination_port: destPort,
          service_type: serviceType,
          base_rate: baseRate,
          priority: priority,
          customer_id: selectedCustomer || null,
          base_date_rule: baseDateRule,
          valid_from: new Date(validFrom).toISOString(),
          valid_to: new Date(validTo).toISOString(),
          org_id: selectedCarrier,
          status: 'ACTIVE'
        },
        tiers: tiers.map(t => ({
          weight_min: t.weight_min,
          unit_price: t.unit_price,
          min_total_price: t.min_total_price
        })),
        surcharges: surcharges.map(s => ({
          surcharge_type: s.surcharge_type,
          calc_type: s.calc_type,
          amount: s.amount,
          currency: s.currency,
          description: s.description
        }))
      });

      alert(`요율 카드가 성공적으로 등록되었습니다.`);
      // Reset form
      setOriginPort('');
      setDestPort('');
      setBaseRate(0);
      setPriority(0);
      setSelectedCustomer('');
      setBaseDateRule('RECEIPT_DATE');
      setTiers([]);
      setSurcharges([]);
      setValidFrom(new Date().toISOString().split('T')[0]);
      setValidTo('9999-12-31');
      fetchRateCards();
    } catch (err: any) {
      alert(`저장 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('정말 이 요율 정보를 삭제하시겠습니까?')) return;
    try {
      await deleteRateCard(id);
      fetchRateCards();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRates = (rateCards || []).filter(r => {
    if (!r) return false;
    const searchLower = (searchTerm || "").toLowerCase();
    
    // Safety check for all fields used in filtering
    const origin = String(r.origin_port || r.origin_code || "").toLowerCase();
    const dest = String(r.destination_port || r.dest_code || "").toLowerCase();
    const carrierName = String(r.carrier?.name || r.carrier?.iata_code || "").toLowerCase();
    
    return origin.includes(searchLower) || 
           dest.includes(searchLower) || 
           carrierName.includes(searchLower);
  });


  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-tighter text-sm uppercase">
            <DollarSign className="w-4 h-4" />
            Pricing Strategy & Master Data
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            물류 요율 마스터 등록
            <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200 font-mono">
              V-Engine 2.0
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl">
            운송사별, 항로별 기본 요율 및 중량구간(Slab), 할증료(Surcharge) 체계를 관리합니다.
          </p>
        </div>
      </header>

      {profile?.role === USER_ROLES.CARRIER && (
        <div className="max-w-7xl mx-auto">
          <ZenCard className="bg-blue-600 border-none flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black tracking-tight text-lg">Partner View Mode Active</p>
              <p className="text-blue-100 text-sm">운송 파트너 계정으로 접속 중입니다. 요율 정보는 조회만 가능하며 수정 권한이 제한됩니다.</p>
            </div>
          </ZenCard>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Configuration Form */}
        <div className={cn(
          "lg:col-span-8 space-y-8 transition-all",
          profile?.role === USER_ROLES.CARRIER && "opacity-50 pointer-events-none scale-[0.98] blur-[2px]"
        )}>
          <ZenCard className="bg-white border-slate-200 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Carrier Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Truck className="w-3 h-3 text-blue-500" /> Carrier Partner
                </label>
                <select 
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
                >
                  <option value="" className="bg-white">선택하세요...</option>
                  {carriers.map(c => (
                    <option key={c.id} value={c.id} className="bg-white">{c.name} ({c.org_id})</option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Settings2 className="w-3 h-3 text-blue-500" /> Service Mode
                </label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {[
                    { id: 'AIR', icon: Plane, label: 'Air' },
                    { id: 'SEA', icon: Ship, label: 'Sea' },
                    { id: 'CIR', icon: Box, label: 'Express' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setServiceType(mode.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                        serviceType === mode.id 
                          ? "bg-slate-100 text-slate-900 shadow-lg" 
                          : "text-slate-400 hover:text-slate-500"
                      )}
                    >
                      <mode.icon className="w-3 h-3" /> {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Targeting (Optional) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Box className="w-3 h-3 text-amber-500" /> Target Customer (Optional)
                </label>
                <select 
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
                >
                  <option value="" className="bg-white">All Customers (General Rate)</option>
                  {shippers.map(s => (
                    <option key={s.id} value={s.id} className="bg-white">{s.org_name_ko} ({s.org_code})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Settings2 className="w-3 h-3 text-amber-500" /> Rate Priority
                </label>
                <input 
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="0 (Highest priority wins overlaps)"
                />
              </div>

              {/* Settlement Base Date Rule */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-amber-500" /> Settlement Base Date
                </label>
                <select 
                  value={baseDateRule}
                  onChange={(e) => setBaseDateRule(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="RECEIPT_DATE" className="bg-white">Cargo Receipt Date (Default)</option>
                  <option value="ORDER_DATE" className="bg-white">Order Date</option>
                  <option value="CONFIRM_DATE" className="bg-white">Confirmation Date</option>
                </select>
                <p className="text-[9px] text-slate-500 leading-relaxed px-1">
                  * Determines which date on the order determines the applicable rate version.
                </p>
              </div>
              {/* Validity Period */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Valid From
                  </label>
                  <ZenInput 
                    type="date" 
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-red-400" /> Valid To
                  </label>
                  <ZenInput 
                    type="date" 
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Origin */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-emerald-500" /> Loading Port (Origin)
                </label>
                <select 
                  value={originPort}
                  onChange={(e) => setOriginPort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
                >
                  <option value="" className="bg-white">Origin Select...</option>
                  {ports.map(p => (
                    <option key={p.port_code} value={p.port_code} className="bg-white">{p.port_code} - {p.port_name_ko}</option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Globe className="w-3 h-3 text-emerald-500" /> Discharge Port (Dest)
                </label>
                <select 
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-2xl appearance-none"
                >
                  <option value="" className="bg-white">Dest Select...</option>
                  {ports.map(p => (
                    <option key={p.port_code} value={p.port_code} className="bg-white">{p.port_code} - {p.port_name_ko}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <RateTierEditor tiers={tiers} onChange={setTiers} />
            </div>

            <div className="pt-6 border-t border-slate-200">
              <SurchargeEditor surcharges={surcharges} onChange={setSurcharges} />
            </div>
          </ZenCard>
        </div>

        {/* Right: Summary & Action */}
        <div className="lg:col-span-4 space-y-6">
          <ZenCard className="bg-white border-slate-200 sticky top-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">요율 정보 요약</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl">
                <span className="text-slate-500">기본 단가</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-mono">$</span>
                  <input 
                    type="number" 
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value))}
                    className="bg-transparent text-slate-900 font-mono text-right w-20 focus:outline-none focus:text-emerald-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Route</p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-slate-900">{originPort || '???'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <span className="text-lg font-black text-slate-900">{destPort || '???'}</span>
                </div>
              </div>

              <div className="p-4 border border-dashed border-slate-300 rounded-2xl space-y-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pricing Formula</p>
                <div className="text-xs text-slate-500 leading-relaxed font-mono">
                  {tiers.length === 0 ? (
                    `BASE_VAL: $${baseRate}/KG (Flat)`
                  ) : (
                    `IF WEIGHT >= ${tiers.sort((a,b) => b.weight_min - a.weight_min)[0].weight_min}KG -> $${tiers.sort((a,b) => b.weight_min - a.weight_min)[0].unit_price}/KG...`
                  )}
                </div>
              </div>

              <ZenButton 
                onClick={handleSaveRate}
                disabled={loading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-200 rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                MASTER DATA DEPLOY
              </ZenButton>
            </div>
          </ZenCard>
        </div>
      </main>

      {/* Wave 2: Registered Rates List */}
      <section className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-blue-500" />
              Registered Pricing Masters
            </h2>
            <p className="text-sm text-slate-400">시스템에 배포되어 현재 유효한 운송사별 요율 정보 목록입니다.</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* TISA Status Tabs */}
            <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl border border-slate-300 overflow-hidden">
              {['ACTIVE', 'ALL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                    statusFilter === s 
                      ? "bg-blue-600 text-white shadow-lg" 
                      : "text-slate-400 hover:text-slate-500"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <ZenInput 
                placeholder="Search route or carrier..."
                className="pl-12 bg-slate-50 border-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ZenButton variant="glass" className="aspect-square p-0 w-12 h-12 rounded-2xl">
              <ListFilter className="w-5 h-5 text-slate-500" />
            </ZenButton>
          </div>
        </div>

        <RateCardList 
          rates={filteredRates} 
          loading={listLoading} 
          onDelete={handleDeleteRate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </section>
    </div>
  );
}
