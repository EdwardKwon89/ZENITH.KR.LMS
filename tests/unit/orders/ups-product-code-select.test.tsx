import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { UpsFreightEstimateSection } from '@/components/orders/UpsFreightEstimateSection';

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: (...args: any[]) => estimateMock(...args),
}));
vi.mock('@/app/actions/ups/rates', () => ({
  getUpsProducts: vi.fn().mockResolvedValue([
    { id: 'uuid-saver', product_code: 'WW_SAVER_NONDOC', product_name: 'Saver', cargo_type: 'NON_DOC' },
    { id: 'uuid-expedited', product_code: 'WW_EXPEDITED', product_name: 'Expedited', cargo_type: 'NON_DOC' },
  ]),
}));
vi.mock('@/app/actions/agency/shipper-link', () => ({
  getAgencyOrgIdByShipper: vi.fn().mockResolvedValue(null),
}));

const estimateMock = vi.fn().mockRejectedValue(new Error('not under test'));

// OrderRegistrationForm과 동일하게 배선: upsProductId(UUID, 로컬) + ups_product_code(코드 문자열)
function Wrapper() {
  const [upsProductId, setUpsProductId] = useState<string | undefined>();
  const [upsProductCode, setUpsProductCode] = useState<string | undefined>();
  return (
    <div>
      <div data-testid="current-id">{upsProductId}</div>
      <div data-testid="current-code">{upsProductCode}</div>
      <UpsFreightEstimateSection
        shipperOrgId="shipper-1"
        destCountryCode="JP"
        packages={[{ gross_weight: 5 } as any]}
        selectedProductId={upsProductId}
        onProductChange={(id, code) => { setUpsProductId(id); setUpsProductCode(code); }}
        onIncotermsChange={() => {}}
      />
    </div>
  );
}

describe('TC-ISS543-01: UPS 서비스 티어 선택 유지 + product_code 저장', () => {
  it('Expedited 선택 시 선택이 유지되고, product_code는 문자열, estimateUpsFreight는 UUID로 호출됨', async () => {
    render(<Wrapper />);

    await waitFor(() => {
      expect(screen.getByTestId('current-code').textContent).toBe('WW_SAVER_NONDOC');
    });

    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'uuid-expedited' } });

    await waitFor(() => {
      expect(screen.getByTestId('current-id').textContent).toBe('uuid-expedited');
      expect(screen.getByTestId('current-code').textContent).toBe('WW_EXPEDITED');
    });

    // 리셋 안 되는지 재확인
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('current-id').textContent).toBe('uuid-expedited');
    expect(screen.getByTestId('current-code').textContent).toBe('WW_EXPEDITED');

    await waitFor(() => {
      expect(estimateMock).toHaveBeenCalledWith(expect.objectContaining({ productId: 'uuid-expedited' }));
    });
  });
});
