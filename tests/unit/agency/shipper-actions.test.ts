import { describe, it, expect } from 'vitest';
import { CreateAgencyShipperSchema, UpdateAgencyShipperGradeSchema } from '@/lib/validations/agency';

describe('TC-P7-SHIPPER-01: CreateAgencyShipperSchema — 최소 입력(minimum valid input) 검증', () => {
  it('should validate that CreateAgencyShipperSchema accepts valid input', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Test Shipper',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
      login_email: 'shipper@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('TC-P7-SHIPPER-02: CreateAgencyShipperSchema — 유효 입력 검증 PASS', () => {
  it('should validate complete input with all fields', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Complete Shipper Co.',
      shipper_type: 'CORPORATE',
      discount_rate: 0.15,
      grade: 'GOLD',
      contact_name: 'John Doe',
      contact_email: 'john@example.com',
      contact_phone: '010-1234-5678',
      biz_no: '120-11-22334',
      rep_name: '홍길동',
      login_email: 'john@example.com',
      country_code: 'KR',
      address: '서울시 강남구 테헤란로 1',
      address_detail: '101호',
      zipcode: '06134',
    });
    expect(result.success).toBe(true);
  });

  it('should accept minimum discount_rate (0)', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Zero Rate Shipper',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0,
      login_email: 'zero@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should accept maximum discount_rate (0.9999)', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Max Rate Shipper',
      shipper_type: 'CORPORATE',
      discount_rate: 0.9999,
      biz_no: '123-45-67890',
      login_email: 'max@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('TC-P7-SHIPPER-05: CreateAgencyShipperSchema — login_email 검증 (Issue #180)', () => {
  it('should reject missing login_email', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'No Login',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid login_email format', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Bad Login',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
      login_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid login_email with address fields', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Overseas Shipper',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.05,
      login_email: 'overseas@company.com',
      country_code: 'US',
      state_province: 'California',
      city: 'Los Angeles',
      address: '123 Main St',
      zipcode: '90001',
    });
    expect(result.success).toBe(true);
  });
});

describe('TC-P7-SHIPPER-03: CreateAgencyShipperSchema — 유효하지 않은 입력 검증 (실패 케이스)', () => {
  it('should reject discount_rate greater than 1', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Invalid Shipper',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative discount_rate', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Negative Shipper',
      shipper_type: 'CORPORATE',
      discount_rate: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: '',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid shipper_type', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Bad Type',
      shipper_type: 'INVALID',
      discount_rate: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject CORPORATE without biz_no', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'No Biz No',
      shipper_type: 'CORPORATE',
      discount_rate: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = CreateAgencyShipperSchema.safeParse({
      name: 'Bad Email',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
      contact_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('TC-P7-SHIPPER-04: UpdateAgencyShipperGradeSchema — 유효/무효 입력 검증', () => {
  it('should validate valid grade and discount_rate', () => {
    const result = UpdateAgencyShipperGradeSchema.safeParse({
      grade: 'VIP',
      discount_rate: 0.2,
    });
    expect(result.success).toBe(true);
  });

  it('should reject grade exceeding max length', () => {
    const result = UpdateAgencyShipperGradeSchema.safeParse({
      grade: 'A'.repeat(21),
      discount_rate: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject discount_rate exceeding 0.9999', () => {
    const result = UpdateAgencyShipperGradeSchema.safeParse({
      grade: 'GOLD',
      discount_rate: 1.0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative discount_rate', () => {
    const result = UpdateAgencyShipperGradeSchema.safeParse({
      grade: 'SILVER',
      discount_rate: -0.5,
    });
    expect(result.success).toBe(false);
  });
});
