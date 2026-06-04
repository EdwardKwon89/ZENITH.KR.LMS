'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createRateCard, deleteRateCard, getRateCards } from '@/app/actions/rates';
import { RateTier } from '@/components/admin/RateTierEditor';
import { Surcharge } from '@/components/admin/SurchargeEditor';
import { USER_ROLES } from '@/lib/auth/rbac';

export interface Port {
  id: string;
  name: string;
  code: string;
  country_code: string;
  type: string;
}

export interface RatesFormState {
  carriers: any[];
  ports: Port[];
  selectedCarrier: string;
  setSelectedCarrier: (v: string) => void;
  serviceType: string;
  setServiceType: (v: string) => void;
  carrierCost: number;
  setCarrierCost: (v: number) => void;
  currency: string;
  setCurrency: (v: string) => void;
  marginRate: number;
  setMarginRate: (v: number) => void;
  platformFeeRate: number;
  setPlatformFeeRate: (v: number) => void;
  originPortId: string;
  setOriginPortId: (v: string) => void;
  destPortId: string;
  setDestPortId: (v: string) => void;
  transitDays: number;
  setTransitDays: (v: number) => void;
  validFrom: string;
  setValidFrom: (v: string) => void;
  validTo: string;
  setValidTo: (v: string) => void;
  tiers: RateTier[];
  setTiers: (v: RateTier[]) => void;
  surcharges: Surcharge[];
  setSurcharges: (v: Surcharge[]) => void;
  loading: boolean;
  rateCards: any[];
  listLoading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  profile: any;
  canEdit: boolean;
  canDelete: boolean;
  filteredRates: any[];
  handleEditRate: (rate: any) => void;
  handleSaveRate: () => Promise<void>;
  handleDeleteRate: (id: string) => Promise<void>;
  resetForm: () => void;
}

export function useRates(): RatesFormState {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [serviceType, setServiceType] = useState('AIR');
  const [carrierCost, setCarrierCost] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [marginRate, setMarginRate] = useState(15.0);
  const [platformFeeRate, setPlatformFeeRate] = useState(5.0);
  const [originPortId, setOriginPortId] = useState('');
  const [destPortId, setDestPortId] = useState('');
  const [transitDays, setTransitDays] = useState(7);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState('9999-12-31');
  const [tiers, setTiers] = useState<RateTier[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(false);

  const [rateCards, setRateCards] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profile, setProfile] = useState<any>(null);

  const supabase = createClient();

  const canEdit = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.MANAGER;
  const canDelete = profile?.role === USER_ROLES.ADMIN;

  const fetchRateCards = async () => {
    setListLoading(true);
    try {
      const result = await getRateCards();
      setRateCards(result.rateCards);
    } catch (err: any) {
      logger.error('Error fetching rate cards:', err);
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
        .from('zen_carriers')
        .select('id, name, code, is_active')
        .eq('is_active', true);

      if (carrierData) setCarriers(carrierData);

      const { data: portData } = await supabase
        .from('zen_ports')
        .select('id, name, code, country_code, type')
        .order('code');

      if (portData) setPorts(portData);
    };

    fetchData();
    fetchRateCards();
  }, []);

  const resetForm = () => {
    setCarrierCost(0);
    setMarginRate(15.0);
    setPlatformFeeRate(5.0);
    setOriginPortId('');
    setDestPortId('');
    setTransitDays(7);
    setTiers([]);
    setSurcharges([]);
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidTo('9999-12-31');
  };

  const handleEditRate = (rate: any) => {
    setSelectedCarrier(rate.carrier_id || '');
    setServiceType(rate.transport_mode || 'AIR');
    setCarrierCost(rate.carrier_cost || 0);
    setCurrency(rate.currency || 'USD');
    setMarginRate(rate.margin_rate ?? 15.0);
    setPlatformFeeRate(rate.platform_fee_rate ?? 5.0);
    setOriginPortId(rate.origin_port_id || '');
    setDestPortId(rate.dest_port_id || '');
    setValidFrom(rate.valid_from ? new Date(rate.valid_from).toISOString().split('T')[0] : '');
    setValidTo(rate.valid_until ? new Date(rate.valid_until).toISOString().split('T')[0] : '');
    setTiers((rate.tiers || []).map((t: any) => ({
      weight_min: t.weight_min,
      unit_price: t.unit_price,
      min_total_price: t.min_total_price ?? 0,
    })));
    setSurcharges((rate.surcharges || []).map((s: any) => ({
      surcharge_type: s.surcharge_type,
      calc_type: s.calc_type,
      amount: s.amount,
      currency: s.currency || 'USD',
      description: s.description || '',
    })));
  };

  const handleSaveRate = async () => {
    if (!selectedCarrier || !serviceType) {
      alert('필수 정보(Carrier, Transport Mode)를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await createRateCard({
        card: {
          carrier_id: selectedCarrier,
          transport_mode: serviceType,
          origin_port_id: originPortId || null,
          dest_port_id: destPortId || null,
          transit_days: transitDays,
          tiers: tiers.map(t => ({
            weight_min: t.weight_min,
            unit_price: t.unit_price,
            min_total_price: t.min_total_price
          })),
          valid_from: new Date(validFrom).toISOString(),
          valid_to: new Date(validTo).toISOString(),
          carrier_cost: carrierCost || undefined,
          currency: currency,
          margin_rate: marginRate,
          platform_fee_rate: platformFeeRate,
        },
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
    if (!confirm('정말 이 요율 정보를 비활성화하시겠습니까?')) return;
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
    const carrierName = String(r.carrier?.name || r.carrier?.code || "").toLowerCase();
    return carrierName.includes(searchLower);
  });

  return {
    carriers, ports, selectedCarrier, setSelectedCarrier,
    serviceType, setServiceType,
    carrierCost, setCarrierCost, currency, setCurrency,
    marginRate, setMarginRate,
    platformFeeRate, setPlatformFeeRate,
    originPortId, setOriginPortId, destPortId, setDestPortId,
    transitDays, setTransitDays,
    validFrom, setValidFrom, validTo, setValidTo,
    tiers, setTiers, surcharges, setSurcharges, loading,
    rateCards, listLoading, searchTerm, setSearchTerm,
    profile, canEdit, canDelete, filteredRates,
    handleEditRate, handleSaveRate, handleDeleteRate, resetForm,
  };
}
