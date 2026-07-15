import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addressBookEntrySchema } from '@/lib/validation/address-book';

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

function makeDbMock(opts: { existingRows?: any[]; insertData?: any }) {
  return {
    from(table: string) {
      const chain: any = {};
      chain._rows = opts.existingRows || [];
      chain.select = () => chain;
      chain.insert = () => chain;
      chain.update = () => chain;
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.or = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
      chain.single = () => Promise.resolve({ data: null, error: null });
      chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });
      return chain;
    },
  };
}

describe('TC-ADDR-EMAIL: 주소록 recipient_email 저장/조회 (Issue #489)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-ADDR-EMAIL-01: Zod 스키마 — recipient_email optional/email 형식 검증', () => {
    const valid = addressBookEntrySchema.safeParse({
      display_name: '테스트',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      display_mode: 'EN',
      is_default: false,
      recipient_email: 'test@example.com',
    });
    expect(valid.success).toBe(true);
  });

  it('TC-ADDR-EMAIL-02: Zod 스키마 — recipient_email 없어도 통과 (optional)', () => {
    const valid = addressBookEntrySchema.safeParse({
      display_name: '테스트',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      display_mode: 'EN',
      is_default: false,
    });
    expect(valid.success).toBe(true);
  });

  it('TC-ADDR-EMAIL-03: Zod 스키마 — 잘못된 email 형식 → 실패', () => {
    const valid = addressBookEntrySchema.safeParse({
      display_name: '테스트',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      display_mode: 'EN',
      is_default: false,
      recipient_email: 'not-an-email',
    });
    expect(valid.success).toBe(false);
  });

  it('TC-ADDR-EMAIL-04: Zod 스키마 — 빈 문자열 email → 통과 (literal empty)', () => {
    const valid = addressBookEntrySchema.safeParse({
      display_name: '테스트',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      display_mode: 'EN',
      is_default: false,
      recipient_email: '',
    });
    expect(valid.success).toBe(true);
  });
});
