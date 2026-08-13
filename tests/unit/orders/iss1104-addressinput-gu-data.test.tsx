// TASK-B-297 (Issue #1104): DEF-B-063 — country-state-city 구(區) 단위 데이터 누락 회귀 테스트.
//
// 2026-08-13 설계 수정(JSJung 제안): 라이브러리에 없는 값을 동적으로 옵션 추가하는 최초안은 폐기.
// City.getCitiesOfState의 실제 라이브러리 옵션 중 Daum 응답값과 **가장 길게 prefix 일치**하는 항목을 선택한다.
// (AddressInput mock 금지 — 실제 컴포넌트 렌더링)
//
// 검증 시나리오:
//  TC-297-063-01: "Seongnam-si Bundang-gu"(라이브러리 미존재) → 실제 라이브러리 옵션 "Seongnam-si"로 매칭·선택
//  TC-297-063-02: "Gwangju-si OO-gu" → "Gwangju"가 아니라 "Gwangju-si"로 선택 (짧은 접두 오매칭 회귀 방지 — 핵심)
//  TC-297-063-03: 정상 매칭 값 (서울 "Gangnam-gu") → 회귀 없이 기존 동작 유지
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AddressInput } from '@/components/common/AddressInput';

const h = vi.hoisted(() => ({
  mockDaumData: {
    roadAddress: 'Daewangpangyo-ro 123',
    zonecode: '13487',
    roadAddressEnglish: '123 Daewangpangyo-ro, Bundang-gu, Seongnam-si',
    sido: '경기도',
    sidoEnglish: 'Gyeonggi-do',
    sigungu: '성남시 분당구',
    sigunguEnglish: 'Seongnam-si Bundang-gu',
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

describe('TASK-B-297 (Issue #1104) DEF-B-063: 구(區) 단위 시/군/구 데이터 누락 (최장 prefix 매칭)', () => {
  beforeEach(() => {
    h.mockDaumData = {
      roadAddress: 'Daewangpangyo-ro 123',
      zonecode: '13487',
      roadAddressEnglish: '123 Daewangpangyo-ro, Bundang-gu, Seongnam-si',
      sido: '경기도',
      sidoEnglish: 'Gyeonggi-do',
      sigungu: '성남시 분당구',
      sigunguEnglish: 'Seongnam-si Bundang-gu',
    };
  });

  it('TC-297-063-01: "Seongnam-si Bundang-gu" → 실제 라이브러리 옵션 "Seongnam-si"로 선택된다', async () => {
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);
    fireEvent.click(screen.getByRole('button', { name: 'select-address' }));

    await waitFor(() => {
      const citySelect = citySelectOf(container);
      // 라이브러리 원본 옵션(Seongnam-si)으로 매칭 — 합성 옵션 아님
      expect(citySelect.value).toBe('Seongnam-si');
    });

    // 선택된 값이 드롭다운에 실제 옵션으로 존재해야 함
    const citySelect = citySelectOf(container);
    const optionValues = Array.from(citySelect.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toContain('Seongnam-si');
    expect(optionValues).not.toContain('Seongnam-si Bundang-gu');

    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '41');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Seongnam-si');
    expect(setValue).toHaveBeenCalledWith('shipper_zipcode', '13487');
    expect(setValue).toHaveBeenCalledWith('shipper_address', 'Daewangpangyo-ro 123');
  });

  it('TC-297-063-02: "Gwangju-si OO-gu" → "Gwangju"가 아니라 "Gwangju-si"로 선택된다 (짧은 접두 오매칭 방지)', async () => {
    h.mockDaumData = {
      roadAddress: 'Gwangju-ro 1',
      zonecode: '12760',
      roadAddressEnglish: '1 Gwangju-ro, OO-gu, Gwangju-si',
      sido: '경기도',
      sidoEnglish: 'Gyeonggi-do',
      sigungu: '광주시 OO구',
      sigunguEnglish: 'Gwangju-si OO-gu',
    };
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);
    fireEvent.click(screen.getByRole('button', { name: 'select-address' }));

    await waitFor(() => {
      const citySelect = citySelectOf(container);
      // 가장 긴 일치("Gwangju-si")가 선택되어야 함 — "Gwangju"(짧은 접두) 오매칭 금지
      expect(citySelect.value).toBe('Gwangju-si');
    });

    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Gwangju-si');
    expect(setValue).not.toHaveBeenCalledWith('shipper_city', 'Gwangju');
  });

  it('TC-297-063-03: 정상 매칭 값(서울 "Gangnam-gu")은 회귀 없이 그대로 동작한다', async () => {
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

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);
    fireEvent.click(screen.getByRole('button', { name: 'select-address' }));

    await waitFor(() => {
      const citySelect = citySelectOf(container);
      expect(citySelect.value).toBe('Gangnam-gu');
    });

    const citySelect = citySelectOf(container);
    const optionValues = Array.from(citySelect.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toContain('Gangnam-gu');
    expect(optionValues.filter((v) => v === 'Gangnam-gu')).toHaveLength(1);
    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '11');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Gangnam-gu');
  });
});
