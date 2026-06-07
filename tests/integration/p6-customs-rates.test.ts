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

describe('TC-P6-DB-02: 통관 요율 CRUD + 역할별 접근 제어 통합 테스트', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('ADMIN — createCustomsRate 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'rate-1', org_id: 'org-customs', country_code: 'KR', currency: 'USD', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await createCustomsRate({ org_id: 'org-customs', country_code: 'KR', cost_per_kg: 1.5, cost_per_cbm: 20, fixed_fee: 10, transit_days: 2, currency: 'USD', valid_from: '2026-06-01', valid_until: '2026-12-31' });

    expect(result.error).toBeNull();
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ country_code: 'KR', is_active: true }));
  });

  it('CUSTOMS_BROKER — 본인 org 요율 수정 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { org_id: 'my-org' }, error: null };
    supabase._listResult = { data: null, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' } });

    const { updateCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await updateCustomsRate('customs-rate-1', { cost_per_kg: 2.0 });

    expect(result.error).toBeNull();
    expect(supabase.update).toHaveBeenCalledWith(expect.objectContaining({ cost_per_kg: 2.0 }));
  });

  it('CUSTOMS_BROKER — 타인 org 요율 수정 차단', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { org_id: 'other-org' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' } });

    const { updateCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await updateCustomsRate('customs-rate-other', { cost_per_kg: 3.0 });

    expect(result.data).toBeNull();
    expect(result.error).toContain('본인 조직');
  });

  it('CUSTOMS_BROKER — 본인 org 요율 삭제(soft delete) 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { org_id: 'my-org' }, error: null };
    supabase._listResult = { data: null, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' } });

    const { deleteCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await deleteCustomsRate('customs-rate-1');

    expect(result.error).toBeNull();
    expect(supabase.update).toHaveBeenCalledWith({ is_active: false });
  });

  it('CORPORATE — 활성 요율만 조회 가능 (getCustomsRates)', async () => {
    const supabase = createMockSupabase();
    supabase._listResult = { data: [{ id: 'rate-1', org_id: 'org-customs', country_code: 'KR', is_active: true, cost_per_kg: 1.0, cost_per_cbm: 10, fixed_fee: 5, currency: 'USD', 'zen_organizations!inner': { name: 'Customs Co' } }], error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'shipper-1', role: USER_ROLES.CORPORATE, org_id: 'org-shipper' } });

    const { getCustomsRates } = await import('@/app/actions/admin/customs-rates');
    const rates = await getCustomsRates();

    expect(rates).toHaveLength(1);
    expect(rates[0].is_active).toBe(true);
  });

  it('ADMIN — country_code 대문자 변환 검증', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'rate-1', country_code: 'US', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await createCustomsRate({ org_id: 'org-customs', country_code: 'us', valid_from: '2026-06-01' });

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ country_code: 'US' }));
    expect(result.error).toBeNull();
  });

  it('CUSTOMS_BROKER — default currency=USD, fixed_fee=0 검증', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'rate-1', org_id: 'my-org', country_code: 'JP', currency: 'USD', is_active: true }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' } });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await createCustomsRate({ org_id: 'my-org', country_code: 'JP', valid_from: '2026-06-01' });

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD', fixed_fee: 0 }));
    expect(result.error).toBeNull();
  });
});
