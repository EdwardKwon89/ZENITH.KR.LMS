import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import AddressBookClient from '@/components/address-book/AddressBookClient';
import koMessages from '../../../messages/ko.json';

vi.mock('@/app/actions/operations/address-book', () => ({
  createAddressBookEntry: vi.fn(),
  updateAddressBookEntry: vi.fn(),
  deleteAddressBookEntry: vi.fn(),
}));

// TASK-B-347 (Issue #1279): 연락처 필드가 PhoneInput(next-intl useTranslations)으로 교체되어
// 실제 NextIntlClientProvider로 감싸 렌더한다.
function renderClient(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

const mockEntries = [
  {
    id: '1',
    display_name: 'Test Entry',
    recipient_name: 'John',
    recipient_address: '123 St',
    recipient_address_local: '로컬주소',
    recipient_phone: '010-1111',
    recipient_email: 'a@b.com',
    recipient_address_detail: 'Bldg 5',
    state_province: 'CA',
    city: 'Los Angeles',
    zipcode: '90001',
    recipient_pccc: 'P123456',
    country_code: 'US',
    display_mode: 'BILINGUAL' as const,
    is_default: false,
  },
];

describe('TC-ADDR-01: AddressBookClient 5개 필드 표시', () => {
  it('카드에 state_province/city/zipcode/address_detail/pccc가 표시됨', () => {
    renderClient(<AddressBookClient initialEntries={mockEntries} />);

    expect(screen.getByText('Test Entry')).toBeInTheDocument();
    expect(screen.getByText(/CA/)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
    expect(screen.getByText(/Bldg 5/)).toBeInTheDocument();
    expect(screen.getByText(/90001/)).toBeInTheDocument();
    expect(screen.getByText(/PCCC: P123456/)).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 handleEdit으로 5개 필드가 폼에 채워짐', () => {
    renderClient(<AddressBookClient initialEntries={mockEntries} />);

    // 수정 버튼(Edit2 아이콘) 클릭
    const editButtons = screen.getAllByRole('button');
    const editBtn = editButtons.find(b => b.innerHTML.includes('edit')) || editButtons[1];
    fireEvent.click(editBtn);

    // 폼 제목이 "주소 수정"으로 변경됨
    expect(screen.getByText('주소 수정')).toBeInTheDocument();

    // 5개 필드 값 확인
    const stateInput = screen.getByPlaceholderText('시/도') as HTMLInputElement;
    expect(stateInput.value).toBe('CA');

    const cityInput = screen.getByPlaceholderText('시/군/구') as HTMLInputElement;
    expect(cityInput.value).toBe('Los Angeles');

    const detailInput = screen.getByPlaceholderText('상세주소') as HTMLInputElement;
    expect(detailInput.value).toBe('Bldg 5');

    const zipInput = screen.getByPlaceholderText('우편번호') as HTMLInputElement;
    expect(zipInput.value).toBe('90001');

    const pcccInput = screen.getByPlaceholderText('개인통관고유부호') as HTMLInputElement;
    expect(pcccInput.value).toBe('P123456');
  });
});

describe('TC-347-8: 주소록 연락처 PhoneInput 적용 (Issue #1279)', () => {
  it('연락처 입력란에 maxLength=15 · inputMode=numeric · 안내문구가 적용된다', () => {
    renderClient(<AddressBookClient initialEntries={mockEntries} />);

    const phoneInput = screen.getByPlaceholderText('연락처') as HTMLInputElement;
    expect(phoneInput.maxLength).toBe(15);
    expect(phoneInput.inputMode).toBe('numeric');
    expect(screen.getByText('숫자만 입력 (하이픈 제외, 최대 15자리)')).toBeInTheDocument();
  });

  it('입력값 "010-1111-2222" → "01011112222" 정규화', () => {
    renderClient(<AddressBookClient initialEntries={mockEntries} />);

    const phoneInput = screen.getByPlaceholderText('연락처') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '010-1111-2222' } });
    expect(phoneInput.value).toBe('01011112222');
  });

  it('수정 진입 시 레거시 하이픈 저장분("010-1111")도 숫자만으로 채워진다', () => {
    renderClient(<AddressBookClient initialEntries={mockEntries} />);

    const editButtons = screen.getAllByRole('button');
    const editBtn = editButtons.find(b => b.innerHTML.includes('edit')) || editButtons[1];
    fireEvent.click(editBtn);

    const phoneInput = screen.getByPlaceholderText('연락처') as HTMLInputElement;
    expect(phoneInput.value).toBe('0101111');
  });
});
