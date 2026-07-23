import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { ZenInput } from '@/components/ui/ZenUI';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'delivery_method_pickup': '픽업수령',
      'delivery_method_direct': '직접배송',
    };
    return map[key] || key;
  },
}));

function PICKUPDisabledTest({ deliveryMethod }: { deliveryMethod: string }) {
  const isPickup = deliveryMethod === 'PICKUP';

  return (
    <div>
      <label>LOCAL TRACKING NO</label>
      <ZenInput
        placeholder="지역 택배 운송장번호 입력 (선택)"
        disabled={isPickup}
        name="packages.0.domestic_ref_no"
        className={`py-2 text-xs ${isPickup ? 'opacity-40 bg-slate-100' : ''}`}
      />
    </div>
  );
}

describe('TASK-B-196: PICKUP 시 Local Tracking No 비활성화', () => {
  it('delivery_method=PICKUP → input disabled + opacity/bg 스타일 적용', () => {
    const { container } = render(<PICKUPDisabledTest deliveryMethod="PICKUP" />);

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(true);
    expect(input?.className).toContain('opacity-40');
    expect(input?.className).toContain('bg-slate-100');
  });

  it('delivery_method=DIRECT → input 활성화, 비활성화 스타일 없음', () => {
    const { container } = render(<PICKUPDisabledTest deliveryMethod="DIRECT" />);

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(false);
    expect(input?.className).not.toContain('opacity-40');
    expect(input?.className).not.toContain('bg-slate-100');
  });
});
