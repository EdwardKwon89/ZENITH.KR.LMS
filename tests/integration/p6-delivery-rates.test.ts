import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

function createMockSupabase() {
  const chain: any = {};
  chain.rpc = vi.fn();
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.range = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(chain._singleResult || { data: null, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve(chain._maybeSingleResult || { data: null, error: null }));
  chain.then = (resolve: any) => Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve);
  chain._singleResult = null;
  chain._maybeSingleResult = null;
  chain._listResult = null;

  chain.select.mockImplementation((columns?: string) => {
    if (columns) return chain;
    return {
      then: (resolve: any) => Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve),
      single: () => Promise.resolve(chain._singleResult || { data: null, error: null }),
    };
  });

  return chain;
}

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

import { validateUserAction } from '@/lib/auth/guards';

describe('TC-P6-DB-03: 배송 요율 CRUD + LOCAL/TOTAL 유효성 통합 테스트', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('ADMIN — createDeliveryRate(LOCAL) 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'del-local-1', org_id: 'org-del', service_type: 'LOCAL', country_code: 'KR', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'LOCAL', country_code: 'KR', cost_per_kg: 0.5, cost_per_cbm: 8, currency: 'USD', valid_from: '2026-06-01' });

    expect(result.error).toBeNull();
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ service_type: 'LOCAL', country_code: 'KR', transport_mode: null }));
  });

  it('ADMIN — createDeliveryRate(TOTAL) 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'del-total-1', org_id: 'org-del', service_type: 'TOTAL', transport_mode: 'SEA', origin_code: 'PUS', dest_code: 'LAX', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'TOTAL', transport_mode: 'SEA', origin_code: 'PUS', dest_code: 'LAX', cost_per_kg: 0.8, cost_per_cbm: 15, currency: 'USD', valid_from: '2026-06-01' });

    expect(result.error).toBeNull();
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ service_type: 'TOTAL', transport_mode: 'SEA', origin_code: 'PUS', dest_code: 'LAX', country_code: null }));
  });

  it('LOCAL — country_code 누락 시 validation 에러', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'LOCAL', valid_from: '2026-06-01' } as any);

    expect(result.data).toBeNull();
    expect(result.error).toContain('국가 코드');
  });

  it('TOTAL — transport_mode 누락 시 validation 에러', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'TOTAL', origin_code: 'ICN', dest_code: 'NRT', valid_from: '2026-06-01' } as any);

    expect(result.data).toBeNull();
    expect(result.error).toContain('운송수단');
  });

  it('TOTAL — origin_code 누락 시 validation 에러', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'TOTAL', transport_mode: 'AIR', dest_code: 'NRT', valid_from: '2026-06-01' } as any);

    expect(result.data).toBeNull();
    expect(result.error).toContain('출발항');
  });

  it('DELIVERY_AGENT — 본인 org create+update+delete lifecycle', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'del-1', org_id: 'my-org', service_type: 'LOCAL', country_code: 'KR', is_active: true }, error: null };
    supabase._listResult = { data: null, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-org' } });

    const { createDeliveryRate, updateDeliveryRate, deleteDeliveryRate } = await import('@/app/actions/admin/delivery-rates');

    const created = await createDeliveryRate({ org_id: 'my-org', service_type: 'LOCAL', country_code: 'KR', valid_from: '2026-06-01' });
    expect(created.error).toBeNull();

    const updated = await updateDeliveryRate('del-1', { cost_per_kg: 1.2 });
    expect(updated.error).toBeNull();

    const deleted = await deleteDeliveryRate('del-1');
    expect(deleted.error).toBeNull();
  });

  it('DELIVERY_AGENT — 타인 org 요율 등록 차단', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-org' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'other-org', service_type: 'LOCAL', country_code: 'JP', valid_from: '2026-06-01' });

    expect(result.data).toBeNull();
    expect(result.error).toContain('본인 조직');
  });

  it('DELIVERY_AGENT — 타인 org 요율 수정 차단', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { org_id: 'other-org' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-org' } });

    const { updateDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await updateDeliveryRate('del-other', { cost_per_kg: 5.0 });

    expect(result.data).toBeNull();
    expect(result.error).toContain('본인 조직');
  });

  it('CORPORATE — 활성 요율만 조회 가능 (getDeliveryRates)', async () => {
    const supabase = createMockSupabase();
    supabase._listResult = { data: [{ id: 'del-1', org_id: 'org-del', service_type: 'LOCAL', country_code: 'KR', is_active: true, cost_per_kg: 0.5, cost_per_cbm: 8, fixed_fee: 0, currency: 'USD', 'zen_organizations!inner': { name: 'Delivery Co' } }], error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'shipper-1', role: USER_ROLES.CORPORATE, org_id: 'org-shipper' } });

    const { getDeliveryRates } = await import('@/app/actions/admin/delivery-rates');
    const rates = await getDeliveryRates();

    expect(rates).toHaveLength(1);
    expect(rates[0].is_active).toBe(true);
  });

  it('ADMIN — code 필드 대문자 자동 변환 검증', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'del-1', service_type: 'TOTAL', transport_mode: 'AIR', origin_code: 'ICN', dest_code: 'NRT', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'TOTAL', transport_mode: 'air', origin_code: 'icn', dest_code: 'nrt', valid_from: '2026-06-01' });

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ transport_mode: 'AIR', origin_code: 'ICN', dest_code: 'NRT' }));
    expect(result.error).toBeNull();
  });
});
