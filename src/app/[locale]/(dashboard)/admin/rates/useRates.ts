'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createRateCard, deleteRateCard, getRateCards } from '@/app/actions/rates';
import { RateTier } from '@/components/admin/RateTierEditor';
import { Surcharge } from '@/components/admin/SurchargeEditor';
import { USER_ROLES } from '@/lib/auth/rbac';

export interface RatesFormState {
  carriers: any[];
  ports: any[];
  selectedCarrier: string;
  setSelectedCarrier: (v: string) => void;
  originPort: string;
  setOriginPort: (v: string) => void;
  destPort: string;
  setDestPort: (v: string) => void;
  serviceType: string;
  setServiceType: (v: string) => void;
  baseRate: number;
  setBaseRate: (v: number) => void;
  priority: number;
  setPriority: (v: number) => void;
  selectedCustomer: string;
  setSelectedCustomer: (v: string) => void;
  baseDateRule: string;
  setBaseDateRule: (v: string) => void;
  validFrom: string;
  setValidFrom: (v: string) => void;
  validTo: string;
  setValidTo: (v: string) => void;
  shippers: any[];
  tiers: RateTier[];
  setTiers: (v: RateTier[]) => void;
  surcharges: Surcharge[];
  setSurcharges: (v: Surcharge[]) => void;
  loading: boolean;
  rateCards: any[];
  listLoading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  profile: any;
  canEdit: boolean;
  canDelete: boolean;
  filteredRates: any[];
  handleSaveRate: () => Promise<void>;
  handleDeleteRate: (id: string) => Promise<void>;
  resetForm: () => void;
}

export function useRates(): RatesFormState {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('zen_profiles')
          .select('id, role, email, full_name, org_id')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }

      const { data: carrierData } = await supabase
        .from('zen_organizations')
        .select('id, name, type, status')
        .eq('type', 'CARRIER')
        .eq('status', 'ACTIVE');

      if (carrierData) setCarriers(carrierData);

      const { data: shipperData } = await supabase
        .from('zen_organizations')
        .select('id, name, type, status')
        .in('type', ['SHIPPER', 'FORWARDER'])
        .eq('status', 'ACTIVE');

      if (shipperData) setShippers(shipperData);

      const { data: portData } = await supabase
        .from('zen_ports')
        .select('id, name, code, country_code, type')
        .order('code');

      if (portData) setPorts(portData);
    };

    fetchData();
    fetchRateCards();
  }, []);

  useEffect(() => {
    fetchRateCards();
  }, [statusFilter]);

  const resetForm = () => {
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
  };

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
      resetForm();
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
    const origin = String(r.origin_port || r.origin_code || "").toLowerCase();
    const dest = String(r.destination_port || r.dest_code || "").toLowerCase();
    const carrierName = String(r.carrier?.name || r.carrier?.iata_code || "").toLowerCase();
    return origin.includes(searchLower) || dest.includes(searchLower) || carrierName.includes(searchLower);
  });

  return {
    carriers, ports, selectedCarrier, setSelectedCarrier,
    originPort, setOriginPort, destPort, setDestPort,
    serviceType, setServiceType, baseRate, setBaseRate,
    priority, setPriority, selectedCustomer, setSelectedCustomer,
    baseDateRule, setBaseDateRule, validFrom, setValidFrom,
    validTo, setValidTo, shippers, tiers, setTiers,
    surcharges, setSurcharges, loading,
    rateCards, listLoading, searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, profile,
    canEdit, canDelete, filteredRates,
    handleSaveRate, handleDeleteRate, resetForm,
  };
}
