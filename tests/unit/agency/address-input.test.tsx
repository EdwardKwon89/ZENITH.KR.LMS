import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressInput } from '@/components/common/AddressInput';

const mockT = (key: string) => {
  const map: Record<string, string> = {
    form_address: 'Address',
    form_address_detail: 'Detail Address',
    form_country: 'Country',
    form_zipcode: 'Zip Code',
    form_state_province: 'State / Province',
    form_city: 'City',
    form_address_search: 'Search',
  };
  return map[key] ?? key;
};

vi.mock('react-daum-postcode', () => ({
  DaumPostcodeEmbed: ({ onComplete }: { onComplete: (data: any) => void }) => (
    <div data-testid="daum-postcode-embed">
      <button
        onClick={() => onComplete({ roadAddress: '123 Teheran-ro', zonecode: '061234' })}
      >
        select-address
      </button>
    </div>
  ),
}));

vi.mock('country-state-city', () => ({
  Country: {
    getAllCountries: () => [
      { isoCode: 'KR', name: 'South Korea' },
      { isoCode: 'US', name: 'United States' },
      { isoCode: 'JP', name: 'Japan' },
    ],
  },
  State: {
    getStatesOfCountry: (countryCode: string) => {
      if (countryCode === 'US') {
        return [
          { isoCode: 'CA', name: 'California', countryCode: 'US' },
          { isoCode: 'NY', name: 'New York', countryCode: 'US' },
        ];
      }
      if (countryCode === 'JP') {
        return [{ isoCode: '02', name: 'Aomori', countryCode: 'JP' }];
      }
      return [];
    },
  },
  City: {
    getCitiesOfState: (countryCode: string, stateCode: string) => {
      if (countryCode === 'US' && stateCode === 'CA') {
        return [
          { name: 'Los Angeles', stateCode: 'CA', countryCode: 'US' },
          { name: 'San Francisco', stateCode: 'CA', countryCode: 'US' },
        ];
      }
      if (countryCode === 'US' && stateCode === 'NY') {
        return [
          { name: 'New York', stateCode: 'NY', countryCode: 'US' },
          { name: 'Buffalo', stateCode: 'NY', countryCode: 'US' },
        ];
      }
      return [];
    },
  },
}));

describe('TC-P7-UI-ADDR-01: 국가 KR 선택 시 주소 검색 버튼 표시 확인', () => {
  it('KR 선택 시: zipcode input(readOnly) + 주소 검색 버튼 표시', () => {
    render(<AddressInput t={mockT} />);

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
    expect((selects[0] as HTMLSelectElement).value).toBe('KR');

    expect(screen.getByPlaceholderText('Zip Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('US 선택 시: 주소 검색 버튼 미표시, state/city select 표시', async () => {
    render(<AddressInput t={mockT} />);

    const countrySelect = screen.getByRole('combobox');
    fireEvent.change(countrySelect, { target: { value: 'US' } });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('JP 선택 시: state/city select 표시', async () => {
    render(<AddressInput t={mockT} />);

    const countrySelect = screen.getByRole('combobox');
    fireEvent.change(countrySelect, { target: { value: 'JP' } });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    });
  });

  it('KR 선택 → 검색 버튼 클릭 → DaumPostcodeEmbed 모달 표시', () => {
    render(<AddressInput t={mockT} />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    expect(screen.getByTestId('daum-postcode-embed')).toBeInTheDocument();
  });
});

describe('TC-P7-UI-ADDR-02: 주소 검색 완료 후 roadAddress + zipcode 상태 반영', () => {
  it('KR 선택 → 검색 버튼 클릭 → 모달 내 주소 선택 → roadAddress/zipcode 반영', () => {
    render(<AddressInput t={mockT} />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    const selectAddressButton = screen.getByRole('button', { name: 'select-address' });
    fireEvent.click(selectAddressButton);

    const addressInput = screen.getByPlaceholderText('Search') as HTMLInputElement;
    expect(addressInput.value).toBe('123 Teheran-ro');

    const zipInput = screen.getByPlaceholderText('Zip Code') as HTMLInputElement;
    expect(zipInput.value).toBe('061234');

    expect(screen.queryByTestId('daum-postcode-embed')).not.toBeInTheDocument();
  });
});

describe('TC-P7-UI-ADDR-03: defaultValues 갱신 시 state/city 보존 (Issue #530)', () => {
  it('비KR defaultValues로 렌더링 후 다른 defaultValues로 rerender 시 state/city 값 유지', () => {
    const setValue = vi.fn();
    const { rerender } = render(
      <AddressInput
        t={mockT}
        mode="rhf"
        prefix="recipient"
        setValue={setValue}
        defaultValues={{ country_code: 'US', state_province: 'CA', city: 'Los Angeles' }}
      />
    );

    // 초기 렌더링: state/city 값이 반영됨
    const selects = screen.getAllByRole('combobox');
    const stateSelect = selects[1] as HTMLSelectElement;
    const citySelect = selects[2] as HTMLSelectElement;
    expect(stateSelect.value).toBe('CA');
    expect(citySelect.value).toBe('Los Angeles');

    // 주소록 적용 모의: 다른 defaultValues로 rerender (동일 국가, state만 변경)
    rerender(
      <AddressInput
        t={mockT}
        mode="rhf"
        prefix="recipient"
        setValue={setValue}
        defaultValues={{ country_code: 'US', state_province: 'NY', city: 'New York' }}
      />
    );

    // state/city 값이 의도대로 반영되고 리셋되지 않음
    const selectsAfter = screen.getAllByRole('combobox');
    expect((selectsAfter[1] as HTMLSelectElement).value).toBe('NY');
    expect((selectsAfter[2] as HTMLSelectElement).value).toBe('New York');
  });

  it('사용자가 국가 select를 직접 변경하면 state/city가 리셋됨 (기존 동작 보존)', async () => {
    const setValue = vi.fn();
    render(
      <AddressInput
        t={mockT}
        mode="rhf"
        prefix="recipient"
        setValue={setValue}
        defaultValues={{ country_code: 'US', state_province: 'CA', city: 'Los Angeles' }}
      />
    );

    // 직접 국가 변경 → 리셋되어야 함
    const countrySelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(countrySelect, { target: { value: 'JP' } });

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect((selects[1] as HTMLSelectElement).value).toBe('');
      expect((selects[2] as HTMLSelectElement).value).toBe('');
    });
  });

  it('사용자가 state select를 직접 변경하면 city가 리셋됨 (기존 동작 보존)', async () => {
    const setValue = vi.fn();
    render(
      <AddressInput
        t={mockT}
        mode="rhf"
        prefix="recipient"
        setValue={setValue}
        defaultValues={{ country_code: 'US', state_province: 'CA', city: 'Los Angeles' }}
      />
    );

    // 직접 state 변경 → city 리셋
    const selects = screen.getAllByRole('combobox');
    const stateSelect = selects[1];
    fireEvent.change(stateSelect, { target: { value: 'NY' } });

    await waitFor(() => {
      const selectsAfter = screen.getAllByRole('combobox');
      expect((selectsAfter[1] as HTMLSelectElement).value).toBe('NY');
      expect((selectsAfter[2] as HTMLSelectElement).value).toBe('');
    });
  });
});
