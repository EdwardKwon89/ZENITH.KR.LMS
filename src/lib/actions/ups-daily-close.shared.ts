import { z } from 'zod';

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

export interface AgencySettlementRow {
  agencyOrgId: string;
  agencyName: string;
  shipperRevenue: number;
  agencyRevenue: number;
  pkgCount: number;
}
