import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockCreateAdminClient = vi.hoisted(() => vi.fn());
const mockSignUp = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
const mockSendWelcomeEmail = vi.hoisted(() => vi.fn());

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
  createAdminClient: mockCreateAdminClient,
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: () => null }),
  cookies: vi.fn().mockResolvedValue({ delete: vi.fn() }),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications/email', () => ({ sendSignupWelcomeEmail: mockSendWelcomeEmail }));
vi.mock('server-only', () => ({}));

import { signup } from '@/app/[locale]/(auth)/login/actions';
import { USER_ROLES } from '@/lib/auth/rbac';

function setupAuthClient() {
  mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockCreateClient.mockResolvedValue({ auth: { signUp: mockSignUp } });
  const adminChain: any = {};
  adminChain.update = vi.fn(() => adminChain);
  adminChain.eq = vi.fn(() => adminChain);
  mockRpc.mockResolvedValue({ data: { allowed: true, retry_after: 0 }, error: null });
  mockCreateAdminClient.mockResolvedValue({ rpc: mockRpc, from: vi.fn(() => adminChain) });
}

function makeFormData(overrides: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(overrides)) fd.append(k, v);
  return fd;
}

const BASE = {
  email: 'new@test.com',
  password: 'pw123456!',
  full_name: '테스터',
  is_new_org: 'true',
  org_name: '신규대리점',
  business_number: '123-45-67890',
  org_type: 'AGENCY',
};

describe('DEF-B-039: signup 신규 조직 role 매핑 (Issue #1026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthClient();
    mockSendWelcomeEmail.mockResolvedValue({ success: true });
  });

  it('TC-265-01: AGENCY 신규 조직 생성 → role=AGENCY (ADMIN 아님)', async () => {
    await signup(makeFormData(BASE));

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    const args = mockSignUp.mock.calls[0][0];
    expect(args.options.data.role).toBe(USER_ROLES.AGENCY);
    expect(args.options.data.role).not.toBe(USER_ROLES.ADMIN);
  });

  it('TC-265-02: org_type별 정확한 role 매핑 (CARRIER/SHIPPER/CORPORATE/CUSTOMS/DELIVERY)', async () => {
    const cases: Array<[string, string]> = [
      ['CARRIER', USER_ROLES.CARRIER],
      ['SHIPPER', USER_ROLES.SHIPPER],
      ['CORPORATE', USER_ROLES.CORPORATE],
      ['CUSTOMS', USER_ROLES.CUSTOMS_BROKER],
      ['DELIVERY', USER_ROLES.DELIVERY_AGENT],
    ];

    for (const [orgType, expectedRole] of cases) {
      await signup(makeFormData({ ...BASE, org_type: orgType }));
      const args = mockSignUp.mock.calls[mockSignUp.mock.calls.length - 1][0];
      expect(args.options.data.role).toBe(expectedRole);
    }
  });

  it('TC-265-03: 알 수 없는 org_type → ADMIN이 아닌 CORPORATE 안전 폴백', async () => {
    await signup(makeFormData({ ...BASE, org_type: 'HACKER' }));

    const args = mockSignUp.mock.calls[0][0];
    expect(args.options.data.role).toBe(USER_ROLES.CORPORATE);
    expect(args.options.data.role).not.toBe(USER_ROLES.ADMIN);
  });

  it('TC-265-04: org_type 누락(undefined) → ADMIN이 아닌 CORPORATE 안전 폴백', async () => {
    const fd = makeFormData(BASE);
    fd.delete('org_type');
    await signup(fd);

    const args = mockSignUp.mock.calls[0][0];
    expect(args.options.data.role).toBe(USER_ROLES.CORPORATE);
    expect(args.options.data.role).not.toBe(USER_ROLES.ADMIN);
  });

  it('TC-265-05: 비-신규조직(기존 조직 가입)은 role=USER 유지 (회귀 보호)', async () => {
    await signup(makeFormData({
      email: 'join@test.com',
      password: 'pw123456!',
      full_name: '가입자',
      is_new_org: 'false',
      org_id: 'org-existing',
      org_type: 'AGENCY',
    }));

    const args = mockSignUp.mock.calls[0][0];
    expect(args.options.data.role).toBe(USER_ROLES.USER);
  });

  it('TC-265-06: 개인 가입(org_id 없음)은 role=INDIVIDUAL 유지', async () => {
    await signup(makeFormData({
      email: 'individual@test.com',
      password: 'pw123456!',
      full_name: '개인',
      is_new_org: 'false',
    }));

    const args = mockSignUp.mock.calls[0][0];
    expect(args.options.data.role).toBe(USER_ROLES.INDIVIDUAL);
  });
});
