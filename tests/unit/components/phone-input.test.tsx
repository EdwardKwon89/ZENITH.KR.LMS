import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';

// TASK-B-347 (Issue #1279): 전화번호 입력 안내문구 + 숫자 외 입력 차단 회귀 테스트.
//
// 검증 대상:
// ① PhoneInput 공용 컴포넌트 정규화(붙여넣기·문자·특수기호) + maxLength + onChange 위임
// ② 안내문구 i18n 키가 4개 로케일(ko/en/zh/ja)에 실재 + ko 실제 messages로 보간 렌더
// ③ 서버 zod: pickup_contact_tel(하이픈 계약 보존 + 문자 차단), address-book 전화 정규화
// ④ normalizePhoneDigits(서버측 정규화 헬퍼)

import { PhoneInput } from '@/components/ui/PhoneInput';
import { normalizePhoneDigits, PHONE_MAX_DIGITS } from '@/lib/validation/shxk-limits';
import { orderRegistrationSchema } from '@/lib/validation/order';
import { addressBookEntrySchema } from '@/lib/validation/address-book';
import koMessages from '../../../messages/ko.json';
import enMessages from '../../../messages/en.json';
import zhMessages from '../../../messages/zh.json';
import jaMessages from '../../../messages/ja.json';

const KO_HELP = '숫자만 입력 (하이픈 제외, 최대 15자리)';
const KO_HELP_HYPHEN = '숫자와 하이픈만 입력 (예: 010-1234-5678, 최대 15자리)';

