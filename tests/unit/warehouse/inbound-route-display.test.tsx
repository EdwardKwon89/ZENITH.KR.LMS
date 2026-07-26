import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

function RouteDisplay({ order }: { order: any }) {
  return (
    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
      {order.origin_port?.code || order.shipper_country_code || "-"}
      <span>→</span>
      {order.dest_port?.code || order.recipient_country_code || "-"}
    </span>
  );
}

describe('DEF-B-012: 운송경로 UPS 오더 country_code 폴백', () => {
  it('UPS 오더: port 없이 country_code로 표시', () => {
    const order = {
      origin_port: null,
      dest_port: null,
      shipper_country_code: 'KR',
      recipient_country_code: 'US',
    };
    const { container } = render(<RouteDisplay order={order} />);
    const span = container.querySelector('.font-semibold');
    expect(span?.textContent).toContain('KR');
    expect(span?.textContent).toContain('US');
  });

  it('AIR 오더: port 코드가 country_code보다 우선 표시', () => {
    const order = {
      origin_port: { code: 'ICN' },
      dest_port: { code: 'LAX' },
      shipper_country_code: 'KR',
      recipient_country_code: 'US',
    };
    const { container } = render(<RouteDisplay order={order} />);
    const span = container.querySelector('.font-semibold');
    expect(span?.textContent).toContain('ICN');
    expect(span?.textContent).toContain('LAX');
  });

  it('포트도 국가코드도 없으면 "-" 표시', () => {
    const order = {
      origin_port: null,
      dest_port: null,
      shipper_country_code: null,
      recipient_country_code: null,
    };
    const { container } = render(<RouteDisplay order={order} />);
    const span = container.querySelector('.font-semibold');
    expect(span?.textContent).toBe('-→-');
  });
});
