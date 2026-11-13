import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 전역 Mocking 설정 (필요 시)
// 예: window.matchMedia 등 브라우저 API 대응
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// server-only 모듈 Mock (vitest 환경에서 사용 불가)
vi.mock('server-only', () => ({}));

// Next.js Cache & Navigation Mocks
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn, // 캐시 레이어 무시하고 원본 함수 실행
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// DEF-136: validateUserAction()이 withRequestContext()를 거치며 next/headers를 호출하므로
// 전역으로 mock — 실제 요청 스코프 밖(vitest)에서 호출하면 Next.js가 에러를 던짐.
// 개별 테스트 파일에서 x-request-id 값을 다르게 검증해야 하면 파일 단위 vi.mock으로 덮어쓸 수 있음.
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: () => null }),
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
    getAll: () => [],
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// TASK-B-350 (Issue #1292): 서버 액션 로케일 헬퍼(`src/lib/i18n/action-error.ts`) 전역 mock.
// - 요청 컨텍스트가 없는 vitest에서는 next-intl의 헤더 기반 로케일 해석이 불가능하므로 ko 고정.
// - ⚠️ 키 문자열을 그대로 반환하면 `toBe` 단언이 의미를 잃으므로, messages/ko.json 의 **실제 값**을
//   namespace 경로로 조회해 ICU 플레이스홀더({code} 등)까지 치환해 돌려준다.
// - 개별 테스트가 `vi.mock('next-intl/server', …)`로 덮어쓰면 그 mock이 우선한다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KO_MESSAGES: Record<string, unknown> = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/ko.json'), 'utf-8'),
);

function messageByPath(path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, segment) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[segment] : undefined),
    KO_MESSAGES,
  );
}

function interpolate(message: string, params?: Record<string, unknown>): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

vi.mock('next-intl/server', () => {
  const makeTranslator = (namespace?: string) =>
    (key: string, params?: Record<string, unknown>): string => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const raw = messageByPath(fullPath);
      if (typeof raw !== 'string') {
        throw new Error(`MISSING_MESSAGE: ${fullPath} (messages/ko.json)`);
      }
      return interpolate(raw, params);
    };

  return {
    getLocale: vi.fn(async () => 'ko'),
    getTranslations: vi.fn(
      async (arg?: string | { locale?: string; namespace?: string }) => {
        const namespace = typeof arg === 'string' ? arg : arg?.namespace;
        return makeTranslator(namespace);
      },
    ),
  };
});
