import { SupabaseClient } from '@supabase/supabase-js';
import { calculateChargeableWeight, TransportMode } from '@/utils/logistics/freight-calculator';
import { calculateSlabRate, RateTier } from './rate-engine';
import { RouteOption, RouteSegment } from './routing';

export interface CompositePricingInput {
  weight: number;
  volume: number;
  supabase: SupabaseClient;
  
  // 단일 세그먼트 호환용
  transport_mode?: TransportMode;
  carrier_id?: string;
  
  // 다중 세그먼트용
  routeOption?: RouteOption;
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

export interface DecomposedLeg {
  segment: RouteSegment;
  carrierId?: string;
  transportMode: TransportMode;
}

export class RouteDecomposer {
  decompose(option: RouteOption): DecomposedLeg[] {
    return option.segments.map(seg => ({
      segment: seg,
      carrierId: seg.carrier_id,
      transportMode: seg.transport_mode as TransportMode
    }));
  }
}

export class TISARateMatcher {
  constructor(private supabase: SupabaseClient) {}
  
  async matchRateCard(carrierId: string, mode: TransportMode) {
    const today = new Date().toISOString().split('T')[0];
    let query = this.supabase.from('zen_rate_cards').select('tiers, currency');
    
    if (typeof query.eq === 'function') query = query.eq('carrier_id', carrierId);
    if (typeof query.eq === 'function') query = query.eq('transport_mode', mode);
    if (typeof query.eq === 'function') query = query.eq('is_active', true);
    if (typeof query.lte === 'function') query = query.lte('valid_from', today);
    if (typeof query.or === 'function') query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
    if (typeof query.order === 'function') query = query.order('valid_from', { ascending: false });
    if (typeof query.limit === 'function') query = query.limit(1);

    const { data, error } = typeof query.maybeSingle === 'function'
      ? await query.maybeSingle()
      : { data: null, error: null };

    if (error || !data) return null;
    return data;
  }

  async matchSurcharges(carrierId: string, mode: TransportMode) {
    const today = new Date().toISOString().split('T')[0];
    let query = this.supabase.from('zen_surcharges').select('surcharge_type, rate_type, amount, currency');
    
    if (typeof query.eq === 'function') query = query.eq('carrier_id', carrierId);
    if (typeof query.eq === 'function') query = query.eq('transport_mode', mode);
    if (typeof query.eq === 'function') query = query.eq('is_active', true);
    if (typeof query.lte === 'function') query = query.lte('valid_from', today);
    if (typeof query.or === 'function') query = query.or(`valid_until.is.null,valid_until.gte.${today}`);

    const { data, error } = typeof query.then === 'function'
      ? await query
      : { data: null, error: null };

    if (error || !data) return [];
    return data;
  }
}

/**
 * 🎛️ Composite Pricing Engine (IMP-086)
 * 기본 운임(Slab Rate) + 다중 할증료(Surcharges)를 종합하여 합산 운임을 계산합니다.
 * RouteOption을 전달하는 경우 다중 세그먼트(Hub 경로) 비용 합산이 순차적으로 진행됩니다.
 */
export async function calculateCompositePricing(input: CompositePricingInput): Promise<PricingBreakdown> {
  const { weight, volume, supabase, transport_mode, carrier_id, routeOption } = input;
  
  // 1. 다중 세그먼트 (RouteOption) 처리
  if (routeOption) {
    const decomposer = new RouteDecomposer();
    const matcher = new TISARateMatcher(supabase);
    const legs = decomposer.decompose(routeOption);
    
    let totalBaseFreight = 0;
    const allSurcharges: SurchargeBreakdownItem[] = [];
    let overallTotal = 0;
    let mainCurrency = 'USD';
    
    for (const leg of legs) {
      // carrier_id가 없는 경우 즉시 기존 segment.cost fallback 처리 (Aiden 추가 가이드 적용)
      if (!leg.carrierId) {
        const fallbackCost = leg.segment.cost || 0;
        const fallbackCurrency = leg.segment.currency || 'USD';
        
        leg.segment.cost = fallbackCost;
        leg.segment.currency = fallbackCurrency;
        
        totalBaseFreight += fallbackCost;
        overallTotal += fallbackCost;
        mainCurrency = fallbackCurrency;
        continue;
      }
      
      const chargeableWeight = calculateChargeableWeight({ weight, volume, mode: leg.transportMode });
      
      // DB 요율 카드 매칭 (Stage 2)
      const rateCard = await matcher.matchRateCard(leg.carrierId, leg.transportMode);
      
      let baseFreight = 0;
      let legCurrency = 'USD';
      
      if (rateCard) {
        const rawTiers = (rateCard as any).tiers;
        const tiers: RateTier[] = Array.isArray(rawTiers) ? rawTiers : [];
        legCurrency = (rateCard as any).currency || 'USD';
        mainCurrency = legCurrency;
        
        if (tiers.length > 0) {
          const unitPrice = calculateSlabRate(chargeableWeight, tiers);
          baseFreight = chargeableWeight * unitPrice;
        }
      } else {
        // Fallback: rate_card 미존재 시 기존 segment.cost 유지
        baseFreight = leg.segment.cost || 0;
        legCurrency = leg.segment.currency || 'USD';
        mainCurrency = legCurrency;
        console.warn(`[Pricing Engine] Rate card not found for carrier ${leg.carrierId} and mode ${leg.transportMode}. Falling back to default cost: ${baseFreight}`);
      }
      
      // 할증료 매칭 (Stage 2)
      const surchargesData = await matcher.matchSurcharges(leg.carrierId, leg.transportMode);
      let legSurchargeTotal = 0;
      const legSurcharges: SurchargeBreakdownItem[] = [];
      
      if (surchargesData && surchargesData.length > 0) {
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
          
          legSurcharges.push({
            surcharge_type: (s as any).surcharge_type,
            rate_type: (s as any).rate_type as SurchargeBreakdownItem['rate_type'],
            amount,
            calculated_amount
          });
          legSurchargeTotal += calculated_amount;
        }
      }
      
      const legTotal = baseFreight + legSurchargeTotal;
      
      // RouteSegment 개별 비용 갱신
      leg.segment.cost = legTotal;
      leg.segment.currency = legCurrency;
      
      totalBaseFreight += baseFreight;
      overallTotal += legTotal;
      
      // 할증료 합산 취합
      for (const s of legSurcharges) {
        const existing = allSurcharges.find(ex => ex.surcharge_type === s.surcharge_type);
        if (existing) {
          existing.calculated_amount += s.calculated_amount;
        } else {
          allSurcharges.push({ ...s });
        }
      }
    }
    
    // RouteOption 전체 비용 갱신
    routeOption.total_cost = overallTotal;
    
    return {
      baseFreight: totalBaseFreight,
      surcharges: allSurcharges,
      total: overallTotal,
      currency: mainCurrency
    };
  }
  
  // 2. 단일 세그먼트 호환용 처리 (기존 로직)
  if (!carrier_id || !transport_mode) {
    throw new Error('Either routeOption or both carrier_id and transport_mode must be provided to calculateCompositePricing');
  }
  
  const chargeableWeight = calculateChargeableWeight({ weight, volume, mode: transport_mode });
  const today = new Date().toISOString().split('T')[0];
  
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

  const total = baseFreight + totalSurchargesAmount;

  return {
    baseFreight,
    surcharges,
    total,
    currency
  };
}
