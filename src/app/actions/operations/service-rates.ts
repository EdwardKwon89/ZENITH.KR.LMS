"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";

export interface ServiceRateQueryParams {
  originCode: string;
  destCode: string;
  destCountryCode: string;
  transportMode: 'AIR' | 'SEA';
  cargoWeight: number;
  cargoCbm: number;
}

export interface TransportRateOption {
  id: string;
  carrierId: string;
  orgId: string;
  carrierName: string;
  transportMode: string;
  estimatedCost: number;
  currency: string;
  transitDays: number | null;
}

export interface CustomsRateOption {
  id: string;
  orgId: string;
  orgName: string;
  countryCode: string;
  estimatedCost: number;
  currency: string;
  transitDays: number | null;
}

export interface DeliveryRateOption {
  id: string;
  orgId: string;
  orgName: string;
  serviceType: 'LOCAL' | 'TOTAL';
  estimatedCost: number;
  currency: string;
  transitDays: number | null;
}

export interface AvailableServiceRates {
  transport: TransportRateOption[];
  customs: CustomsRateOption[];
  deliveryLocal: DeliveryRateOption[];
  deliveryTotal: DeliveryRateOption[];
}

function calculateTransportCost(tiers: any[], weight: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => (b.weight_min ?? 0) - (a.weight_min ?? 0));
  const tier = sorted.find((t) => weight >= (t.weight_min ?? 0));
  if (!tier) {
    const lowestTier = sorted[sorted.length - 1];
    return (lowestTier.unit_price ?? 0) * weight;
  }
  return (tier.unit_price ?? 0) * weight;
}


export const getAvailableServiceRates = withAction(async function (
  params: ServiceRateQueryParams
): Promise<AvailableServiceRates> {
  const { supabase } = await validateUserAction();

  const { data: originPort } = await supabase
    .from("zen_ports")
    .select("id")
    .eq("code", params.originCode)
    .maybeSingle();

  const { data: destPort } = await supabase
    .from("zen_ports")
    .select("id")
    .eq("code", params.destCode)
    .maybeSingle();

  let rateQuery = supabase
    .from("zen_rate_cards")
    .select("id, carrier_id, transport_mode, tiers, currency, carrier:zen_carriers!carrier_id(name, org_id)")
    .eq("is_active", true)
    .eq("transport_mode", params.transportMode);

  if (originPort?.id) {
    rateQuery = rateQuery.eq("origin_port_id", originPort.id);
  }
  if (destPort?.id) {
    rateQuery = rateQuery.eq("dest_port_id", destPort.id);
  }

  const { data: transportRates, error: transportError } = await rateQuery;

  if (transportError) throw new Error(transportError.message);
  if (!transportRates || transportRates.length === 0) {
    throw new Error("선택하신 노선/서비스에 등록된 비용 정보가 없습니다. 플랫폼 운영자에게 문의하세요.");
  }

  const transport: TransportRateOption[] = transportRates.map((r: any) => ({
    id: r.id,
    carrierId: r.carrier_id,
    orgId: r.carrier?.org_id || '',
    carrierName: r.carrier?.name || '',
    transportMode: r.transport_mode,
    estimatedCost: calculateTransportCost(r.tiers, params.cargoWeight) || 0,
    currency: r.currency || 'USD',
    transitDays: null,
  }));

  const { data: customsRates, error: customsError } = await supabase
    .from("zen_customs_rates")
    .select("id, org_id, country_code, cost_per_kg, cost_per_cbm, fixed_fee, currency, transit_days, org:zen_organizations!org_id(name)")
    .eq("is_active", true)
    .eq("country_code", params.destCountryCode);

  if (customsError) throw new Error(customsError.message);

  const customs: CustomsRateOption[] = (customsRates || []).map((r: any) => ({
    id: r.id,
    orgId: r.org_id,
    orgName: r.org?.name || '',
    countryCode: r.country_code,
    estimatedCost: ((r.cost_per_kg || 0) * params.cargoWeight) + ((r.cost_per_cbm || 0) * params.cargoCbm) + (r.fixed_fee || 0),
    currency: r.currency || 'USD',
    transitDays: r.transit_days || null,
  }));

  const { data: deliveryRates, error: deliveryError } = await supabase
    .from("zen_delivery_rates")
    .select("id, org_id, service_type, cost_per_kg, cost_per_cbm, currency, transit_days, org:zen_organizations!org_id(name)")
    .eq("is_active", true);

  if (deliveryError) throw new Error(deliveryError.message);

  const deliveryLocal: DeliveryRateOption[] = [];
  const deliveryTotal: DeliveryRateOption[] = [];

  for (const r of deliveryRates || []) {
    const estimatedCost = ((r.cost_per_kg || 0) * params.cargoWeight) + ((r.cost_per_cbm || 0) * params.cargoCbm);
    const option: DeliveryRateOption = {
      id: r.id,
      orgId: r.org_id,
      orgName: r.org?.name || '',
      serviceType: r.service_type,
      estimatedCost,
      currency: r.currency || 'USD',
      transitDays: r.transit_days || null,
    };
    if (r.service_type === 'LOCAL') {
      deliveryLocal.push(option);
    } else {
      deliveryTotal.push(option);
    }
  }

  return { transport, customs, deliveryLocal, deliveryTotal };
});
