import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: shipper } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'Global Shipper Corp')
    .single();

  const { data: carrier } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'Fast Carrier Ltd')
    .single();

  const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
  const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

  const orderNo = 'TC-SQL-CALC-TEST';
  // Cleanup first
  const { data: old } = await supabase.from('zen_orders').select('id').eq('order_no', orderNo).maybeSingle();
  if (old) {
    await supabase.from('zen_order_costs').delete().eq('order_id', old.id);
    await supabase.from('zen_order_packages').delete().eq('order_id', old.id);
    await supabase.from('zen_orders').delete().eq('id', old.id);
  }

  // Set AIR pricing policy to VOLUMETRIC / 6000
  await supabase
    .from('zen_transport_pricing_policies')
    .update({ pricing_method: 'VOLUMETRIC', volumetric_divisor: 6000 })
    .eq('transport_mode', 'AIR');

  // Insert rate card
  const { data: rateCard } = await supabase
    .from('zen_rate_cards')
    .insert({
      carrier_id: carrier?.id,
      transport_mode: 'AIR',
      currency: 'USD',
      valid_from: new Date().toISOString().split('T')[0],
      is_active: true,
      origin_port_id: icnPort?.id,
      dest_port_id: sinPort?.id,
      tiers: [
        { weight_min: 0, unit_price: 10 },
        { weight_min: 100, unit_price: 8 }
      ]
    })
    .select()
    .single();

  const { data: order } = await supabase
    .from('zen_orders')
    .insert({
      order_no: orderNo,
      shipper_id: shipper?.id,
      carrier_id: carrier?.id,
      origin_port_id: icnPort?.id,
      dest_port_id: sinPort?.id,
      transport_mode: 'AIR',
      cargo_details: { total_weight: 50, total_volume: 0.72 },
      status: 'REGISTERED'
    })
    .select()
    .single();

  if (!order) {
    console.error('Failed to create order');
    return;
  }

  console.log('Inserting package...');
  const pkgResult = await supabase.from('zen_order_packages').insert({
    order_id: order.id,
    gross_weight: 50,
    volume: 0.72,
    packing_count: 1
  }).select();
  console.log('Package Insert Result:', pkgResult);

  // Check package count in DB
  const { data: pkgs } = await supabase.from('zen_order_packages').select('*').eq('order_id', order.id);
  console.log('Packages in DB:', pkgs);

  // Call calculate_order_costs
  const sqlResult = await supabase.rpc('calculate_order_costs', { p_order_id: order.id });
  console.log('SQL Result:', sqlResult);

  // Cleanup
  await supabase.from('zen_order_costs').delete().eq('order_id', order.id);
  await supabase.from('zen_order_packages').delete().eq('order_id', order.id);
  await supabase.from('zen_orders').delete().eq('id', order.id);
  if (rateCard) {
    await supabase.from('zen_rate_cards').delete().eq('id', rateCard.id);
  }
}

check().catch(console.error);
