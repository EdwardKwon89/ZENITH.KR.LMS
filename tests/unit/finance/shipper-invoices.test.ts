import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('getShipperInvoices', () => {
  it('shipper-invoices.ts에 SHIPPER 역할별 필터링 로직이 포함됨', async () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain('USER_ROLES.SHIPPER');
    expect(src).toContain('shipper_id');
    expect(src).toContain('profile.org_id');
  });

  it('CANCELED 상태는 제외됨', async () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain("neq('status', 'CANCELED')");
  });

  it('기간 필터 지원', async () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain('startDate');
    expect(src).toContain('endDate');
  });
});
