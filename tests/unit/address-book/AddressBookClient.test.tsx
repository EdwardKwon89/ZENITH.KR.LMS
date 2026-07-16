import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
