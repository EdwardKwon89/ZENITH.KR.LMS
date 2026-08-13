// TASK-B-298 (Issue #1106): DEF-B-064 — AddressInput 시/군/구 매칭을 sigunguEnglish 대신 한글 sigungu 기반으로 전환.
//
// Kakao `sigunguEnglish`(영문)는 부가 필드라 일부 도로(대왕판교로 등)에서 비어있거나 불완전할 수 있음.
// 신뢰할 수 있는 한글 `sigungu`의 첫 토큰을 12개 구 설치 시 매핑 테이블로 변환해 1차 매칭하고,
// 매핑에 없으면 TASK-B-297(DEF-B-063)의 `sigunguEnglish` 최장 prefix 매칭을 폴백으로 유지한다.
// (AddressInput mock 금지 — 실제 컴포넌트 렌더링)
//
// 검증 시나리오:
//  TC-298-01: sigungu="성남시 분당구" + sigunguEnglish 빈 문자열 → "Seongnam-si" (대왕판교로 재현, 핵심)
//  TC-298-02: 수원시 → "Suwon" ('-si' 없는 예외)
//  TC-298-03: 천안시 → "Cheonan-si" (동명이인 'Cheonan' 존재 — 반드시 '-si' 버전)
//  TC-298-04: 전주시 → "Jeonju-si" (동명이인 'Jeonju' 존재)
//  TC-298-05: 포항시 → "Pohang-si" (동명이인 'Pohang' 존재)
//  TC-298-06: 매핑에 없는 케이스(서울 "Gangnam-gu") → 기존 DEF-B-063 폴백 로직 회귀 없이 동작
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AddressInput } from '@/components/common/AddressInput';

const h = vi.hoisted(() => ({
  mockDaumData: {
    roadAddress: 'Daewangpangyo-ro 123',
    zonecode: '13487',
    roadAddressEnglish: '123 Daewangpangyo-ro, Seongnam-si',
    sido: '경기도',
    sidoEnglish: 'Gyeonggi-do',
    sigungu: '성남시 분당구',
    sigunguEnglish: '',
  },
}));

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
      <button onClick={() => onComplete(h.mockDaumData)}>select-address</button>
    </div>
  ),
}));

function citySelectOf(container: HTMLElement): HTMLSelectElement {
  // AddressInput 단독 렌더: [0]=country, [1]=state, [2]=city
  return Array.from(container.querySelectorAll('select'))[2] as HTMLSelectElement;
}

async function searchAndSelect(container: HTMLElement) {
  const searchButton = screen.getByRole('button', { name: 'Search' });
  fireEvent.click(searchButton);
  fireEvent.click(screen.getByRole('button', { name: 'select-address' }));
  await waitFor(() => {
    expect(screen.queryByTestId('daum-postcode-embed')).not.toBeInTheDocument();
  });
}

describe('TASK-B-298 (Issue #1106) DEF-B-064: 한글 sigungu 기반 매칭', () => {
  beforeEach(() => {
    h.mockDaumData = {
      roadAddress: 'Daewangpangyo-ro 123',
      zonecode: '13487',
      roadAddressEnglish: '123 Daewangpangyo-ro, Seongnam-si',
      sido: '경기도',
      sidoEnglish: 'Gyeonggi-do',
      sigungu: '성남시 분당구',
      sigunguEnglish: '',
    };
  });

  it('TC-298-01: sigunguEnglish가 빈 문자열이어도 한글 sigungu("성남시 분당구")로 "Seongnam-si" 선택된다', async () => {
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Seongnam-si');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Seongnam-si');
    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '41');
  });

  it('TC-298-02: 수원시 → "Suwon" ("-si" 접미사 없는 예외 케이스)', async () => {
    h.mockDaumData = {
      roadAddress: 'Suwon-ro 1',
      zonecode: '16460',
      roadAddressEnglish: '1 Suwon-ro',
      sido: '경기도',
      sidoEnglish: 'Gyeonggi-do',
      sigungu: '수원시 팔달구',
      sigunguEnglish: '',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Suwon');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Suwon');
  });

  it('TC-298-03: 천안시 → "Cheonan-si" (라이브러리에 "Cheonan" 동명이인 존재 — 반드시 "-si" 버전)', async () => {
    h.mockDaumData = {
      roadAddress: 'Cheonan-ro 1',
      zonecode: '31100',
      roadAddressEnglish: '1 Cheonan-ro',
      sido: '충남',
      sidoEnglish: 'Chungcheongnam-do',
      sigungu: '천안시 서북구',
      sigunguEnglish: '',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Cheonan-si');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Cheonan-si');
    expect(setValue).not.toHaveBeenCalledWith('shipper_city', 'Cheonan');
  });

  it('TC-298-04: 전주시 → "Jeonju-si" (라이브러리에 "Jeonju" 동명이인 존재 — 반드시 "-si" 버전)', async () => {
    h.mockDaumData = {
      roadAddress: 'Jeonju-ro 1',
      zonecode: '54900',
      roadAddressEnglish: '1 Jeonju-ro',
      sido: '전북',
      sidoEnglish: 'Jeollabuk-do',
      sigungu: '전주시 덕진구',
      sigunguEnglish: '',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Jeonju-si');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Jeonju-si');
    expect(setValue).not.toHaveBeenCalledWith('shipper_city', 'Jeonju');
  });

  it('TC-298-05: 포항시 → "Pohang-si" (라이브러리에 "Pohang" 동명이인 존재 — 반드시 "-si" 버전)', async () => {
    h.mockDaumData = {
      roadAddress: 'Pohang-ro 1',
      zonecode: '37600',
      roadAddressEnglish: '1 Pohang-ro',
      sido: '경북',
      sidoEnglish: 'Gyeongsangbuk-do',
      sigungu: '포항시 북구',
      sigunguEnglish: '',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Pohang-si');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Pohang-si');
    expect(setValue).not.toHaveBeenCalledWith('shipper_city', 'Pohang');
  });

  it('TC-298-06: 매핑에 없는 케이스(서울 "Gangnam-gu") → 기존 DEF-B-063 폴백 로직으로 회귀 없이 동작한다', async () => {
    // 서울은 구 단위가 최상위라 한글 매핑(일반시 12개)에 없음 → sigunguEnglish 최장 prefix 매칭 폴백 사용
    h.mockDaumData = {
      roadAddress: 'Gangnam-daero 1',
      zonecode: '06236',
      roadAddressEnglish: '1 Gangnam-daero, Gangnam-gu, Seoul',
      sido: '서울특별시',
      sidoEnglish: 'Seoul',
      sigungu: '강남구',
      sigunguEnglish: 'Gangnam-gu',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    await searchAndSelect(container);

    const citySelect = citySelectOf(container);
    expect(citySelect.value).toBe('Gangnam-gu');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Gangnam-gu');
    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '11');
  });
});
