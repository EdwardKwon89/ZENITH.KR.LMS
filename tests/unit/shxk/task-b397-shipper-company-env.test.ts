import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// TASK-B-397 (Issue #1552 / DEF-B-172): shipper_company 환경변수 계약 회귀 테스트.
// - 값 자체는 저장소에 적지 않는다 — 아래 값은 테스트용 더미 문자열이다.
// - 설정 시 그 값 전송 / 미설정 시 SHXK_SHIPPER_NAME 대체 + logger.warn / FXUPS 경로.

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn, info: vi.fn(), error: vi.fn() } }));

const ENV_COMPANY = 'TEST SHIPPER CO';
const FALLBACK_NAME = 'SNTL Korea Co Ltd';

const baseOrder = {
  order_no: 'ORD-397',
  shipper_name: 'ABC Trading',
  shipper_country_code: 'KR',
  shipper_state_province: 'Seoul',
  shipper_city: 'Mapo-gu',
  shipper_zipcode: '04515',
  shipper_contact_phone: '0212345678',
  recipient_name: 'John Doe',
  recipient_country_code: 'US',
  recipient_state_province: 'CA',
  recipient_city: 'Los Angeles',
  recipient_address: '123 Main St',
  recipient_zipcode: '90001',
  recipient_phone: '2135550100',
  recipient_email: 'john@example.com',
  recipient_pccc: '123456',
};

describe('TASK-B-397: SHXK shipper_company 환경변수 계약', () => {
  const original = process.env.SHXK_SHIPPER_COMPANY;

  beforeEach(() => {
    vi.resetModules();
    warn.mockClear();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SHXK_SHIPPER_COMPANY;
    else process.env.SHXK_SHIPPER_COMPANY = original;
  });

  it('환경변수 설정 시 config가 그 값을 그대로 노출한다', async () => {
    process.env.SHXK_SHIPPER_COMPANY = ENV_COMPANY;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(ENV_COMPANY);
    expect(warn).not.toHaveBeenCalled();
  });

  it('미설정 시 SHXK_SHIPPER_NAME으로 대체하고 warn을 1회 남긴다', async () => {
    delete process.env.SHXK_SHIPPER_COMPANY;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(cfg.SHXK_SHIPPER_NAME);
    expect(cfg.SHXK_SHIPPER_COMPANY).not.toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('FXUPS 경로 createorder payload에 환경변수 값이 shipper_company로 전송된다', () => {
    const payload = buildCreateOrderPayload(
      'FXUPS',
      baseOrder as any,
      'US',
      [],
      { name: FALLBACK_NAME, country: 'KR', company: ENV_COMPANY },
    );

    expect(payload.shipping_method).toBe('FXUPS');
    expect(payload.shipper).toHaveProperty('shipper_company', ENV_COMPANY);
    expect(payload.shipper).toHaveProperty('shipper_name', 'ABC Trading');
  });
});
