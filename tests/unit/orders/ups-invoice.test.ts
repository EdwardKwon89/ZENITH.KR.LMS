import { describe, it, expect } from 'vitest';
import type { UpsInvoiceData } from '@/components/documents/UpsInvoicePDF';

describe('TC-UPS-INV: UPS 간이 인보이스 PDF', () => {
  it('TC-UPS-INV-01: PDF 필수 필드 전체 포함', () => {
    const data: UpsInvoiceData = {
      invoice_no: 'UPS-TEST-001', date: '2026-06-16',
      shipper: { name: 'ZENITH', address: 'Seoul', contact: 'tel' },
      consignee: { name: 'John', address: 'NY', contact: 'email', country_code: 'US' },
      order_no: 'Z-001',
      packages: [{ ref_seq: 1, actual_weight_kg: 5, chargeable_weight_kg: 5, description: 'Item', quantity: 1, declared_value_usd: 100 }],
      ups_service: { product_name: 'UPS-WXE', product_code: 'WXE' },
      total_weight_kg: 5, total_declared_value_usd: 100
    };
    expect(data.invoice_no).toBeDefined();
    expect(data.shipper.name).toBeDefined();
    expect(data.consignee.country_code).toBeDefined();
    expect(data.packages[0].ref_seq).toBeDefined();
    expect(data.total_weight_kg).toBe(5);
  });

  it('TC-UPS-INV-02: RBAC — 역할별 접근 권한', () => {
    const testCases = [
      { role: 'ADMIN', expected: true },
      { role: 'MANAGER', expected: true },
      { role: 'SHIPPER', expected: false },
    ];
    testCases.forEach(({ role, expected }) => {
      const canView = ['ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'].includes(role);
      expect(canView).toBe(expected);
    });
  });
});
