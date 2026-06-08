import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SettlementEngine } from '@/lib/finance/settlement/settlement';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('IMP-105: Transport Pricing Policy Integration Tests (TC-POLICY-01~05)', () => {
  let supabase: SupabaseClient;
  let engine: SettlementEngine;
  let testShipperId: string;
  let testCarrierId: string;
  let testPortIcn: string;
  let testPortSin: string;

  beforeAll(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    engine = new SettlementEngine();

    // 1. Get or create test organizations
    const { data: shipper } = await supabase
       .from('zen_organizations')
       .select('id')
       .eq('name', 'Global Shipper Corp')
       .single();
    testShipperId = shipper?.id;

    const { data: carrier } = await supabase
       .from('zen_organizations')
       .select('id')
       .eq('name', 'Fast Carrier Ltd')
       .single();
    testCarrierId = carrier?.id;

    const { data: existingCarrier } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('id', testCarrierId)
      .maybeSingle();

    if (!existingCarrier) {
      await supabase
        .from('zen_carriers')
        .insert({
          id: testCarrierId,
          code: 'FAST_CARRIER',
          name: 'Fast Carrier Ltd',
          transport_mode: 'AIR',
          org_id: testCarrierId
        });
    }

    // 2. Cleanup any leftovers from previous failed runs
    const testOrderNos = [
      'TC-POLICY-01-ORD',
      'TC-POLICY-02-ORD',
      'TC-POLICY-03-ORD',
      'TC-POLICY-04-ORD',
      'TC-POLICY-05-ORD'
    ];
    const { data: oldOrders } = await supabase
      .from('zen_orders')
      .select('id')
      .in('order_no', testOrderNos);
    
    if (oldOrders && oldOrders.length > 0) {
      const oldOrderIds = oldOrders.map((o: any) => o.id);
      await supabase.from('zen_order_costs').delete().in('order_id', oldOrderIds);
      await supabase.from('zen_order_packages').delete().in('order_id', oldOrderIds);
      await supabase.from('zen_orders').delete().in('id', oldOrderIds);
    }

    // 3. Get test ports
    const { data: portIcn } = await supabase
      .from('zen_ports')
      .select('id')
      .eq('code', 'ICN')
      .single();
    testPortIcn = portIcn?.id;

    const { data: portSin } = await supabase
      .from('zen_ports')
      .select('id')
      .eq('code', 'SIN')
      .single();
    testPortSin = portSin?.id;
  });

  // Helper to cleanup database records created during test
  const cleanupOrderAndCosts = async (orderId: string) => {
    await supabase.from('zen_order_costs').delete().eq('order_id', orderId);
    await supabase.from('zen_order_packages').delete().eq('order_id', orderId);
    await supabase.from('zen_orders').delete().eq('id', orderId);
  };

  it('TC-POLICY-01: AIR 오더 부피중량 > 실중량 시 비용 산정 (부피중량 기준 tier 적용)', async () => {
    // 1. Create a rate card for AIR mode
    // Tiers: 0-99kg: $10/kg, >=100kg: $8/kg
    const { data: rateCard, error: rateError } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: testCarrierId,
        transport_mode: 'AIR',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        is_active: true,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        tiers: {
          weight_slabs: [
            { weight_min: 0, unit_price: 10, min_charge: 0 },
            { weight_min: 100, unit_price: 8, min_charge: 0 }
          ],
          cbm_slabs: [
            { cbm_min: 0, cbm_price: 0, min_charge: 0 }
          ]
        }
      })
      .select()
      .single();

    expect(rateError).toBeNull();

    // Set pricing policy for AIR to VOLUMETRIC (divisor 6000)
    await supabase
      .from('zen_transport_pricing_policies')
      .update({ pricing_method: 'VOLUMETRIC', volumetric_divisor: 6000 })
      .eq('transport_mode', 'AIR');

    // Create an order where volume weight is larger than actual weight
    // Actual weight: 50kg, Volume: 0.72 CBM (Volume weight = 720,000 / 6000 = 120kg)
    // Chargeable weight should be 120kg -> tier matches >=100kg ($8/kg)
    // Total Freight = 120kg * $8 = $960
    const { data: order } = await supabase
      .from('zen_orders')
      .insert({
        order_no: 'TC-POLICY-01-ORD',
        shipper_id: testShipperId,
        carrier_id: testCarrierId,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        transport_mode: 'AIR',
        cargo_details: { total_weight: 50, total_volume: 0.72 },
        status: 'REGISTERED'
      })
      .select()
      .single();

    await supabase.from('zen_order_packages').insert({
      order_id: order.id,
      packing_unit: 'BOX',
      gross_weight: 50,
      volume: 0.72,
      packing_count: 1
    });

    // Test TS SettlementEngine
    const tsResult = await engine.calculateOrderCosts(order.id);
    expect(tsResult.success).toBe(true);
    expect(tsResult.chargeableWeight).toBe(120);
    expect(tsResult.unitPrice).toBe(8);
    expect(tsResult.totalFreight).toBe(960);

    // Test SQL function calculate_order_costs(uuid)
    const { data: sqlResult, error: sqlError } = await supabase.rpc('calculate_order_costs', { p_order_id: order.id });
    expect(sqlError).toBeNull();
    expect(sqlResult.success).toBe(true);
    expect(Number(sqlResult.chargeable_weight)).toBe(120);
    expect(Number(sqlResult.rate_applied)).toBe(8);
    expect(Number(sqlResult.total_freight)).toBe(960);

    // Cleanup
    await cleanupOrderAndCosts(order.id);
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  });

  it('TC-POLICY-02: AIR 오더 실중량 > 부피중량 시 비용 산정 (실중량 기준 tier 적용)', async () => {
    // 1. Create a rate card for AIR mode
    // Tiers: 0-99kg: $10/kg, >=100kg: $8/kg
    const { data: rateCard } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: testCarrierId,
        transport_mode: 'AIR',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        is_active: true,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        tiers: {
          weight_slabs: [
            { weight_min: 0, unit_price: 10, min_charge: 0 },
            { weight_min: 100, unit_price: 8, min_charge: 0 }
          ],
          cbm_slabs: [
            { cbm_min: 0, cbm_price: 0, min_charge: 0 }
          ]
        }
      })
      .select()
      .single();

    // Create an order where actual weight is larger than volume weight
    // Actual weight: 150kg, Volume: 0.06 CBM (Volume weight = 60,000 / 6000 = 10kg)
    // Chargeable weight should be 150kg -> tier matches >=100kg ($8/kg)
    // Total Freight = 150kg * $8 = $1200
    const { data: order } = await supabase
      .from('zen_orders')
      .insert({
        order_no: 'TC-POLICY-02-ORD',
        shipper_id: testShipperId,
        carrier_id: testCarrierId,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        transport_mode: 'AIR',
        cargo_details: { total_weight: 150, total_volume: 0.06 },
        status: 'REGISTERED'
      })
      .select()
      .single();

    await supabase.from('zen_order_packages').insert({
      order_id: order.id,
      packing_unit: 'BOX',
      gross_weight: 150,
      volume: 0.06,
      packing_count: 1
    });

    // Test TS SettlementEngine
    const tsResult = await engine.calculateOrderCosts(order.id);
    expect(tsResult.success).toBe(true);
    expect(tsResult.chargeableWeight).toBe(150);
    expect(tsResult.unitPrice).toBe(8);
    expect(tsResult.totalFreight).toBe(1200);

    // Test SQL function
    const { data: sqlResult } = await supabase.rpc('calculate_order_costs', { p_order_id: order.id });
    expect(sqlResult.success).toBe(true);
    expect(Number(sqlResult.chargeable_weight)).toBe(150);
    expect(Number(sqlResult.total_freight)).toBe(1200);

    // Cleanup
    await cleanupOrderAndCosts(order.id);
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  });

  it('TC-POLICY-03: SEA 오더 중량단가 > 용적단가 시 (중량단가 채택)', async () => {
    // 1. Create a rate card for SEA mode
    // Tiers: weight_min: 0, unit_price: 2.0 (per kg), cbm_price: 150.0 (per cbm), min_total_price: 50
    const { data: rateCard } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: testCarrierId,
        transport_mode: 'SEA',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        is_active: true,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        tiers: {
          weight_slabs: [
            { weight_min: 0, unit_price: 2.0, min_charge: 50 }
          ],
          cbm_slabs: [
            { cbm_min: 0, cbm_price: 150.0, min_charge: 50 }
          ]
        }
      })
      .select()
      .single();

    // Create an order where weight cost is higher
    // Actual weight: 100kg, Volume: 1.0 CBM
    // Weight cost = 100 * 2.0 = $200
    // Cbm cost = 1.0 * 150 = $150
    // Total Freight should be $200
    const { data: order } = await supabase
      .from('zen_orders')
      .insert({
        order_no: 'TC-POLICY-03-ORD',
        shipper_id: testShipperId,
        carrier_id: testCarrierId,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        transport_mode: 'SEA',
        cargo_details: { total_weight: 100, total_volume: 1.0 },
        status: 'REGISTERED'
      })
      .select()
      .single();

    await supabase.from('zen_order_packages').insert({
      order_id: order.id,
      packing_unit: 'BOX',
      gross_weight: 100,
      volume: 1.0,
      packing_count: 1
    });

    // Make sure SEA policy is WM
    await supabase
      .from('zen_transport_pricing_policies')
      .update({ pricing_method: 'WM' })
      .eq('transport_mode', 'SEA');

    // Test TS SettlementEngine
    const tsResult = await engine.calculateOrderCosts(order.id);
    expect(tsResult.success).toBe(true);
    expect(tsResult.totalFreight).toBe(200);

    // Test SQL function
    const { data: sqlResult } = await supabase.rpc('calculate_order_costs', { p_order_id: order.id });
    expect(sqlResult.success).toBe(true);
    expect(Number(sqlResult.total_freight)).toBe(200);

    // Cleanup
    await cleanupOrderAndCosts(order.id);
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  });

  it('TC-POLICY-04: SEA 오더 용적단가 > 중량단가 시 (용적단가 채택)', async () => {
    // 1. Create a rate card for SEA mode
    const { data: rateCard } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: testCarrierId,
        transport_mode: 'SEA',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        is_active: true,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        tiers: {
          weight_slabs: [
            { weight_min: 0, unit_price: 2.0, min_charge: 50 }
          ],
          cbm_slabs: [
            { cbm_min: 0, cbm_price: 150.0, min_charge: 50 }
          ]
        }
      })
      .select()
      .single();

    // Create an order where cbm cost is higher
    // Actual weight: 50kg, Volume: 2.0 CBM
    // Weight cost = 50 * 2.0 = $100
    // Cbm cost = 2.0 * 150 = $300
    // Total Freight should be $300
    const { data: order } = await supabase
      .from('zen_orders')
      .insert({
        order_no: 'TC-POLICY-04-ORD',
        shipper_id: testShipperId,
        carrier_id: testCarrierId,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        transport_mode: 'SEA',
        cargo_details: { total_weight: 50, total_volume: 2.0 },
        status: 'REGISTERED'
      })
      .select()
      .single();

    await supabase.from('zen_order_packages').insert({
      order_id: order.id,
      packing_unit: 'BOX',
      gross_weight: 50,
      volume: 2.0,
      packing_count: 1
    });

    // Test TS SettlementEngine
    const tsResult = await engine.calculateOrderCosts(order.id);
    expect(tsResult.success).toBe(true);
    expect(tsResult.totalFreight).toBe(300);

    // Test SQL function
    const { data: sqlResult } = await supabase.rpc('calculate_order_costs', { p_order_id: order.id });
    expect(sqlResult.success).toBe(true);
    expect(Number(sqlResult.total_freight)).toBe(300);

    // Cleanup
    await cleanupOrderAndCosts(order.id);
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  });

  it('TC-POLICY-05: Admin 정책 VOLUMETRIC->WM 변경 후 오더 산정 (변경된 방식 즉시 반영)', async () => {
    // 1. Create a rate card for AIR mode
    // Tiers: 0-99kg: $10/kg, >=100kg: $8/kg
    // Wait, let's also add cbm_price for the policy change test
    const { data: rateCard } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: testCarrierId,
        transport_mode: 'AIR',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        is_active: true,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        tiers: {
          weight_slabs: [
            { weight_min: 0, unit_price: 10.0, min_charge: 50 }
          ],
          cbm_slabs: [
            { cbm_min: 0, cbm_price: 1000.0, min_charge: 50 }
          ]
        }
      })
      .select()
      .single();

    // Create an order
    // Actual weight: 50kg, Volume: 0.1 CBM
    // If policy is VOLUMETRIC (divisor 6000):
    //   Volume weight = 100,000 / 6000 = 16.67kg
    //   Chargeable weight = Math.max(50, 16.67) = 50kg
    //   Total freight = 50 * 10.0 = $500
    const { data: order } = await supabase
      .from('zen_orders')
      .insert({
        order_no: 'TC-POLICY-05-ORD',
        shipper_id: testShipperId,
        carrier_id: testCarrierId,
        origin_port_id: testPortIcn,
        dest_port_id: testPortSin,
        transport_mode: 'AIR',
        cargo_details: { total_weight: 50, total_volume: 0.1 },
        status: 'REGISTERED'
      })
      .select()
      .single();

    await supabase.from('zen_order_packages').insert({
      order_id: order.id,
      packing_unit: 'BOX',
      gross_weight: 50,
      volume: 0.1,
      packing_count: 1
    });

    // 1. Test VOLUMETRIC
    await supabase
      .from('zen_transport_pricing_policies')
      .update({ pricing_method: 'VOLUMETRIC', volumetric_divisor: 6000 })
      .eq('transport_mode', 'AIR');

    const tsResult1 = await engine.calculateOrderCosts(order.id);
    expect(tsResult1.totalFreight).toBe(500);

    // 2. Change policy to WM
    //   Weight cost = 50 * 10.0 = $500
    //   Cbm cost = 0.1 * 1000.0 = $100
    //   Wait, let's make Cbm cost higher: cbm = 0.6 -> Cbm cost = 0.6 * 1000 = $600
    await supabase.from('zen_order_packages').update({ volume: 0.6 }).eq('order_id', order.id);
    
    await supabase
      .from('zen_transport_pricing_policies')
      .update({ pricing_method: 'WM' })
      .eq('transport_mode', 'AIR');

    const tsResult2 = await engine.calculateOrderCosts(order.id);
    expect(tsResult2.totalFreight).toBe(600); // MAX(500, 600) = 600

    // Cleanup
    await cleanupOrderAndCosts(order.id);
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  });
});
