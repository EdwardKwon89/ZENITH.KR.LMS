// TASK-B-343: AddressInput 쉼표 입력 시 공백 치환 검증
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddressInput } from '@/components/common/AddressInput';

vi.mock('react-daum-postcode', () => ({
  DaumPostcodeEmbed: ({ onComplete }: { onComplete: (data: any) => void }) => (
    <button data-testid="select-address" onClick={() => onComplete({
      roadAddress: '123 Teheran-ro, Gangnam-gu, Seoul',
      roadAddressEnglish: '123 Teheran-ro, Gangnam-gu, Seoul',
      zonecode: '061234',
      sido: '서울',
      sigungu: '강남구',
    })}>select-address</button>
  ),
}));

vi.mock('country-state-city', () => ({
  Country: { getAllCountries: () => [{ isoCode: 'KR', name: 'South Korea' }, { isoCode: 'US', name: 'United States' }] },
  State: { getStatesOfCountry: () => [{ isoCode: '11', name: 'Seoul' }, { isoCode: 'CA', name: 'California' }] },
  City: { getCitiesOfState: () => [{ name: 'Seoul', stateCode: '11' }, { name: 'Los Angeles', stateCode: 'CA' }] },
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    form_address: 'Address',
    form_country: 'Country',
    form_zipcode: 'Zip Code',
    form_state_province: 'State/Province',
    form_city: 'City',
    form_address_detail: 'Address Detail',
    form_address_search: 'Search',
  };
  return map[key] || key;
};

describe('TC-343-UI: AddressInput 쉼표 입력 시 공백 치환', () => {
  it('해외 국가에서 주소 입력 시 쉼표가 공백으로 치환된다', () => {
    render(<AddressInput t={mockT} />);
    const countrySelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(countrySelect, { target: { value: 'US' } });
    const addressInput = document.querySelector('input[name="address"]') as HTMLInputElement;
    expect(addressInput).not.toBeNull();
    fireEvent.change(addressInput!, { target: { value: '123 Main St, Apt 1' } });
    expect(addressInput!.value).toBe('123 Main St Apt 1');
  });

  it('상세주소 입력 시 쉼표가 공백으로 치환된다', () => {
    render(<AddressInput t={mockT} />);
    const countrySelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(countrySelect, { target: { value: 'US' } });
    const detailInput = document.querySelector('input[name="address_detail"]') as HTMLInputElement;
    expect(detailInput).not.toBeNull();
    fireEvent.change(detailInput!, { target: { value: 'Apt 1, 2F' } });
    expect(detailInput!.value).toBe('Apt 1 2F');
  });

  it('다음우편번호 자동채움 시 address_english는 쉼표 원본 유지 (도로명 추출 순서 보장)', () => {
    const { container } = render(<AddressInput t={mockT} />);
    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);
    const selectAddressButton = screen.getByRole('button', { name: 'select-address' });
    fireEvent.click(selectAddressButton);
    const hiddenInput = container.querySelector('input[name="address_english"]') as HTMLInputElement;
    expect(hiddenInput?.value).toBe('123 Teheran-ro, Gangnam-gu, Seoul');
  });
});
