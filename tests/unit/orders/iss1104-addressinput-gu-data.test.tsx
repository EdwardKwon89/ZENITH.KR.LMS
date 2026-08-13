// TASK-B-297 (Issue #1104): DEF-B-063 — country-state-city 구(區) 단위 데이터 누락 회귀 테스트.
//
// Daum 주소검색 onComplete 응답의 sigunguEnglish가 country-state-city 라이브러리에 없는 값
// (예: "Seongnam-si Bundang-gu")이어도 실제 AddressInput에 해당 값이 드롭다운 옵션으로 존재하고
// 선택된 상태가 되어야 한다. (AddressInput mock 금지 — 실제 컴포넌트 렌더링)
//
// 검증 시나리오:
//  TC-297-063-01: 라이브러리에 없는 구 단위 시/군/구 ("Seongnam-si Bundang-gu") → 옵션 존재 + 선택됨
//  TC-297-063-02: 정상 매칭 값 (서울 "Gangnam-gu") → 회귀 없이 기존 동작 유지
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
  return Array.from(container.querySelectorAll('select'))[2] as HTMLSelectElement;
}

function optionValues(select: HTMLSelectElement): string[] {
  return Array.from(select.querySelectorAll('option')).map((o) => o.value);
}

describe('TASK-B-297 (Issue #1104) DEF-B-063: 구(區) 단위 시/군/구 데이터 누락', () => {
  beforeEach(() => {
    // 기본 Daum 응답: 경기도 성남시 분당구 (라이브러리에 "Seongnam-si Bundang-gu" 없음)
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

  it('TC-297-063-01: 라이브러리에 없는 구 단위 값("Seongnam-si Bundang-gu")이 옵션으로 존재하고 선택된다', async () => {
    const setValue = vi.fn();
    const { container } = render(<AddressInput t={mockT} prefix="shipper" setValue={setValue} mode="rhf" />);

    // 주소 검색 버튼 → Daum 모달 → 분당구 주소 선택 (시/도 사전 선택 없이 검색만 수행)
    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);
    fireEvent.click(screen.getByRole('button', { name: 'select-address' }));

    await waitFor(() => {
      const citySelect = citySelectOf(container);
      expect(citySelect.value).toBe('Seongnam-si Bundang-gu');
    });

    const citySelect = citySelectOf(container);
    expect(optionValues(citySelect)).toContain('Seongnam-si Bundang-gu');

    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '41');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Seongnam-si Bundang-gu');
    expect(setValue).toHaveBeenCalledWith('shipper_zipcode', '13487');
    expect(setValue).toHaveBeenCalledWith('shipper_address', 'Daewangpangyo-ro 123');
  });

  it('TC-297-063-02: 정상 매칭 값(서울 "Gangnam-gu")은 회귀 없이 그대로 동작한다', async () => {
    // 서울 강남구는 라이브러리에 정상 존재 → 기존 매칭 경로 그대로
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
    expect(optionValues(citySelect)).toContain('Gangnam-gu');
    // 정상 매칭이므로 동적 옵션 중복이 없어야 함 (라이브러리 값 그대로 1회)
    expect(optionValues(citySelect).filter((v) => v === 'Gangnam-gu')).toHaveLength(1);
    expect(setValue).toHaveBeenCalledWith('shipper_state_province', '11');
    expect(setValue).toHaveBeenCalledWith('shipper_city', 'Gangnam-gu');
  });
});
