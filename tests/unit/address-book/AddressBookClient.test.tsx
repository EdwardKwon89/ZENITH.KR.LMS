import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddressBookClient from '@/components/address-book/AddressBookClient';

vi.mock('@/app/actions/operations/address-book', () => ({
  createAddressBookEntry: vi.fn(),
  updateAddressBookEntry: vi.fn(),
  deleteAddressBookEntry: vi.fn(),
}));

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
    render(<AddressBookClient initialEntries={mockEntries} />);

    expect(screen.getByText('Test Entry')).toBeInTheDocument();
    expect(screen.getByText(/CA/)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
    expect(screen.getByText(/Bldg 5/)).toBeInTheDocument();
    expect(screen.getByText(/90001/)).toBeInTheDocument();
    expect(screen.getByText(/PCCC: P123456/)).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 handleEdit으로 5개 필드가 폼에 채워짐', () => {
    render(<AddressBookClient initialEntries={mockEntries} />);

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
