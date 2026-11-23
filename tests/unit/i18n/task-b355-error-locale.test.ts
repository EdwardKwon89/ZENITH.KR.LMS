import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// TASK-B-355 (Issue #1331): 인증·회원·VOC·지원 액션 오류 로케일 전환 회귀 테스트.
//
// (a) 대표 실패 경로의 문장이 ko 로케일 문장이고 영문 원문/원문 객체가 노출되지 않는다
// (b) 호출자 계약 — throw 유지(createQna)는 reject, 반환 계약(findPersonalId)은 {error: ko},
//     withAction(createVoc)은 {data:null, error: ko} (성공 경로와 구분)
// (c) 4개 로케일 대표 키 + **보안 문구 원문1:1** + **EN 단언**(B-353 리뷰 지적 반영:
//     ko가 원문과 같은 키는 ko 단언만으로는 되돌림을 잡지 못함)
// (d) logger 인자 — 원문 객체 보존(문자열 축소 아님)
//
// trError는 실제 next-intl 서버 모듈 사용(defb047/B-353 선례, 요청 컨텍스트 없으면 'ko' 폴백).

const mockValidate = vi.hoisted(() => vi.fn());
const mockFindProfilesByName = vi.hoisted(() => vi.fn());
const mockDeactivateProfile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidate,
  validateAdminAction: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn().mockResolvedValue({}),
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class {},
  FinanceRepository: class {},
  AdminRepository: class {
    constructor(_supabase: unknown) {}
    findProfilesByName = mockFindProfilesByName;
    deactivateProfile = mockDeactivateProfile;
  },
}));

import { createQna } from '@/app/actions/misc/support';
import { findPersonalId } from '@/app/actions/admin/auth';
import { withdrawUser } from '@/app/actions/admin/member';
import { createVoc } from '@/app/actions/misc/voc';
import { logger } from '@/lib/logger';

const load = (loc: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), 'utf-8'));

function nullProfileCtx() {
  mockValidate.mockResolvedValue({
    user: { id: 'u-1' },
    profile: null,
    supabase: {},
  });
}

describe('TC-355-1: (a) 대표 실패 경로 — ko 문장 + 영문 원문 미노출', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createQna(profile 없음) → "사용자 프로필을 찾을 수 없습니다." + 영문 원문 미포함', async () => {
    nullProfileCtx();
    await expect(createQna({ title: 't', content: 'c' })).rejects.toThrow(
      '사용자 프로필을 찾을 수 없습니다.'
    );
    try {
      await createQna({ title: 't', content: 'c' });
      throw new Error('expected rejection');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toBe('User profile not found');
    }
  });

  it('findPersonalId(DB 예외) → 내부 오류 문구 + Supabase 원문 미노출', async () => {
    mockFindProfilesByName.mockRejectedValue(new Error('RAW_SUPABASE_SECRET_XYZ'));
    const res = await findPersonalId('홍길동');
    expect(res).toHaveProperty('error', '서버 내부 오류가 발생했습니다.');
    expect((res as any).error as string).not.toContain('RAW_SUPABASE_SECRET_XYZ');
    expect(res).not.toHaveProperty('success');
  });
});

describe('TC-355-2: (b) 호출자 계약 고정', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throw 유지(createQna·호출자 catch-only) → reject(정확문구) — 성공 경로 진입 불가', async () => {
    nullProfileCtx();
    await expect(createQna({ title: 't', content: 'c' })).rejects.toThrow(
      '사용자 프로필을 찾을 수 없습니다.'
    );
  });

  it('반환 계약(findPersonalId) → {error: ko} 반환(throw 아님) — 페이지가 setError(res.error)로 표시', async () => {
    mockFindProfilesByName.mockRejectedValue(new Error('boom'));
    const res = await findPersonalId('홍길동');
    expect(res).toHaveProperty('error', '서버 내부 오류가 발생했습니다.');
    expect(res).not.toHaveProperty('success');
    expect(res).not.toHaveProperty('results');
  });

  it('withAction(createVoc) → {data:null, error: ko} 반환 계약 (zod 검증 실패 경로)', async () => {
    const res = await createVoc({});
    expect(res.data).toBeNull();
    expect(res.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: VOC_VALIDATION)');
  });
});

describe('TC-355-3: (c) 4개 로케일 키 + 보안 문구 원문1:1 + EN 단언', () => {
  const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
  const KEYS = ['internal_error', 'current_password_incorrect', 'voc_closed_not_revertable', 'rate_slabs_required'] as const;

  it.each(LOCALES)('%s: 대표 키4종 실재·비어있지 않음', (loc) => {
    const m = load(loc);
    for (const k of KEYS) {
      expect(m.Errors[k], `${loc}.${k}`).toEqual(expect.any(String));
      expect((m.Errors[k] as string).length).toBeGreaterThan(0);
    }
  });

  it('보안 문구 원문1:1 — "현재 비밀번호가 올바르지 않습니다."가 그대로 유지된다 (find-id/reauth 변별 보존)', () => {
    expect(load('ko').Errors.current_password_incorrect).toBe('현재 비밀번호가 올바르지 않습니다.');
    expect(load('ko').Errors.find_member_not_found).toBe('일치하는 회원 정보를 찾을 수 없습니다.');
  });

  it('EN 단언(B-353 리뷰 지적 반영) — ko가 원문과 같은 키의 en 문구가 정확히 유지된다', () => {
    const en = load('en').Errors;
    expect(en.permission_denied).toBe('You do not have permission.');
    expect(en.fetch_failed).toBe('Failed to fetch data. Please try again later.');
    expect(en.current_password_incorrect).toBe('The current password is incorrect.');
    // ko≠en 동일 키 (로케일 분리 증명)
    expect(en.permission_denied).not.toBe(load('ko').Errors.permission_denied);
  });
});

describe('TC-355-4: (d) logger 인자 — 원문 객체 보존', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findPersonalId catch → logger.error에 컨텍스트와 원문 예외 객체가 남는다', async () => {
    const raw = new Error('RAW_CATCH_SECRET');
    mockFindProfilesByName.mockRejectedValue(raw);
    const res = await findPersonalId('홍길동');
    expect(res).toHaveProperty('error', '서버 내부 오류가 발생했습니다.');
    expect(logger.error).toHaveBeenCalledWith('[AUTH_ACTION] findPersonalId catch:', raw);
  });

  it('withdrawUser 실패 → logger.error에 원문 객체(문자열 축소 아님)가 남는다', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u-1' },
      profile: { id: 'u-1', role: 'INDIVIDUAL' },
      supabase: { auth: { signOut: vi.fn() } },
    });
    mockDeactivateProfile.mockResolvedValue({ error: { message: 'DB Error' } });

    const res = await withdrawUser();
    expect(res).toHaveProperty('error', '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: WITHDRAW)');
    expect(logger.error).toHaveBeenCalledWith(
      '[MEMBER_ACTION] withdrawUser Error:',
      expect.objectContaining({ message: 'DB Error' })
    );
    // 문자열이 아닌 객체로 전달됨 (원문 보존)
    const call = vi.mocked(logger.error).mock.calls.find((c) => String(c[0]).includes('withdrawUser'));
    expect(typeof call?.[1]).toBe('object');
  });
});
