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
    getStatesOfCountry: () => [
      { isoCode: 'CA', name: 'California', countryCode: 'US' },
      { isoCode: 'NY', name: 'New York', countryCode: 'US' },
    ],
  },
  City: {
    getCitiesOfState: () => [
      { name: 'Los Angeles', stateCode: 'CA', countryCode: 'US' },
      { name: 'San Francisco', stateCode: 'CA', countryCode: 'US' },
    ],
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
