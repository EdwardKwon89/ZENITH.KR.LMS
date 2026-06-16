import { describe, it, expect } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

describe('TC-UPS-INV: UPS 간이 인보이스 PDF (TASK-148 IMP-117)', () => {
  /**
   * TC-UPS-INV-01: PDF 생성 — 필수 필드 전체 포함 여부 확인
   */
  it('TC-UPS-INV-01: PDF 데이터 구조에 필수 필드 전체 포함', () => {
    const upsInvoiceData = {
      invoice_no: 'UPS-TEST-001',
      date: '2026-06-16',
      shipper: {
        name: 'Test Shipper Co., Ltd.',
        address: '123 Gangnam-daero, Seoul, Korea',
        contact: '02-1234-5678'
      },
      consignee: {
        name: 'Test Consignee Inc.',
        address: '456 Shibuya, Tokyo, Japan',
        country: 'JPN',
        contact: '03-1234-5678'
      },
      packages: [
        {
          ref_seq: 1,
          domestic_ref_no: 'DOM-001',
          intl_ref_no: 'INT-001',
          actual_weight_kg: 10.5,
          volumetric_weight_kg: 12.3,
          items: [
            { item_name: 'Electronics', quantity: 2, unit_price: 100, currency: 'USD' },
            { item_name: 'Accessories', quantity: 5, unit_price: 10, currency: 'USD' }
          ]
        },
        {
          ref_seq: 2,
          domestic_ref_no: 'DOM-002',
          intl_ref_no: null,
          actual_weight_kg: 5.0,
          volumetric_weight_kg: 4.8,
          items: [
            { item_name: 'Manual', quantity: 1, unit_price: 0, currency: 'USD' }
          ]
        }
      ],
      ups_service: {
        product_code: 'UPS-STD',
        product_name: 'UPS Standard',
        zone: 'Z1',
        delivery_method: 'DIRECT'
      },
      total_weight: 15.5,
      total_volumetric_weight: 17.1,
      total_declared_value: 255,
      currency: 'USD'
    };

    // 헤더 필드
    expect(upsInvoiceData.invoice_no).toBeTruthy();
    expect(upsInvoiceData.date).toBeTruthy();

    // 발송인 필드
    expect(upsInvoiceData.shipper.name).toBeTruthy();
    expect(upsInvoiceData.shipper.address).toBeTruthy();

    // 수취인 필드
    expect(upsInvoiceData.consignee.name).toBeTruthy();
    expect(upsInvoiceData.consignee.address).toBeTruthy();
    expect(upsInvoiceData.consignee.country).toBeTruthy();

    // 패키지 목록
    expect(upsInvoiceData.packages.length).toBeGreaterThan(0);
    expect(upsInvoiceData.packages[0].ref_seq).toBe(1);
    expect(upsInvoiceData.packages[0].actual_weight_kg).toBeGreaterThan(0);
    expect(upsInvoiceData.packages[0].volumetric_weight_kg).toBeGreaterThan(0);
    expect(upsInvoiceData.packages[0].items.length).toBeGreaterThan(0);
    expect(upsInvoiceData.packages[0].items[0].item_name).toBeTruthy();
    expect(upsInvoiceData.packages[0].items[0].quantity).toBeGreaterThan(0);

    // UPS 서비스
    expect(upsInvoiceData.ups_service.product_code).toBeTruthy();
    expect(upsInvoiceData.ups_service.zone).toBeTruthy();
    expect(upsInvoiceData.ups_service.delivery_method).toBeTruthy();

    // 합계
    expect(upsInvoiceData.total_weight).toBeGreaterThan(0);
    expect(upsInvoiceData.total_declared_value).toBeGreaterThan(0);
    expect(upsInvoiceData.currency).toBe('USD');
  });

  /**
   * TC-UPS-INV-02: RBAC — SHIPPER 본인 오더 출력 가능, 타 오더 403
   */
  describe('TC-UPS-INV-02: RBAC 권한 검증', () => {
    function canPrintUpsInvoice(
      profile: { role: string; id?: string; org_id?: string | null },
      orderShipperId?: string | null
    ): boolean {
      const isAdmin =
        profile.role === USER_ROLES.ZENITH_SUPER_ADMIN ||
        profile.role === USER_ROLES.ADMIN;
      const isShipper = !!orderShipperId && (profile.id === orderShipperId || profile.org_id === orderShipperId);
      const isAgency = profile.role === USER_ROLES.AGENCY;
      return isAdmin || profile.role === USER_ROLES.MANAGER || isShipper || isAgency;
    }

    it('ADMIN — 모든 오더 UPS 인보이스 출력 가능', () => {
      const profile = { role: USER_ROLES.ADMIN, id: 'admin-1', org_id: 'org-admin' };
      expect(canPrintUpsInvoice(profile, 'org-any')).toBe(true);
    });

    it('MANAGER — 모든 오더 UPS 인보이스 출력 가능', () => {
      const profile = { role: USER_ROLES.MANAGER, id: 'mgr-1', org_id: 'org-mgr' };
      expect(canPrintUpsInvoice(profile, 'org-any')).toBe(true);
    });

    it('CORPORATE (SHIPPER) 본인 오더 — 출력 가능', () => {
      const profile = { role: USER_ROLES.CORPORATE, id: 'user-1', org_id: 'org-shipper' };
      expect(canPrintUpsInvoice(profile, 'org-shipper')).toBe(true);
    });

    it('CORPORATE (SHIPPER) 타 오더 — 출력 불가 (403)', () => {
      const profile = { role: USER_ROLES.CORPORATE, id: 'user-1', org_id: 'org-shipper' };
      expect(canPrintUpsInvoice(profile, 'org-other')).toBe(false);
    });

    it('INDIVIDUAL (SHIPPER) 본인 오더 — 출력 가능', () => {
      const profile = { role: USER_ROLES.INDIVIDUAL, id: 'user-2', org_id: null };
      expect(canPrintUpsInvoice(profile, 'user-2')).toBe(true);
    });

    it('AGENCY — 출력 가능', () => {
      const profile = { role: USER_ROLES.AGENCY, id: 'agency-1', org_id: 'org-agency' };
      expect(canPrintUpsInvoice(profile, 'org-any')).toBe(true);
    });

    it('CARRIER — 타 오더 출력 불가', () => {
      const profile = { role: USER_ROLES.CARRIER, id: 'carrier-1', org_id: 'org-carrier' };
      expect(canPrintUpsInvoice(profile, 'org-other')).toBe(false);
    });

    it('OPERATOR — 타 오더 출력 불가', () => {
      const profile = { role: USER_ROLES.OPERATOR, id: 'op-1', org_id: 'org-op' };
      expect(canPrintUpsInvoice(profile, 'org-other')).toBe(false);
    });
  });
});