function renderPhone(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

function getInput(testId = 'phone'): HTMLInputElement {
  return screen.getByTestId(testId) as HTMLInputElement;
}

describe('TC-347-1: PhoneInput 정규화 (키보드·붙여넣기 공통 onChange 경로)', () => {
  it('하이픈·공백이 섞인 붙여넣기 "010-1234 5678" → "01012345678"', () => {
    renderPhone(<PhoneInput data-testid="phone" />);
    const input = getInput();
    fireEvent.change(input, { target: { value: '010-1234 5678' } });
    expect(input.value).toBe('01012345678');
  });

  it('문자·특수기호·한글 입력은 전부 제거된다', () => {
    renderPhone(<PhoneInput data-testid="phone" />);
    const input = getInput();
    fireEvent.change(input, { target: { value: 'abc!@#01가나' } });
    expect(input.value).toBe('01');
  });

  it('onChange 호출 시점의 target.value가 이미 정제돼 있다 (RHF register 위임 경로)', () => {
    const onChange = vi.fn();
    renderPhone(<PhoneInput data-testid="phone" onChange={onChange} />);
    fireEvent.change(getInput(), { target: { value: '010-1234-5678' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('01012345678');
  });

  it('maxLength=15 · inputMode=numeric 속성이 설정된다', () => {
    renderPhone(<PhoneInput data-testid="phone" />);
    const input = getInput();
    expect(input.maxLength).toBe(PHONE_MAX_DIGITS);
    expect(input.maxLength).toBe(15);
    expect(input.inputMode).toBe('numeric');
  });
});

describe('TC-347-2: PhoneInput 안내문구 (i18n)', () => {
  it('ko 실제 messages의 Common.phoneHelp가 {max}와 함께 보간 렌더된다', () => {
    renderPhone(<PhoneInput data-testid="phone" />);
    expect(screen.getByText(KO_HELP)).toBeInTheDocument();
  });

  it('allowHyphens 변형은 Common.phoneHelpHyphen 안내문구를 표시한다', () => {
    renderPhone(<PhoneInput data-testid="phone" allowHyphens />);
    expect(screen.getByText(KO_HELP_HYPHEN)).toBeInTheDocument();
  });

  it('showHelp=false면 안내문구가 표시되지 않는다', () => {
    renderPhone(<PhoneInput data-testid="phone" showHelp={false} />);
    expect(screen.queryByText(KO_HELP)).not.toBeInTheDocument();
  });
});

describe('TC-347-3: PhoneInput allowHyphens 변형 (픽업 연락처 계약)', () => {
  it('"032-111-2222"는 하이픈째 보존된다 (기존 E2E 저장 계약)', () => {
    renderPhone(<PhoneInput data-testid="phone" allowHyphens />);
    const input = getInput();
    fireEvent.change(input, { target: { value: '032-111-2222' } });
    expect(input.value).toBe('032-111-2222');
  });

  it('하이픈 아닌 특수문자·문자는 제거된다', () => {
    renderPhone(<PhoneInput data-testid="phone" allowHyphens />);
    const input = getInput();
    fireEvent.change(input, { target: { value: '032-111-222x!' } });
    expect(input.value).toBe('032-111-222');
  });

  it('allowHyphens에서는 inputMode=numeric가 설정되지 않는다(하이픈 입력 가능)', () => {
    renderPhone(<PhoneInput data-testid="phone" allowHyphens />);
    expect(getInput().inputMode).not.toBe('numeric');
  });
});

describe('TC-347-4: i18n 키 4개 로케일 실재 (ko/en/zh/ja)', () => {
  it.each([
    ['ko', koMessages],
    ['en', enMessages],
    ['zh', zhMessages],
    ['ja', jaMessages],
  ] as const)('%s: Common.phoneHelp·phoneHelpHyphen·AgencyShippers.form_contact_phone_help', (_loc, messages) => {
    expect(messages.Common.phoneHelp).toEqual(expect.any(String));
    expect(messages.Common.phoneHelp).toMatch(/{max}/);
    expect(messages.Common.phoneHelpHyphen).toEqual(expect.any(String));
    expect(messages.Common.phoneHelpHyphen).toMatch(/{max}/);
    expect(messages.AgencyShippers.form_contact_phone_help).toEqual(expect.any(String));
    expect(messages.AgencyShippers.form_contact_phone_help.length).toBeGreaterThan(0);
  });
});

// --- 서버 zod 검증 -------------------------------------------------------

const VALID_ORDER = {
  order_type: 'B2B' as const,
  shipper_id: '550e8400-e29b-41d4-a716-446655440001',
  origin_port_id: '550e8400-e29b-41d4-a716-446655440002',
  dest_port_id: '550e8400-e29b-41d4-a716-446655440003',
  recipient_name: 'John',
  recipient_address: '123 St',
  recipient_phone: '01012345678',
  transport_mode: 'AIR' as const,
  delivery_method: 'PICKUP' as const,
  pickup_contact_name: 'Kim',
  pickup_contact_tel: '010-1234-5678',
  pickup_address: '123 St',
  packages: [
    {
      packing_unit: 'BOX',
      gross_weight: 1,
      items: [{ item_name: 'Item', quantity: 1 }],
    },
  ],
};

describe('TC-347-5: 서버 zod — pickup_contact_tel (orderRegistrationSchema)', () => {
  it('하이픈 표기 "032-111-2222" 통과 + 값 불변 (기존 E2E 계약 보존)', () => {
    const r = orderRegistrationSchema.safeParse({ ...VALID_ORDER, pickup_contact_tel: '032-111-2222' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pickup_contact_tel).toBe('032-111-2222');
  });

  it(`문자 포함 "032-abc-2222"는 path ['pickup_contact_tel']로 실패`, () => {
    const r = orderRegistrationSchema.safeParse({ ...VALID_ORDER, pickup_contact_tel: '032-abc-2222' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['pickup_contact_tel']);
  });

  it('숫자 16자리(하이픈 없음)는 상한 위반으로 실패', () => {
    const r = orderRegistrationSchema.safeParse({ ...VALID_ORDER, pickup_contact_tel: '1234567890123456' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['pickup_contact_tel']);
  });
});

describe('TC-347-6: 서버 zod — 주소록 전화 정규화 (addressBookEntrySchema)', () => {
  const base = {
    display_name: 'Home',
    recipient_name: 'John',
    recipient_address: '123 St',
    display_mode: 'EN' as const,
    is_default: false,
  };

  it('레거시 하이픈 포함 "010-1111-2222" → "01011112222" 정규화 (재저장 차단 없음)', () => {
    const r = addressBookEntrySchema.safeParse({ ...base, recipient_phone: '010-1111-2222' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.recipient_phone).toBe('01011112222');
  });

  it('문자·특수기호가 섞여도 서버에서숫자만 남는다', () => {
    const r = addressBookEntrySchema.safeParse({ ...base, recipient_phone: '010abc)1111-2222' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.recipient_phone).toBe('01011112222');
  });
});

describe('TC-347-7: normalizePhoneDigits (서버측 정규화 헬퍼)', () => {
  it('"010-1234 5678" → "01012345678"', () => {
    expect(normalizePhoneDigits('010-1234 5678')).toBe('01012345678');
  });

  it('16자리 입력은 15자리로절단된다', () => {
    expect(normalizePhoneDigits('1234567890123456')).toBe('123456789012345');
  });

  it('하이픈·괄호 포함 레거시 값 정규화', () => {
    expect(normalizePhoneDigits('(02)1234-5678')).toBe('0212345678');
  });
});
