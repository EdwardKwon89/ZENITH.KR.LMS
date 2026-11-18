/**
 * DEF-148 / TASK-1155 / Issue #1337
 *
 * 유지보수 모드 리다이렉트 대상(`/{locale}/maintenance`)이 실제 라우트로 존재하는지,
 * 그리고 점검 안내 페이지가 소속·상태 가드와 충돌해 무한 리다이렉트를 만들지 않는지 검증한다.
 *
 * 배경: 점검 페이지가 라우트 그룹 `(maintenance)` 안에 있어 실제 경로가 `/{locale}` 이었고,
 * 프록시가 안내하는 `/{locale}/maintenance` 는 404였다(DEF-148).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { DEFAULT_REDIRECTS } from '@/config/routes';

const { isFeatureEnabledMock } = vi.hoisted(() => ({ isFeatureEnabledMock: vi.fn() }));

vi.mock('@/lib/params/feature-flags', () => ({ isFeatureEnabled: isFeatureEnabledMock }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
// next-intl 내비게이션 의존성을 끌어오지 않도록 라우팅 설정만 주입한다.
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en', 'zh', 'ja'], defaultLocale: 'ko' },
}));

import { authGuard } from '@/lib/auth/proxy';

function makeRequest(pathname: string) {
  const url = new URL(`http://localhost${pathname}`);
  (url as any).clone = () => new URL(url.href);
  return {
    nextUrl: url,
    cookies: { get: vi.fn(() => undefined) },
    headers: new Headers(),
    method: 'GET',
  } as any;
}

const makeSupabaseResponse = () =>
  ({ headers: { getSetCookie: () => [] }, cookies: { set: vi.fn() } }) as any;

const shipper = {
  id: 'u-shipper',
  app_metadata: { role: 'CUSTOMER', org_type: 'SHIPPER', status: 'ACTIVE' },
} as any;

const platformAdmin = {
  id: 'u-admin',
  app_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
} as any;

const pendingShipper = {
  id: 'u-pending',
  app_metadata: { role: 'CUSTOMER', org_type: 'SHIPPER', status: 'PENDING' },
} as any;

const suspendedShipper = {
  id: 'u-suspended',
  app_metadata: { role: 'CUSTOMER', org_type: 'SHIPPER', status: 'SUSPENDED' },
} as any;

describe('DEF-148 유지보수 모드 라우트 (TASK-1155)', () => {
  beforeEach(() => {
    isFeatureEnabledMock.mockReset();
    isFeatureEnabledMock.mockResolvedValue(true);
  });

  it('TC-1155-01: 리다이렉트 대상 상수와 실제 라우트 파일이 일치한다', () => {
    expect(DEFAULT_REDIRECTS.MAINTENANCE).toBe('/maintenance');

    const routeFile = path.resolve(process.cwd(), 'src/app/[locale]/maintenance/page.tsx');
    expect(fs.existsSync(routeFile)).toBe(true);

    // 라우트 그룹으로 되돌아가면 실제 경로가 `/[locale]` 이 되어 다시 404가 된다.
    const legacyRouteGroup = path.resolve(process.cwd(), 'src/app/[locale]/(maintenance)');
    expect(fs.existsSync(legacyRouteGroup)).toBe(false);
  });

  it('TC-1155-02: 점검 모드에서 비플랫폼 사용자는 /{locale}/maintenance 로 이동한다', async () => {
    const decision = await authGuard(makeRequest('/ko/orders'), makeSupabaseResponse(), {} as any, shipper);

    expect(decision?.redirectUrl).toBe('/ko/maintenance');
    expect(decision?.response).toBeInstanceOf(NextResponse);
  });

  it('TC-1155-03: 점검 안내 페이지 자체는 리다이렉트하지 않는다 (루프 방지)', async () => {
    const decision = await authGuard(
      makeRequest('/ko/maintenance'),
      makeSupabaseResponse(),
      {} as any,
      shipper
    );

    expect(decision).toBeNull();
    expect(isFeatureEnabledMock).toHaveBeenCalledWith('MAINTENANCE_MODE');
  });

  it('TC-1155-04: PENDING 사용자도 점검 안내 페이지에서 소속 경로로 되돌려지지 않는다', async () => {
    const decision = await authGuard(
      makeRequest('/ko/maintenance'),
      makeSupabaseResponse(),
      {} as any,
      pendingShipper
    );

    expect(decision).toBeNull();
  });

  it('TC-1155-05: SUSPENDED 사용자도 점검 안내 페이지에서 세션 종료 리다이렉트를 받지 않는다', async () => {
    const decision = await authGuard(
      makeRequest('/ko/maintenance'),
      makeSupabaseResponse(),
      {} as any,
      suspendedShipper
    );

    expect(decision).toBeNull();
  });

  it('TC-1155-06: 플랫폼 관리자는 점검 모드에서도 정상 통과한다', async () => {
    const decision = await authGuard(
      makeRequest('/ko/orders'),
      makeSupabaseResponse(),
      {} as any,
      platformAdmin
    );

    expect(decision).toBeNull();
  });

  it('TC-1155-07: 루트(/{locale})는 기존과 같이 점검 리다이렉트 대상이 아니다', async () => {
    const decision = await authGuard(makeRequest('/ko'), makeSupabaseResponse(), {} as any, shipper);

    expect(decision).toBeNull();
  });
});
