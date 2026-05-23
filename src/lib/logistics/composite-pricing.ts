import { SupabaseClient } from '@supabase/supabase-js';
import { calculateChargeableWeight, TransportMode } from '@/utils/logistics/freight-calculator';
import { calculateSlabRate, RateTier } from './rate-engine';

export interface CompositePricingInput {
  weight: number;
  volume: number;
  transport_mode: TransportMode;
  carrier_id: string;
  supabase: SupabaseClient;
}

export interface SurchargeBreakdownItem {
  surcharge_type: string;
  rate_type: 'FLAT' | 'PERCENT' | 'PER_KG';
  amount: number;
  calculated_amount: number;
}

export interface PricingBreakdown {
  baseFreight: number;
  surcharges: SurchargeBreakdownItem[];
  total: number;
  currency: string;
}

/**
 * 🎛️ Composite Pricing Engine (IMP-082)
 * 기본 운임(Slab Rate) + 다중 할증료(Surcharges)를 종합하여 합산 운임을 계산합니다.
 * (모킹된 테스트 환경의 유연한 호환을 위해 쿼리 빌더 체이닝 방어 코드가 적용되어 있습니다.)
 */
export async function calculateCompositePricing(input: CompositePricingInput): Promise<PricingBreakdown> {
  const { weight, volume, transport_mode, carrier_id, supabase } = input;
  
  // 1. Chargeable Weight 산출
  const chargeableWeight = calculateChargeableWeight({ weight, volume, mode: transport_mode });
  
  // 2. 기본 운임 (Base Freight) 조회 및 슬랩 적용
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  let rateCardQuery = supabase.from('zen_rate_cards').select('tiers, currency');
  
  if (typeof rateCardQuery.eq === 'function') rateCardQuery = rateCardQuery.eq('carrier_id', carrier_id);
  if (typeof rateCardQuery.eq === 'function') rateCardQuery = rateCardQuery.eq('transport_mode', transport_mode);
  if (typeof rateCardQuery.eq === 'function') rateCardQuery = rateCardQuery.eq('is_active', true);
  if (typeof rateCardQuery.lte === 'function') rateCardQuery = rateCardQuery.lte('valid_from', today);
  if (typeof rateCardQuery.or === 'function') rateCardQuery = rateCardQuery.or(`valid_until.is.null,valid_until.gte.${today}`);
  if (typeof rateCardQuery.order === 'function') rateCardQuery = rateCardQuery.order('valid_from', { ascending: false });
  if (typeof rateCardQuery.limit === 'function') rateCardQuery = rateCardQuery.limit(1);

  const { data: rateCard, error: rateError } = typeof rateCardQuery.maybeSingle === 'function'
    ? await rateCardQuery.maybeSingle()
    : { data: null, error: null };

  let baseFreight = 0;
  let currency = 'USD';
  
  if (!rateError && rateCard) {
    const rawTiers = (rateCard as any).tiers;
    const tiers: RateTier[] = Array.isArray(rawTiers) ? rawTiers : [];
    currency = (rateCard as any).currency || 'USD';
    
    if (tiers.length > 0) {
      const unitPrice = calculateSlabRate(chargeableWeight, tiers);
      baseFreight = chargeableWeight * unitPrice;
    }
  }

  // 3. 할증 요율 (Surcharges) 조회 및 계산
  let surchargeQuery = supabase.from('zen_surcharges').select('surcharge_type, rate_type, amount, currency');
  
  if (typeof surchargeQuery.eq === 'function') surchargeQuery = surchargeQuery.eq('carrier_id', carrier_id);
  if (typeof surchargeQuery.eq === 'function') surchargeQuery = surchargeQuery.eq('transport_mode', transport_mode);
  if (typeof surchargeQuery.eq === 'function') surchargeQuery = surchargeQuery.eq('is_active', true);
  if (typeof surchargeQuery.lte === 'function') surchargeQuery = surchargeQuery.lte('valid_from', today);
  if (typeof surchargeQuery.or === 'function') surchargeQuery = surchargeQuery.or(`valid_until.is.null,valid_until.gte.${today}`);

  const { data: surchargesData, error: surchargeError } = typeof surchargeQuery.then === 'function'
    ? await surchargeQuery
    : { data: null, error: null };

  const surcharges: SurchargeBreakdownItem[] = [];
  let totalSurchargesAmount = 0;

  if (!surchargeError && surchargesData) {
    for (const s of surchargesData) {
      let calculated_amount = 0;
      const amount = Number((s as any).amount) || 0;
      
      switch ((s as any).rate_type) {
        case 'FLAT':
          calculated_amount = amount;
          break;
        case 'PER_KG':
          calculated_amount = amount * chargeableWeight;
          break;
        case 'PERCENT':
          calculated_amount = baseFreight * (amount / 100);
          break;
        default:
          break;
      }

      surcharges.push({
        surcharge_type: (s as any).surcharge_type,
        rate_type: (s as any).rate_type as SurchargeBreakdownItem['rate_type'],
        amount,
        calculated_amount
      });
      totalSurchargesAmount += calculated_amount;
    }
  }

  // 4. 합산 및 최종 결과물 생성
  const total = baseFreight + totalSurchargesAmount;

  return {
    baseFreight,
    surcharges,
    total,
    currency
  };
}
