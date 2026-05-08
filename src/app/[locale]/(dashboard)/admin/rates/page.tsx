'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { RateTierEditor, RateTier } from '@/components/admin/RateTierEditor';
import { RateCardList } from '@/components/admin/RateCardList';
import { 
  Globe, 
  MapPin, 
  Truck, 
  Save, 
  Search, 
  Filter, 
  DollarSign, 
  ChevronRight, 
  Settings2,
  Ship,
  Plane,
  Box,
  LayoutGrid,
  ListFilter,
  Calendar
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
  const [shippers, setShippers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<RateTier[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Carriers
      const { data: carrierData } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', 'CARRIER')
        .eq('status', 'ACTIVE');
      
      if (carrierData) setCarriers(carrierData);

      // Fetch Shippers (Customers)
      const { data: shipperData } = await supabase
        .from('organizations')
        .select('*')
        .in('org_type', ['SHIPPER', 'FORWARDER'])
        .eq('is_active', true);
      
      if (shipperData) setShippers(shipperData);

      // Fetch Ports
      const { data: portData } = await supabase
        .from('ports')
        .select('*')
        .order('port_code');
      
      if (portData) setPorts(portData);
    };

    fetchData();
    fetchRateCards();
  }, []);

  const fetchRateCards = async () => {
    setListLoading(true);
    let query = supabase
      .from('rate_cards')
      .select(`
        *,
        organizations(name)
      `)
      .order('version_no', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }
    
    const { data } = await query;
    if (data) setRateCards(data);
    setListLoading(false);
  };

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
      // 1. Check for existing active rate card for TISA versioning
      const { data: existingCard } = await supabase
        .from('rate_cards')
        .select('*')
        .eq('carrier_id', selectedCarrier)
        .eq('origin_port', originPort)
        .eq('destination_port', destPort)
        .eq('service_type', serviceType)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      let newVersionNo = 1;
      let parentId = null;

      if (existingCard) {
        // TISA Logic: Supersede existing card
        newVersionNo = existingCard.version_no + 1;
        parentId = existingCard.id;

        const { error: supersedeError } = await supabase
          .from('rate_cards')
          .update({ 
            status: 'SUPERSEDED',
            valid_to: new Date().toISOString()
          })
          .eq('id', existingCard.id);

        if (supersedeError) throw supersedeError;
      }

      // 2. Create New Version
      const { data: card, error: cardError } = await supabase
        .from('rate_cards')
        .insert({
          version_no: newVersionNo,
          parent_version_id: parentId,
          carrier_id: selectedCarrier,
          origin_port: originPort,
          destination_port: destPort,
          service_type: serviceType,
          base_rate: baseRate,
          priority: priority,
          customer_id: selectedCustomer || null,
          base_date_rule: baseDateRule,
          status: 'ACTIVE',
          valid_from: new Date().toISOString()
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 3. Save Tiers
      if (tiers.length > 0) {
        const { error: tierError } = await supabase
          .from('rate_slabs')
          .insert(tiers.map(t => ({
            rate_card_id: card.id,
            weight_min: t.weight_min,
            unit_price: t.unit_price
          })));
        
        if (tierError) throw tierError;
      }

      alert(`요율 카드가 성공적으로 등록되었습니다. (Version v${newVersionNo})`);
      // Reset form
      setOriginPort('');
      setDestPort('');
      setBaseRate(0);
      setPriority(0);
      setSelectedCustomer('');
      setBaseDateRule('RECEIPT_DATE');
      setTiers([]);
    } catch (err: any) {
      alert(`저장 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
      fetchRateCards();
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('정말 이 요율 정보를 삭제하시겠습니까?')) return;
    
    const { error } = await supabase.from('rate_cards').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchRateCards();
  };

  const filteredRates = rateCards.filter(r => 
    r.origin_port.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.destination_port.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              V-Engine 1.0
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl">
            운송사별, 항로별 기본 요율 및 중량구간(Slab) 할인 체계를 관리합니다. 이 데이터는 견적 엔진의 핵심 소스로 사용됩니다.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-8 space-y-8">
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
        />
      </section>
    </div>
  );
}
