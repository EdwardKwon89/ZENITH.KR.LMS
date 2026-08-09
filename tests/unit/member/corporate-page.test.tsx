import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CorporatePage from '@/app/[locale]/(dashboard)/mypage/corporate/page';

const mocks = vi.hoisted(() => ({
  getOrganizationInfo: vi.fn(),
  updateOrganizationInfo: vi.fn(),
  getDepartments: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
}));

vi.mock('@/app/actions/corporate', () => mocks);

vi.mock('@/components/ui/ZenUI', () => {
  const React = require('react');
  return {
    ZenCard: ({ children }: any) => React.createElement('div', null, children),
    ZenButton: ({ children, ...props }: any) => React.createElement('button', props, children),
    ZenInput: (props: any) => React.createElement('input', props),
  };
});

vi.mock('lucide-react', () => {
  const React = require('react');
  const Icon = ({ size, ...props }: any) => React.createElement('span', props);
  return {
    Building2: Icon,
    Users: Icon,
    Save: Icon,
    Plus: Icon,
    Trash2: Icon,
    Edit2: Icon,
    Loader2: Icon,
    Landmark: Icon,
    MapPin: Icon,
    Phone: Icon,
    Mail: Icon,
    FileText: Icon,
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('CorporatePage (Issue #943 — 실제 컬럼 연결 렌더링)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-MEM-07: getOrganizationInfo mock이 반환한 rep_name/biz_no/contact_phone/contact_email/address 값이 폼 입력란에 실제로 표시된다', async () => {
    (mocks.getOrganizationInfo as any).mockResolvedValue({
      id: 'org-456',
      name: '테스트 법인',
      rep_name: '홍길동',
      biz_no: '123-45-67890',
      contact_phone: '010-1111-2222',
      contact_email: 'corp@zenith.kr',
      address: '서울특별시 강남구 테헤란로 123',
    });
    (mocks.getDepartments as any).mockResolvedValue({ departments: [] });

    const { container } = render(<CorporatePage />);

    await waitFor(() => {
      expect(mocks.getOrganizationInfo).toHaveBeenCalledTimes(1);
      expect(mocks.getDepartments).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const repInput = container.querySelector('input[name="representative"]') as HTMLInputElement;
      expect(repInput.value).toBe('홍길동');
    });

    const bizInput = container.querySelector('input[name="bizNo"]') as HTMLInputElement;
    expect(bizInput.value).toBe('123-45-67890');

    const contactInput = container.querySelector('input[name="contact"]') as HTMLInputElement;
    expect(contactInput.value).toBe('010-1111-2222');

    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
    expect(emailInput.value).toBe('corp@zenith.kr');

    const addressInput = container.querySelector('input[name="address"]') as HTMLInputElement;
    expect(addressInput.value).toBe('서울특별시 강남구 테헤란로 123');
  });

  it('TC-MEM-08: 조직 정보가 없으면 빈 입력란으로 렌더링된다', async () => {
    (mocks.getOrganizationInfo as any).mockResolvedValue(null);
    (mocks.getDepartments as any).mockResolvedValue({ departments: [] });

    const { container } = render(<CorporatePage />);

    await waitFor(() => {
      expect(mocks.getOrganizationInfo).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const repInput = container.querySelector('input[name="representative"]') as HTMLInputElement;
      expect(repInput.value).toBe('');
    });
  });

  it('TC-MEM-09: 데이터 로딩 중 스피너 문구가 표시된다', async () => {
    (mocks.getOrganizationInfo as any).mockReturnValue(new Promise(() => {}));
    (mocks.getDepartments as any).mockReturnValue(new Promise(() => {}));

    render(<CorporatePage />);

    expect(screen.getByText('정보를 불러오고 있습니다...')).toBeDefined();
  });
});
