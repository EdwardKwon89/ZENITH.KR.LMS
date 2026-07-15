import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockValidate = vi.hoisted(() => vi.fn());
const mockAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: mockAdminClient }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { createPricingSchedule, getPricingAuditLog } from '@/app/actions/ups/pricing-schedule';
import { USER_ROLES } from '@/lib/auth/rbac';

function makeAdminMock(opts: { overlapRows?: any[] }) {
  const chain: any = {};
  chain._rows = opts.overlapRows || [];
  chain.select = () => chain;
  chain.insert = () => chain;
  chain.eq = () => chain;
  chain.neq = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.single = () => Promise.resolve({ data: { id: 'schedule-1' }, error: null });
  chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });

  const client: any = {};
  client.from = () => chain;
  return client;
}

describe('TC-PRICING-509: pricing-schedule JSONB target_ref 비교 수정 (Issue #509)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PRICING-509-01: AGENCY_DISCOUNT 등록 → 500 없이 정상 생성', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const adminMock = makeAdminMock({ overlapRows: [] });
    mockAdminClient.mockResolvedValue(adminMock);

    const result = await createPricingSchedule({
      setting_type: 'AGENCY_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', zone_id: 'zone-1' },
      new_value: 0.20,
      valid_from: '2026-08-01',
      valid_until: '2026-12-31',
    });

    expect(result).toBeDefined();
  });

  it('TC-PRICING-509-02: checkOverlap — 겹치는 기간 존재 시 에러로 차단', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const adminMock = makeAdminMock({
      overlapRows: [{
        id: 'existing-1',
        valid_from: '2026-07-01',
        valid_until: '2026-09-30',
        new_value: 0.15,
      }],
    });
    mockAdminClient.mockResolvedValue(adminMock);

    await expect(createPricingSchedule({
      setting_type: 'AGENCY_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', zone_id: 'zone-1' },
      new_value: 0.25,
      valid_from: '2026-08-01',
      valid_until: '2026-10-31',
    })).rejects.toThrow('기간이 겹치는 예약이 이미 존재합니다');
  });

  it('TC-PRICING-509-03: checkOverlap — 겹치지 않는 기간 → 정상 등록', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const adminMock = makeAdminMock({
      overlapRows: [{
        id: 'existing-1',
        valid_from: '2026-07-01',
        valid_until: '2026-07-31',
        new_value: 0.15,
      }],
    });
    mockAdminClient.mockResolvedValue(adminMock);

    const result = await createPricingSchedule({
      setting_type: 'AGENCY_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', zone_id: 'zone-1' },
      new_value: 0.25,
      valid_from: '2026-08-01',
      valid_until: '2026-10-31',
    });

    expect(result).toBeDefined();
  });

  it('TC-PRICING-509-04: getPricingAuditLog — targetRef로 JSONB 필터링 정상 동작', async () => {
    const chain: any = {};
    chain._rows = [{
      id: 'log-1',
      setting_type: 'AGENCY_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', zone_id: 'zone-1' },
      action: 'CREATE',
    }];
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });

    const supabaseMock: any = {};
    supabaseMock.from = () => chain;

    mockValidate.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: supabaseMock,
    });
    mockAdminClient.mockResolvedValue(makeAdminMock({}));

    const result = await getPricingAuditLog('AGENCY_DISCOUNT', {
      agency_org_id: 'agency-1',
      zone_id: 'zone-1',
    });

    expect(result).toHaveLength(1);
  });

  it('TC-PRICING-509-05: SHIPPER_DISCOUNT 등록 → 정상 동작', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const adminMock = makeAdminMock({ overlapRows: [] });
    mockAdminClient.mockResolvedValue(adminMock);

    const result = await createPricingSchedule({
      setting_type: 'SHIPPER_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', shipper_org_id: 'shipper-1' },
      new_value: 0.10,
      valid_from: '2026-08-01',
    });

    expect(result).toBeDefined();
  });
});
