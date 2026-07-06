import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const fallback: Record<string, string> = {
      edit_title: 'Edit Shipper',
      edit_submit: 'Save',
      loading: 'Loading...',
      submit_error: 'Error occurred',
      form_name: 'Name',
      form_type: 'Type',
      form_discount_rate: 'Discount Rate',
      form_biz_no: 'Business No',
      form_rep_name: 'Representative',
      form_grade: 'Grade',
      grade_placeholder: 'Select grade',
      type_INDIVIDUAL: 'Individual',
      type_CORPORATE: 'Corporate',
      form_contact_name: 'Contact',
      form_contact_email: 'Email',
      form_contact_phone: 'Phone',
      form_address: 'Address',
      form_country: 'Country',
      form_zipcode: 'Zip Code',
      form_address_detail: 'Address Detail',
    };
    return fallback[key] ?? key;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ locale: 'ko' }),
}));

vi.mock('@/app/actions/agency/shippers', () => ({
  updateAgencyShipper: vi.fn(),
}));

import { EditShipperForm } from '@/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form';

const baseShipper = {
  id: 'shipper-1',
  shipper_type: 'INDIVIDUAL',
  discount_rate: 0,
  grade: 'BRONZE',
  is_active: true,
  org: {
    id: 'org-1',
    name: 'Test Shipper',
    biz_no: null,
    rep_name: null,
    contact_name: 'Contact',
    contact_email: 'contact@example.com',
    contact_phone: '010-1234-5678',
    country_code: 'KR',
    state_province: null,
    city: null,
    address: 'Seoul Gangnam',
    address_detail: '101 Unit',
    zipcode: '06234',
  },
};

describe('TC-P7-UI-EDIT-01: edit-form name and shipper_type disabled', () => {
  it('should disable name input', () => {
    const { container } = render(<EditShipperForm shipper={baseShipper} />);
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.disabled).toBe(true);
  });

  it('should disable shipper_type select', () => {
    const { container } = render(<EditShipperForm shipper={baseShipper} />);
    const typeSelect = container.querySelector('select[name="shipper_type"]') as HTMLSelectElement;
    expect(typeSelect).not.toBeNull();
    expect(typeSelect.disabled).toBe(true);
  });
});

describe('TC-P7-UI-EDIT-02: CORPORATE biz_no disabled', () => {
  it('should disable biz_no input when shipper_type is CORPORATE', () => {
    const corporateShipper = {
      ...baseShipper,
      shipper_type: 'CORPORATE',
      discount_rate: 0.05,
      org: { ...baseShipper.org, biz_no: '123-45-67890' },
    };
    const { container } = render(<EditShipperForm shipper={corporateShipper} />);
    const bizNoInput = container.querySelector('input[name="biz_no"]') as HTMLInputElement;
    expect(bizNoInput).not.toBeNull();
    expect(bizNoInput.disabled).toBe(true);
  });
});

describe('TC-P7-UI-EDIT-03: address section readOnly', () => {
  it('should render address section with readOnly address and zipcode inputs', () => {
    const { container } = render(<EditShipperForm shipper={baseShipper} />);

    const addressInput = container.querySelector('input[value="Seoul Gangnam"]') as HTMLInputElement;
    const zipcodeInput = container.querySelector('input[value="06234"]') as HTMLInputElement;
    const addressDetailInput = container.querySelector('input[value="101 Unit"]') as HTMLInputElement;

    expect(addressInput).not.toBeNull();
    expect(addressInput.readOnly).toBe(true);

    expect(zipcodeInput).not.toBeNull();
    expect(zipcodeInput.readOnly).toBe(true);

    expect(addressDetailInput).not.toBeNull();
    expect(addressDetailInput.readOnly).toBe(true);

    expect(screen.getByText('Address', { selector: 'p' })).toBeDefined();
  });
});
