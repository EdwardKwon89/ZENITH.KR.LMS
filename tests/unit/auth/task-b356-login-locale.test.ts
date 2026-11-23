// TASK-B-356 (Issue #1334): 로그인/가입 인증 오류의 로케일 문구 + 보안(계정 존재 여부 비구분) 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({ locale: 'ko' }));

vi.mock('next-intl/server', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const load = (locale: string) =>
    JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf-8')) as Record<string, any>;

  const getTranslations = vi.fn(async (arg?: string | { locale?: string; namespace?: string }) => {
    const locale = (typeof arg === 'object' && arg?.locale) || hoisted.locale;
    const namespace = typeof arg === 'string' ? arg : arg?.namespace;
    const scoped = namespace ? load(locale)[namespace] : load(locale);
    return (key: string, params?: Record<string, unknown>) => {
      const raw = key.split('.').reduce<any>((acc, part) => acc?.[part], scoped);
      if (typeof raw !== 'string') throw new Error(`MISSING_MESSAGE: ${namespace ?? ''}.${key} [${locale}]`);
      return raw.replace(/\{(\w+)\}/g, (whole, name: string) =>
        params && name in params ? String(params[name]) : whole,
      );
    };
  });

  return { getLocale: vi.fn(async () => hoisted.locale), getTranslations };
});

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword: mockSignIn, signUp: mockSignUp } })),
  createAdminClient: vi.fn(async () => ({ rpc: mockRpc, from: vi.fn() })),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: () => '127.0.0.1' })),
  cookies: vi.fn(async () => ({ delete: vi.fn() })),
}));
vi.mock('@/lib/notifications/email', () => ({ sendSignupWelcomeEmail: vi.fn() }));

import { logger } from '@/lib/logger';
import { login, signup } from '@/app/[locale]/(auth)/login/actions';

function loginForm(): FormData {
  const fd = new FormData();
  fd.set('email', 'user@example.com');
  fd.set('password', 'wrong-password');
  fd.set('locale', hoisted.locale);
  return fd;
}

function signupForm(): FormData {
  const fd = new FormData();
  fd.set('email', 'user@example.com');
  fd.set('password', 'password123');
  fd.set('full_name', 'Test User');
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.locale = 'ko';
  mockRpc.mockResolvedValue({ data: { allowed: true, retry_after: 0 }, error: null });
});

describe('login — 인증 오류 로케일 + 계정 존재 여부 비구분 (TASK-B-356)', () => {
  it('Invalid login credentials → 단일 ko 문구, 원문 미포함', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });

    const result = await login(loginForm());

    expect(result.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
    expect(result.error).not.toContain('Invalid login credentials');
    expect(logger.error).toHaveBeenCalledWith('[ACTION] login AUTH ERROR:', 'Invalid login credentials');
  });

  it('en 로케일 → 영어 단일 문구 (en 단언)', async () => {
    hoisted.locale = 'en';
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });

    const fd = loginForm();
    fd.set('locale', 'en');
    const result = await login(fd);

    expect(result.error).toBe('The email or password is incorrect.');
  });

  it('이메일 미인증은 기존 구분 수준 유지(로케일 문구)', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Email not confirmed' } });

    const result = await login(loginForm());

    expect(result.error).toBe('이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.');
  });

  it('알 수 없는 인증 오류 → generic 인증 문구 (원문 미노출)', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Some raw supabase detail 9x' } });

    const result = await login(loginForm());

    expect(result.error).toBe('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    expect(result.error).not.toContain('raw supabase detail');
  });
});

describe('signup — 인증 오류 로케일 (TASK-B-356)', () => {
  it('이미 가입된 이메일 → 기존 구분 유지(로케일 문구)', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } });

    const result = await signup(signupForm());

    expect(result.error).toBe('이미 가입된 이메일입니다. 로그인해 주세요.');
  });

  it('비밀번호 정책 위반 → 로케일 문구 (원문 미노출)', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Password should be at least 6 characters' } });

    const result = await signup(signupForm());

    expect(result.error).toBe('비밀번호가 보안 정책을 충족하지 않습니다.');
    expect(result.error).not.toContain('at least 6');
  });
});
