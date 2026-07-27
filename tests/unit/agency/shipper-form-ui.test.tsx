import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const fallback: Record<string, string> = {
      new_title: 'Shipper Registration',
      form_login_email: 'Login ID',
      form_login_email_hint: 'Enter the login email',
      form_login_email_invalid: 'Invalid email format',
      form_grade: 'Grade',
      grade_placeholder: 'Select grade',
      form_name: 'Name',
      form_type: 'Type',
      form_discount_rate: 'Discount Rate',
      form_contact_name: 'Contact',
      form_contact_email: 'Email',
      form_contact_phone: 'Phone',
      form_address: 'Address',
      loading: 'Loading...',
      new_shipper: 'Register',
      submit_invite_sent: 'Invitation sent to {email}',
      submit_error: 'Error occurred',
    };
    return fallback[key] ?? key;
  },
}));

vi.mock('@/app/actions/agency/shippers', () => ({
  createAgencyShipper: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ locale: 'ko' }),
}));

import { LoginAccountFields } from '@/app/[locale]/(dashboard)/agency/shippers/new/login-account-fields';
import { RequiredFields } from '@/app/[locale]/(dashboard)/agency/shippers/new/required-fields';

const mockT = (key: string) => {
  const fallback: Record<string, string> = {
    new_title: 'Shipper Registration',
    form_login_email: 'Login ID',
    form_login_email_hint: 'Enter the login email',
    form_login_email_invalid: 'Invalid email format',
    form_grade: 'Grade',
    grade_placeholder: 'Select grade',
    form_name: 'Name',
    form_type: 'Type',
    form_discount_rate: 'Discount Rate',
    form_contact_name: 'Contact',
    form_contact_email: 'Email',
    form_contact_phone: 'Phone',
    no_grade_text: 'No Grade',
  };
  return fallback[key] ?? key;
};

describe('TC-P7-UI-SHIPPER-01: Component rendering order — LoginAccountFields before RequiredFields', () => {
  it('should render LoginAccountFields and RequiredFields in the correct order', () => {
    const { container } = render(
      <div>
        <LoginAccountFields t={mockT} onLoginEmailChange={vi.fn()} fieldErrors={{}} />
        <RequiredFields t={mockT} defaultValues={{}} fieldErrors={{}} />
      </div>
    );

    const allLabels = Array.from(container.querySelectorAll('label'));
    const loginLabelIdx = allLabels.findIndex(l => l.textContent?.includes('Login ID'));
    const gradeLabelIdx = allLabels.findIndex(l => l.textContent?.includes('Grade'));

    expect(loginLabelIdx).toBeGreaterThanOrEqual(0);
    expect(gradeLabelIdx).toBeGreaterThanOrEqual(0);
    expect(loginLabelIdx).toBeLessThan(gradeLabelIdx);
  });
});

describe('TC-P7-UI-SHIPPER-02: LoginAccountFields email validation on blur', () => {
  function renderLoginFields() {
    const result = render(
      <LoginAccountFields t={mockT} onLoginEmailChange={vi.fn()} fieldErrors={{}} />
    );
    const input = result.container.querySelector('input[name="login_email"]') as HTMLInputElement;
    return { ...result, input };
  }

  it('should show error for invalid email on blur', () => {
    const { input } = renderLoginFields();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.blur(input);

    expect(screen.getByText('Invalid email format')).toBeDefined();
  });

  it('should clear error for valid email on blur', () => {
    const { input } = renderLoginFields();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'valid@example.com' } });
    fireEvent.blur(input);

    expect(screen.queryByText('Invalid email format')).toBeNull();
  });

  it('should not show error when email is empty on blur', () => {
    const { input } = renderLoginFields();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(screen.queryByText('Invalid email format')).toBeNull();
  });
});

describe('TC-P7-UI-SHIPPER-03: Grade default value = BRONZE', () => {
  it('should set default grade to BRONZE when defaultValues.grade is empty', () => {
    render(
      <RequiredFields t={mockT} defaultValues={{}} fieldErrors={{}} />
    );

    const select = screen.getByDisplayValue('BRONZE');
    expect(select).toBeDefined();
  });

  it('should preserve existing grade value when provided', () => {
    render(
      <RequiredFields t={mockT} defaultValues={{ grade: 'GOLD' }} fieldErrors={{}} />
    );

    const select = screen.getByDisplayValue('GOLD');
    expect(select).toBeDefined();
  });
});
