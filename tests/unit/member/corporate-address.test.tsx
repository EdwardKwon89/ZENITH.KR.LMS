// Issue #1041: 법인정보 주소 입력 AddressInput 컴포넌트 통일 회귀 테스트
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AddressInput } from '@/components/common/AddressInput';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    form_address: '주소',
    form_address_detail: '상세주소',
    form_address_english: '영문 주소',
    form_address_detail_english: '영문 상세주소',
    form_address_search: '주소 검색',
    form_country: '국가',
    form_state_province: '시/도',
    form_city: '시/군/구',
    form_zipcode: '우편번호',
  };
  return translations[key] || key;
};

describe('TC-ISSUE-1041-01: AddressInput hidden input 검증', () => {
  it('KR 모드에서 address_detail_english hidden input이 렌더링된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{ country_code: 'KR' }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_detail_english"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('type')).toBe('hidden');
  });

  it('KR 모드에서 address_english hidden input이 렌더링된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{ country_code: 'KR' }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_english"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('type')).toBe('hidden');
  });

  it('해외 모드에서 address_detail_english hidden input이 렌더링된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{ country_code: 'US' }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_detail_english"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('type')).toBe('hidden');
  });

  it('해외 모드에서 address_english hidden input이 렌더링된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{ country_code: 'US' }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_english"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('type')).toBe('hidden');
  });
});

describe('TC-ISSUE-1041-02: defaultValues 적용 검증', () => {
  it('기본값이 address_detail_english hidden input에 반영된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{
          country_code: 'KR',
          address_detail_english: 'Test Detail English',
        }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_detail_english"]') as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.value).toBe('Test Detail English');
  });

  it('기본값이 address_english hidden input에 반영된다', () => {
    render(
      <AddressInput
        t={mockT}
        defaultValues={{
          country_code: 'KR',
          address_english: 'Test Address English',
        }}
        mode="form-action"
      />
    );
    
    const hiddenInput = document.querySelector('input[name="address_english"]') as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.value).toBe('Test Address English');
  });
});
