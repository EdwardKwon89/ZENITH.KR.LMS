'use server';

import { validateUserAction } from '@/lib/auth/guards';
import { z } from 'zod';
import { OrderStatus } from '@/types/orders';

export const DailyCloseDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const DailyCloseRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export interface DailyOutboundSummary {
  totalPkgs: number;
  totalWeight: number;
  zoneDistribution: { zone: string; count: number }[];
}

export interface DailyRevenueRow {
  date: string;
  pkgCount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
}

export async function getDailyOutboundSummary(date: string): Promise<DailyOutboundSummary> {
  const { supabase } = await validateUserAction();
  const parsed = DailyCloseDateSchema.parse({ date });

  const { data: historyItems } = await supabase
    .from('order_status_history')
    .select('order_id')
    .eq('next_status', OrderStatus.RELEASED)
    .gte('created_at', `${parsed.date}T00:00:00`)
    .lt('created_at', `${parsed.date}T23:59:59`);

  const orderIds = (historyItems || []).map(h => h.order_id);
  if (orderIds.length === 0) return { totalPkgs: 0, totalWeight: 0, zoneDistribution: [] };

  const { data: pkgs } = await supabase
    .from('zen_order_packages')
    .select('id, gross_weight, order_id')
    .in('order_id', orderIds);

  const totalPkgs = pkgs?.length || 0;
  const totalWeight = pkgs?.reduce((s, p) => s + (p.gross_weight || 0), 0) || 0;

  const { data: orders } = await supabase
    .from('zen_orders')
    .select('id, dest_port_id')
    .in('id', orderIds);

  const zoneDistribution: { zone: string; count: number }[] = [];

  if (orders && orders.length > 0) {
    const portIds = [...new Set(orders.map(o => o.dest_port_id).filter(Boolean))];
    if (portIds.length > 0) {
      const { data: ports } = await supabase
        .from('zen_ports')
        .select('id, code, name, nation_code')
        .in('id', portIds);

      const portMap = new Map(ports?.map(p => [p.id, p.code || p.nation_code || 'ZZ']) || []);
      for (const o of orders) {
        const zone = portMap.get(o.dest_port_id || '') || 'ZZ';
        const existing = zoneDistribution.find(z => z.zone === zone);
        if (existing) existing.count++;
        else zoneDistribution.push({ zone, count: 1 });
      }
    }
  }

  return { totalPkgs, totalWeight, zoneDistribution };
}

export async function getDailyRevenueSummary(date: string): Promise<{ rows: DailyRevenueRow[] }> {
  const { supabase } = await validateUserAction();
  const parsed = DailyCloseDateSchema.parse({ date });

  const { data: historyItems } = await supabase
    .from('order_status_history')
    .select('order_id')
    .eq('next_status', OrderStatus.RELEASED)
    .gte('created_at', `${parsed.date}T00:00:00`)
    .lt('created_at', `${parsed.date}T23:59:59`);

  const orderIds = (historyItems || []).map(h => h.order_id);
  if (orderIds.length === 0) return { rows: [] };

  const { data: snapshots } = await supabase
    .from('zen_order_rate_snapshots')
    .select('order_id, applied_unit_price, carrier_cost_amount, platform_fee_amount')
    .in('order_id', orderIds);

  const { data: pkgs } = await supabase
    .from('zen_order_packages')
    .select('order_id')
    .in('order_id', orderIds);

  const pkgCountByOrder = new Map<string, number>();
  for (const p of pkgs || []) {
    pkgCountByOrder.set(p.order_id, (pkgCountByOrder.get(p.order_id) || 0) + 1);
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let totalPkgs = 0;

  for (const snap of snapshots || []) {
    totalRevenue += snap.applied_unit_price || 0;
    totalCost += (snap.carrier_cost_amount || 0) + (snap.platform_fee_amount || 0);
    totalPkgs += pkgCountByOrder.get(snap.order_id) || 0;
  }

  const margin = totalRevenue - totalCost;
  const marginRate = totalRevenue > 0 ? Math.round((margin / totalRevenue) * 10000) / 100 : 0;

  return {
    rows: [{
      date: parsed.date,
      pkgCount: totalPkgs,
      revenue: Math.round(totalRevenue * 100) / 100,
      cost: Math.round(totalCost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginRate,
    }],
  };
}

export async function getDailyCloseHistory(from: string, to: string): Promise<{ rows: DailyRevenueRow[] }> {
  const { supabase } = await validateUserAction();
  const parsed = DailyCloseRangeSchema.parse({ from, to });

  const { data: historyItems } = await supabase
    .from('order_status_history')
    .select('order_id, created_at')
    .eq('next_status', OrderStatus.RELEASED)
    .gte('created_at', `${parsed.from}T00:00:00`)
    .lt('created_at', `${parsed.to}T23:59:59`)
    .order('created_at', { ascending: true });

  if (!historyItems || historyItems.length === 0) return { rows: [] };

  const dateGroups = new Map<string, string[]>();
  for (const item of historyItems) {
    const dateKey = item.created_at?.substring(0, 10) || '';
    if (!dateKey) continue;
    const ids = dateGroups.get(dateKey) || [];
    ids.push(item.order_id);
    dateGroups.set(dateKey, ids);
  }

  const rows: DailyRevenueRow[] = [];

  for (const [dateKey, oids] of dateGroups) {
    const { data: snapshots } = await supabase
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, carrier_cost_amount, platform_fee_amount')
      .in('order_id', oids);

    const totalRevenue = snapshots?.reduce((s, r) => s + (r.applied_unit_price || 0), 0) || 0;
    const totalCost = snapshots?.reduce((s, r) => s + (r.carrier_cost_amount || 0) + (r.platform_fee_amount || 0), 0) || 0;
    const margin = totalRevenue - totalCost;
    const marginRate = totalRevenue > 0 ? Math.round((margin / totalRevenue) * 10000) / 100 : 0;

    rows.push({
      date: dateKey,
      pkgCount: oids.length,
      revenue: Math.round(totalRevenue * 100) / 100,
      cost: Math.round(totalCost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginRate,
    });
  }

  return { rows };
}
