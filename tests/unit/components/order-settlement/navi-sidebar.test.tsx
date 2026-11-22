// TASK-B-369 (Issue #1425) — Admin "정산/재무" 메뉴에 오더정산 항목이 실제로 렌더되는지 단언한다.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/ko/dashboard',
  useParams: () => ({ locale: 'ko' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import NaviSidebar from '@/components/layout/NaviSidebar';

afterEach(() => cleanup());

describe('NaviSidebar — 오더정산 메뉴 (TASK-B-369)', () => {
  it('TC-369-13: Admin 메뉴에 /finance/order-settlement 링크가 렌더된다', () => {
    render(<NaviSidebar profile={{ role: 'ADMIN', full_name: 'Admin' }} />);

    // "정산/재무" 그룹을 펼쳐 하위 메뉴를 확인한다.
    fireEvent.click(screen.getByText('finance_group'));

    const link = screen.getByRole('link', { name: 'order_settlement_nav' });
    expect(link.getAttribute('href')).toBe('/ko/finance/order-settlement');
  });

  it('TC-369-14: 대리점 메뉴에는 오더정산 링크가 없다', () => {
    render(<NaviSidebar profile={{ role: 'AGENCY', full_name: 'Agency' }} />);

    expect(screen.queryByRole('link', { name: 'order_settlement_nav' })).toBeNull();
  });
});
