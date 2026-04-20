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
