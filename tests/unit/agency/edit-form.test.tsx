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
      form_state_province: 'State/Province',
      form_city: 'City',
      form_status: 'Status',
      status_active: 'Active',
      status_inactive: 'Inactive',
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

vi.mock('@/app/[locale]/(dashboard)/agency/shippers/new/address-input', () => ({
  AddressInput: ({ defaultValues }: any) => (
    <div data-testid="address-input">
      <input name="country_code" defaultValue={defaultValues?.country_code || ''} />
      <input name="state_province" defaultValue={defaultValues?.state_province || ''} />
      <input name="city" defaultValue={defaultValues?.city || ''} />
      <input name="address" defaultValue={defaultValues?.address || ''} />
      <input name="address_detail" defaultValue={defaultValues?.address_detail || ''} />
      <input name="zipcode" defaultValue={defaultValues?.zipcode || ''} />
    </div>
  ),
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

describe('TC-P7-UI-EDIT-03: address section rendered via AddressInput', () => {
  it('should render AddressInput with default address values', () => {
    const { container } = render(<EditShipperForm shipper={baseShipper} />);

    expect(container.querySelector('[data-testid="address-input"]')).not.toBeNull();
    expect(container.querySelector('input[name="address"]')).not.toBeNull();
    expect(container.querySelector('input[name="zipcode"]')).not.toBeNull();
    expect(container.querySelector('input[name="address_detail"]')).not.toBeNull();
  });

  it('should pass state_province and city defaults to AddressInput for non-KR shipper', () => {
    const nonKrShipper = {
      ...baseShipper,
      org: {
        ...baseShipper.org,
        country_code: 'US',
        state_province: 'CA',
        city: 'Los Angeles',
      },
    };
    const { container } = render(<EditShipperForm shipper={nonKrShipper} />);
    const stateInput = container.querySelector('input[name="state_province"]') as HTMLInputElement;
    const cityInput = container.querySelector('input[name="city"]') as HTMLInputElement;
    expect(stateInput).not.toBeNull();
    expect(stateInput.defaultValue).toBe('CA');
    expect(cityInput).not.toBeNull();
    expect(cityInput.defaultValue).toBe('Los Angeles');
  });
});
