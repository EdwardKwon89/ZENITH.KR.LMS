import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('getShipperInvoices 코드 검증', () => {
  it('SHIPPER 역할별 필터링 로직 포함', () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain('USER_ROLES.SHIPPER');
    expect(src).toContain('shipper_id');
    expect(src).toContain('profile.org_id');
  });

  it('CANCELED 상태 제외', () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain("neq('status', 'CANCELED')");
  });

  it('기간 필터 지원', () => {
    const src = readFileSync('src/app/actions/finance/shipper-invoices.ts', 'utf-8');
    expect(src).toContain('startDate');
    expect(src).toContain('endDate');
  });
});
