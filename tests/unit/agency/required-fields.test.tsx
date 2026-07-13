import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const fallback: Record<string, string> = {
      form_name: 'Name',
      form_type: 'Type',
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
    form_biz_no: 'Business No',
    form_rep_name: 'Representative',
    form_grade: 'Grade',
    grade_placeholder: 'Select grade',
    type_INDIVIDUAL: 'Individual',
    type_CORPORATE: 'Corporate',
  };
  return fallback[key] ?? key;
};

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
