import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const fallback: Record<string, string> = {
      form_name: 'Name',
      form_type: 'Type',
      form_discount_rate: 'Discount Rate',
      form_biz_no: 'Business No',
      form_rep_name: 'Representative',
      form_grade: 'Grade',
      grade_placeholder: 'Select grade',
      type_INDIVIDUAL: 'Individual',
      type_CORPORATE: 'Corporate',
    };
    return fallback[key] ?? key;
  },
}));

import { RequiredFields } from '@/app/[locale]/(dashboard)/agency/shippers/new/required-fields';

const mockT = (key: string) => {
  const fallback: Record<string, string> = {
    form_name: 'Name',
    form_type: 'Type',
    form_discount_rate: 'Discount Rate',
    form_biz_no: 'Business No',
    form_rep_name: 'Representative',
    form_grade: 'Grade',
    grade_placeholder: 'Select grade',
    type_INDIVIDUAL: 'Individual',
    type_CORPORATE: 'Corporate',
  };
  return fallback[key] ?? key;
};

describe('TC-P7-UI-REQ-01: INDIVIDUAL 할인율 미표시 + hidden value=0', () => {
  function renderIndividual() {
    const result = render(
      <RequiredFields t={mockT} defaultValues={{ shipper_type: 'INDIVIDUAL' }} fieldErrors={{}} />
    );
    const typeSelect = result.container.querySelector('select[name="shipper_type"]') as HTMLSelectElement;
    return { ...result, typeSelect };
  }

  it('should hide discount_rate input when shipper_type is INDIVIDUAL', () => {
    const { container } = renderIndividual();
    const discountRateInput = container.querySelector('input[name="discount_rate"]');
    expect(discountRateInput).not.toBeNull();
    expect(discountRateInput?.getAttribute('type')).toBe('hidden');
    expect(discountRateInput?.getAttribute('value')).toBe('0');
  });

  it('should not render discount_rate visible input for INDIVIDUAL', () => {
    const { container } = renderIndividual();
    const visibleInputs = container.querySelectorAll('input:not([type="hidden"])');
    const discountRateVisible = Array.from(visibleInputs).find(
      (el) => el.getAttribute('name') === 'discount_rate'
    );
    expect(discountRateVisible).toBeUndefined();
  });
});

describe('TC-P7-UI-REQ-02: CORPORATE 할인율 표시', () => {
  function renderCorporate() {
    const result = render(
      <RequiredFields t={mockT} defaultValues={{ shipper_type: 'CORPORATE', discount_rate: '5' }} fieldErrors={{}} />
    );
    const typeSelect = result.container.querySelector('select[name="shipper_type"]') as HTMLSelectElement;
    return { ...result, typeSelect };
  }

  it('should show discount_rate visible input when shipper_type is CORPORATE', () => {
    const { container } = renderCorporate();
    const discountRateInput = container.querySelector('input[name="discount_rate"]');
    expect(discountRateInput).not.toBeNull();
    expect(discountRateInput?.getAttribute('type')).not.toBe('hidden');
  });

  it('should display discount_rate with % suffix for CORPORATE', () => {
    renderCorporate();
    expect(screen.getByText('%')).toBeDefined();
  });
});

describe('TC-P7-UI-REQ-03: readOnly prop disabled 처리', () => {
  it('should disable name input when readOnly=true', () => {
    const { container } = render(
      <RequiredFields t={mockT} defaultValues={{ name: 'Test Shipper' }} fieldErrors={{}} readOnly={true} />
    );
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
  });

  it('should disable shipper_type select when readOnly=true', () => {
    const { container } = render(
      <RequiredFields t={mockT} defaultValues={{ shipper_type: 'INDIVIDUAL' }} fieldErrors={{}} readOnly={true} />
    );
    const typeSelect = container.querySelector('select[name="shipper_type"]') as HTMLSelectElement;
    expect(typeSelect.disabled).toBe(true);
  });

  it('should disable biz_no input when readOnly=true for CORPORATE', () => {
    const { container } = render(
      <RequiredFields t={mockT} defaultValues={{ shipper_type: 'CORPORATE', biz_no: '123-45-67890' }} fieldErrors={{}} readOnly={true} />
    );
    const bizNoInput = container.querySelector('input[name="biz_no"]') as HTMLInputElement;
    expect(bizNoInput.disabled).toBe(true);
  });
});
