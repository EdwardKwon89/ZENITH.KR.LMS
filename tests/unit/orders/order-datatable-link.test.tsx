import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => children,
}));

import OrderDataTable from '@/components/orders/OrderDataTable';

const baseOrder = {
  id: 'order-001',
  order_no: 'ORD-001',
  order_type: 'EXPORT',
  shipper: { name: 'Test Shipper' },
  recipient_name: 'John Doe',
  origin_port: { code: 'ICN' },
  dest_port: { code: 'LAX' },
  status: 'CREATED',
  transport_mode: 'SEA',
};

const props = {
  orders: [baseOrder],
  totalCount: 1,
  currentPage: 1,
  pageSize: 10,
  locale: 'en',
};

describe('OrderDataTable View Details link', () => {
  it('non-UPS order links to standard detail page', () => {
    render(<OrderDataTable {...props} />);
    const link = screen.getByText('View Details');
    expect(link.getAttribute('href')).toBe('/en/orders/order-001');
  });

  it('UPS order links to ups-detail page', () => {
    const upsOrder = { ...baseOrder, transport_mode: 'UPS' };
    render(<OrderDataTable {...props} orders={[upsOrder]} />);
    const link = screen.getByText('View Details');
    expect(link.getAttribute('href')).toBe('/en/orders/order-001/ups-detail');
  });
});
