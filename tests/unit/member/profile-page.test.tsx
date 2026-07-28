import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/[locale]/(dashboard)/mypage/profile/page';

vi.mock('@/app/actions/member', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  withdrawUser: vi.fn(),
}));

vi.mock('@/app/actions/operations/address-book', () => ({
  getAddressBookEntries: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      my_profile_title: '프로필 관리',
      my_profile_desc: '회원님의 기본 정보를 확인하고 수정할 수 있습니다.',
      full_name_label: '성명',
      email_label: '이메일',
    };
    return translations[key] || key;
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/mypage/WithdrawalModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? <div>WithdrawalModal</div> : null,
}));

import { getMyProfile } from '@/app/actions/member';
import { getAddressBookEntries } from '@/app/actions/operations/address-book';

describe('ProfilePage with Address Book', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PROFILE-AB-01: getMyProfile과 getAddressBookEntries가 모두 호출되고 주소록 항목이 화면에 나타난다', async () => {
    (getMyProfile as any).mockResolvedValue({
      id: 'user-1',
      email: 'test@zenith.kr',
      full_name: 'Test User',
      role: 'ADMIN',
    });

    (getAddressBookEntries as any).mockResolvedValue({
      entries: [
        {
          id: 'addr-1',
          display_name: '테스트 주소',
          recipient_name: 'Test Recipient',
          recipient_address: '123 Test St',
        },
      ],
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalledTimes(1);
      expect(getAddressBookEntries).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('주소 정보 관리')).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText('테스트 주소')).toBeDefined();
    });
  });

  it('TC-PROFILE-AB-02: 주소록 항목이 없으면 빈 상태로 렌더링된다', async () => {
    (getMyProfile as any).mockResolvedValue({
      id: 'user-2',
      email: 'test2@zenith.kr',
      full_name: 'Test User 2',
      role: 'CORPORATE',
    });

    (getAddressBookEntries as any).mockResolvedValue({
      entries: [],
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalledTimes(1);
      expect(getAddressBookEntries).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('주소 정보 관리')).toBeDefined();
    });
  });
});
