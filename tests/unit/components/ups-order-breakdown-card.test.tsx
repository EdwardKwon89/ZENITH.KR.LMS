import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/ui/ZenUI', () => ({
  ZenBadge: (props: any) => <span {...props}>{props.children}</span>,
}));

vi.mock('lucide-react', () => ({
  Package: () => <span data-testid="icon-package" />,
  ShieldCheck: () => <span data-testid="icon-shield" />,
  Scale: () => <span data-testid="icon-scale" />,
  Zap: () => <span data-testid="icon-zap" />,
  Globe: () => <span data-testid="icon-globe" />,
  DollarSign: () => <span data-testid="icon-dollar" />,
}));

import UpsOrderBreakdownCard from '@/components/ups/UpsOrderBreakdownCard';

describe('DEF-B-021: UpsOrderBreakdownCard 필드명 + 통화 수정', () => {
  it('KRW 통화: baseSellingPrice 필드와 ₩ 기호로 표시', () => {
    render(
      <UpsOrderBreakdownCard
        orderNo="ZEN-001"
        destCountryCode="KR"
        transportMode="UPS"
        snapshotMeta={{
          platform: {
            currency: 'KRW',
            breakdown: {
              baseSellingPrice: 306200,
              fuelSurchargeSellingAmount: 45000,
              surgeFeeSellingAmount: 0,
              otherChargesSellingTotal: 41800,
            },
            totalSellingPrice: 393000,
          },
        }}
        packages={[{ gross_weight: 5 }]}
      />
    );

    expect(screen.getByText('₩306200.00')).toBeTruthy();
    expect(screen.getByText('₩45000.00')).toBeTruthy();
    expect(screen.getByText('₩41800.00')).toBeTruthy();
    expect(screen.getByText('₩393000.00 KRW')).toBeTruthy();
  });

  it('USD 통화: baseSellingPrice 필드와 $ 기호로 표시', () => {
    render(
      <UpsOrderBreakdownCard
        orderNo="ZEN-002"
        destCountryCode="US"
        transportMode="UPS"
        snapshotMeta={{
          platform: {
            currency: 'USD',
            breakdown: {
              baseSellingPrice: 150,
              fuelSurchargeSellingAmount: 25,
              surgeFeeSellingAmount: 10,
              otherChargesSellingTotal: 5,
            },
            totalSellingPrice: 190,
          },
        }}
        packages={[{ gross_weight: 3 }]}
      />
    );

    expect(screen.getByText('$150.00')).toBeTruthy();
    expect(screen.getByText('$25.00')).toBeTruthy();
    expect(screen.getByText('$10.00')).toBeTruthy();
    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('$190.00 USD')).toBeTruthy();
  });

  it('구 필드명(baseFreight 등)도 폴백으로 동작', () => {
    render(
      <UpsOrderBreakdownCard
        orderNo="ZEN-003"
        destCountryCode="JP"
        transportMode="UPS"
        snapshotMeta={{
          platform: {
            currency: 'USD',
            breakdown: {
              baseFreight: 100,
              fuelSurcharge: 20,
              surgeFee: 5,
              extraCharges: 3,
            },
          },
        }}
        packages={[{ gross_weight: 2 }]}
      />
    );

    expect(screen.getByText('$100.00')).toBeTruthy();
    expect(screen.getByText('$20.00')).toBeTruthy();
    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('$3.00')).toBeTruthy();
  });
});
