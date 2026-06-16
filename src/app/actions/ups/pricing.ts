'use server';

// UPS 운임 계산 Server Action
// TASK-141 IMP-112

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { withAction } from '@/lib/actions/wrapper';
import {
  computeUpsFreight,
  calcChargeableWeight,
  ceilToHalfKg,
} from '@/lib/ups/pricing-engine';
import type { UpsFreightInput, UpsFreightResult, UpsPricingData } from '@/types/ups';

const FreightInputSchema = z.object({
  productId: z.string().uuid(),
  destCountryCode: z.string().length(3),
  actualWeightKg: z.number().positive().max(70),
  dimL: z.number().positive().optional(),
  dimW: z.number().positive().optional(),
  dimH: z.number().positive().optional(),
  volumetricDivisor: z.union([z.literal(5000), z.literal(5500), z.literal(6000)]).optional(),
  deliveryMethod: z.enum(['DDU', 'DDP']).optional(),
  otherChargeIds: z.array(z.string().uuid()).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Zone ID 조회 (국가코드 → zone_id)
async function resolveZoneId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destCountryCode: string
): Promise<string> {
  const { data, error } = await supabase
    .from('zen_ups_zone_countries')
    .select('zone_id')
    .eq('country_code', destCountryCode.toUpperCase())
    .single();
  if (error || !data) throw new Error(`Zone not found: ${destCountryCode}`);
  return data.zone_id;
}

// 기본 요율 조회 (product + zone + 청구중량 + 유효일 기준)
async function fetchBaseRate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  zoneId: string,
  billingKg: number,
  effectiveDate: string
) {
  const { data, error } = await supabase
    .from('zen_ups_base_rates')
    .select('*')
    .eq('product_id', productId)
    .eq('zone_id', zoneId)
    .eq('weight_kg', billingKg)
    .lte('valid_from', effectiveDate)
    .or(`valid_until.is.null,valid_until.gte.${effectiveDate}`)
    .eq('is_active', true)
    .order('valid_from', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(`Base rate not found: product=${productId} zone=${zoneId} weight=${billingKg}kg`);
  }
  return data;
}

// 유류할증료 조회 (기준일 이전 최신 주)
async function fetchFuelSurcharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  effectiveDate: string
) {
  const { data } = await supabase
    .from('zen_ups_fuel_surcharges')
    .select('*')
    .or(`product_id.eq.${productId},product_id.is.null`)
    .lte('effective_week', effectiveDate)
    .order('effective_week', { ascending: false })
    .order('product_id', { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

// 요율 데이터 일괄 조회 조립
async function assemblePricingData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: UpsFreightInput,
  effectiveDate: string
): Promise<UpsPricingData> {
  const dims = (input.dimL && input.dimW && input.dimH)
    ? { l: input.dimL, w: input.dimW, h: input.dimH } : undefined;
  const { chargeableKg } = calcChargeableWeight(input.actualWeightKg, dims, input.volumetricDivisor);
  const billingKg = ceilToHalfKg(chargeableKg);
  const zoneId = await resolveZoneId(supabase, input.destCountryCode);
  const [{ data: zone }, { data: product }, baseRate, fuelSurcharge] = await Promise.all([
    supabase.from('zen_ups_zones').select('*').eq('id', zoneId).single(),
    supabase.from('zen_ups_products').select('*').eq('id', input.productId).single(),
    fetchBaseRate(supabase, input.productId, zoneId, billingKg, effectiveDate),
    fetchFuelSurcharge(supabase, input.productId, effectiveDate),
  ]);
  if (!zone) throw new Error(`Zone row not found: ${zoneId}`);
  if (!product) throw new Error(`Product not found: ${input.productId}`);
  let otherCharges: UpsPricingData['otherCharges'] = [];
  if (input.otherChargeIds?.length) {
    const { data: ocRows } = await supabase
      .from('zen_ups_other_charges').select('*').in('id', input.otherChargeIds);
    otherCharges = ocRows ?? [];
  }
  return { zone, product, baseRate, fuelSurcharge, otherCharges };
}

// 메인 Server Action
export const calculateUpsFreightAction = withAction(async function (
  rawInput: unknown
): Promise<UpsFreightResult> {
  const input = FreightInputSchema.parse(rawInput) as UpsFreightInput;
  const effectiveDate = input.effectiveDate ?? new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const pricingData = await assemblePricingData(supabase, input, effectiveDate);
  return computeUpsFreight(input, pricingData);
});
