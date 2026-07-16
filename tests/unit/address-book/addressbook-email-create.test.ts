import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAddressBookEntry } from '@/app/actions/operations/address-book';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('TC-ADDR-01: createAddressBookEntry recipient_email 포함 검증', () => {
  const mockProfile = { id: 'user-1', org_id: 'org-1' };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.then = vi.fn().mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: mockProfile,
    });
  });

  it('createAddressBookEntry가 recipient_email을 payload에 포함한다', async () => {
    const input = {
      display_name: '테스트 주소',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      recipient_email: 'test@example.com',
      display_mode: 'EN' as const,
      is_default: false,
    };

    await createAddressBookEntry(input);

    const insertCall = mockSupabase.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    expect(insertCall.recipient_email).toBe('test@example.com');
  });

  it('createAddressBookEntry가 recipient_email 없이도 동작한다', async () => {
    const input = {
      display_name: '테스트 주소',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      display_mode: 'EN' as const,
      is_default: false,
    };

    await createAddressBookEntry(input);

    const insertCall = mockSupabase.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    expect(insertCall.recipient_email).toBeUndefined();
  });
});
