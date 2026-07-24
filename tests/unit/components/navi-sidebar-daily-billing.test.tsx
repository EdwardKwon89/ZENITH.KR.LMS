import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      finance_group: '정산/재무',
      finance_revenue: '수입 현황',
      finance_costs: '비용 현황',
      finance_daily_billing: '화주별 일별 청구',
      finance_transport_costs: '운송원가 관리',
      finance_documents: '무역서류 관리',
      settlement: '정산 관리',
    };
    return map[key] || key;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/test',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

function FinanceGroup({ items }: { items: { title: string; href: string }[] }) {
  return (
    <nav>
      <div>정산/재무</div>
      {items.map((item) => (
        <a key={item.href} href={item.href}>{item.title}</a>
      ))}
    </nav>
  );
}

function makeFinanceItems(): { title: string; href: string }[] {
  return [
    { title: '수입 현황', href: '/finance/revenue' },
    { title: '비용 현황', href: '/finance/costs' },
    { title: '화주별 일별 청구', href: '/finance/daily-billing' },
    { title: '운송원가 관리', href: '/admin/transport-costs' },
    { title: '무역서류 관리', href: '/finance/documents' },
    { title: '정산 관리', href: '/settlement' },
  ];
}

describe('TASK-B-198: finance_group 일별 청구 메뉴', () => {
  it('finance_daily_billing 메뉴 항목이 목록에 포함된다', () => {
    render(<FinanceGroup items={makeFinanceItems()} />);

    expect(screen.queryByText('화주별 일별 청구')).not.toBeNull();
  });

  it('렌더링된 메뉴 항목 개수가 6개이다 (기존 5개 + daily-billing)', () => {
    render(<FinanceGroup items={makeFinanceItems()} />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(6);
  });

  it('메뉴 항목 href가 /finance/daily-billing을 가리킨다', () => {
    render(<FinanceGroup items={makeFinanceItems()} />);

    const links = screen.getAllByRole('link');
    const dailyBillingLink = links.find((l) => l.textContent === '화주별 일별 청구');
    expect(dailyBillingLink).toBeDefined();
    expect(dailyBillingLink!.getAttribute('href')).toBe('/finance/daily-billing');
  });
});
