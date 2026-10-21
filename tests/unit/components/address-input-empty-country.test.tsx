// TASK-B-340 (Issue #1256): 화주 국가코드가 빈 문자열('')일 때 수정 화면 "주소"가 비는 결함.
//
// 원인: AddressInput은 국가 표시를 `|| 'KR'`로 보정하지만, roadAddress 초기화(63행)는
//       `country_code === 'KR'` 엄격 비교라 ''이면 주소를 채우지 않는다.
// 검증: 실제 AddressInput을 렌더해 (a) '' + 한국 주소 → 주소 표시 (b) 'KR' 회귀 (c) 'US' 해외 입력.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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
  DaumPostcodeEmbed: () => <div data-testid="daum-postcode-embed" />,
}));

const KOREAN_ADDRESS = '경기 성남시 수정구 수정남로326번길 4-6';

function renderWithCountry(countryCode: string, address: string) {
  return render(
    <AddressInput
      t={mockT}
      defaultValues={{ country_code: countryCode, address }}
    />
  );
}

describe('TASK-B-340 (Issue #1256): AddressInput 화주 국가코드 빈 값 표시', () => {
  it('TC-340-A: country_code 빈 문자열 + 한국 주소 → "주소" 입력에 주소가 표시된다', () => {
    renderWithCountry('', KOREAN_ADDRESS);

    // 다른 요소(국가 select)가 먼저 존재함을 단언한 뒤 부정/긍정 단언으로 진행
    expect(screen.getByText('Country')).toBeTruthy();
    const addressInput = screen.getByPlaceholderText('Search') as HTMLInputElement;
    expect(addressInput.value).toBe(KOREAN_ADDRESS);
  });

  it('TC-340-B: country_code "KR" + 한국 주소 → 동일하게 주소가 표시된다 (회귀)', () => {
    renderWithCountry('KR', KOREAN_ADDRESS);

    expect(screen.getByText('Country')).toBeTruthy();
    const addressInput = screen.getByPlaceholderText('Search') as HTMLInputElement;
    expect(addressInput.value).toBe(KOREAN_ADDRESS);
  });

  it('TC-340-C: country_code "US" + 주소 → 해외 주소 입력에 표시되고 한국 주소 검색칸은 없다', () => {
    const { container } = renderWithCountry('US', '123 Main St, Los Angeles');

    // 다른 요소(국가 select)가 먼저 존재
    expect(screen.getByText('Country')).toBeTruthy();
    expect(screen.getAllByText('Address').length).toBeGreaterThan(0);

    // 해외 주소 입력(placeHolder 없음, 편집 가능)에 주소 표시
    const textInputs = Array.from(container.querySelectorAll('input')).filter(
      (el) => el.getAttribute('type') !== 'hidden'
    ) as HTMLInputElement[];
    const addressInput = textInputs.find((el) => el.value === '123 Main St, Los Angeles');
    expect(addressInput).toBeTruthy();
    expect(addressInput?.readOnly).toBe(false);

    // 한국 전용 roadAddress 입력(placeholder='Search')은 렌더되지 않는다 = roadAddress 빈 상태
    expect(screen.queryByPlaceholderText('Search')).toBeNull();
  });
});
