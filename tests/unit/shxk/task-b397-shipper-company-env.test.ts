import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// TASK-B-397 (Issue #1552 / DEF-B-172): shipper_company 환경변수 계약 회귀 테스트.
// - 값 자체는 저장소에 적지 않는다 — 아래 값은 테스트용 더미 문자열이다.
// - 설정 시 그 값(trim) 전송 / 미설정·빈 값·공백 시 SHXK_SHIPPER_NAME 대체 + logger.warn / FXUPS 경로.
// - company 미전달 시 name 대체 분기(label-mapping.ts)도 값으로 단언한다.

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn, info: vi.fn(), error: vi.fn() } }));

const ENV_COMPANY = 'TEST SHIPPER CO';
const FALLBACK_NAME = 'SNTL Korea Co Ltd';
const WARN_MISSING =
  '[SHXK] SHXK_SHIPPER_COMPANY 미설정 — SHXK_SHIPPER_NAME 값으로 대체합니다.';

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
  const originalCompany = process.env.SHXK_SHIPPER_COMPANY;
  const originalName = process.env.SHXK_SHIPPER_NAME;

  beforeEach(() => {
    vi.resetModules();
    warn.mockClear();
  });

  afterEach(() => {
    if (originalCompany === undefined) delete process.env.SHXK_SHIPPER_COMPANY;
    else process.env.SHXK_SHIPPER_COMPANY = originalCompany;
    if (originalName === undefined) delete process.env.SHXK_SHIPPER_NAME;
    else process.env.SHXK_SHIPPER_NAME = originalName;
  });

  it('환경변수 설정 시 config가 그 값을 그대로 노출한다', async () => {
    process.env.SHXK_SHIPPER_COMPANY = ENV_COMPANY;
    process.env.SHXK_SHIPPER_NAME = FALLBACK_NAME;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(ENV_COMPANY);
    expect(warn).not.toHaveBeenCalled();
  });

  it('미설정 시 SHXK_SHIPPER_NAME으로 대체하고 warn을 1회 메시지 인자와 함께 남긴다', async () => {
    delete process.env.SHXK_SHIPPER_COMPANY;
    process.env.SHXK_SHIPPER_NAME = FALLBACK_NAME;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(FALLBACK_NAME);
    expect(cfg.SHXK_SHIPPER_COMPANY).not.toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARN_MISSING);
  });

  it('빈 문자열이면 SHXK_SHIPPER_NAME으로 대체하고 warn을 남긴다', async () => {
    process.env.SHXK_SHIPPER_COMPANY = '';
    process.env.SHXK_SHIPPER_NAME = FALLBACK_NAME;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(FALLBACK_NAME);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARN_MISSING);
  });

  it('공백만 있으면 SHXK_SHIPPER_NAME으로 대체하고 warn을 남긴다', async () => {
    process.env.SHXK_SHIPPER_COMPANY = '   ';
    process.env.SHXK_SHIPPER_NAME = FALLBACK_NAME;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(FALLBACK_NAME);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARN_MISSING);
  });

  it('앞뒤 공백이 있는 값은 trim한 뒤 노출하고 warn을 남기지 않는다', async () => {
    process.env.SHXK_SHIPPER_COMPANY = `  ${ENV_COMPANY}  `;
    process.env.SHXK_SHIPPER_NAME = FALLBACK_NAME;
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(ENV_COMPANY);
    expect(warn).not.toHaveBeenCalled();
  });

  it('SHXK_SHIPPER_NAME이 공백이면 기본값으로 채워 대체값도 비지 않는다', async () => {
    delete process.env.SHXK_SHIPPER_COMPANY;
    process.env.SHXK_SHIPPER_NAME = '   ';
    const cfg = await import('@/lib/shxk/config');

    expect(cfg.SHXK_SHIPPER_NAME).toBe(FALLBACK_NAME);
    expect(cfg.SHXK_SHIPPER_COMPANY).toBe(FALLBACK_NAME);
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

  it('company 미전달 시 shipperDefaults.name을 shipper_company로 전송한다', () => {
    const payload = buildCreateOrderPayload(
      'FXUPS',
      baseOrder as any,
      'US',
      [],
      { name: FALLBACK_NAME, country: 'KR' },
    );

    expect(payload.shipper).toHaveProperty('shipper_company', FALLBACK_NAME);
  });

  it('company가 빈 문자열·공백이면 shipperDefaults.name으로 대체한다', () => {
    for (const company of ['', '   ']) {
      const payload = buildCreateOrderPayload(
        'FXUPS',
        baseOrder as any,
        'US',
        [],
        { name: FALLBACK_NAME, country: 'KR', company },
      );

      expect(payload.shipper).toHaveProperty('shipper_company', FALLBACK_NAME);
    }
  });

  it('company 앞뒤 공백은 trim한 값을 shipper_company로 전송한다', () => {
    const payload = buildCreateOrderPayload(
      'FXUPS',
      baseOrder as any,
      'US',
      [],
      { name: FALLBACK_NAME, country: 'KR', company: `  ${ENV_COMPANY}  ` },
    );

    expect(payload.shipper).toHaveProperty('shipper_company', ENV_COMPANY);
  });
});
