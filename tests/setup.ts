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
