// TASK-B-350 (Issue #1292, 부모 #1280): `Errors` 네임스페이스 4개 로케일 키 동기화 테스트.
//
// 목적: 신규 오류 키를 ko에만 추가하는 누락을 PR 단계에서 차단한다.
// 기준은 ko(messages/ko.json)이며, en/zh/ja가 **동일 키 세트**를 가져야 한다.
//
// ⚠️ 범위는 `Errors` 네임스페이스 한정이다 — 전역 키 감사(`npm run check:i18n`)는
//    DEF-B-156(ja 523키 누락)으로 상시 FAIL이므로 본 테스트에 섞지 않는다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
const BASELINE = 'ko';

type Messages = Record<string, unknown>;

function loadMessages(locale: string): Messages {
  return JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf-8'));
}

function errorsOf(messages: Messages): Record<string, string> {
  const errors = messages.Errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    throw new Error('messages.Errors 네임스페이스가 없습니다.');
  }
  return errors as Record<string, string>;
}

/** ICU 메시지에서 플레이스홀더 이름만 추출한다 (예: {code} → 'code'). */
function placeholdersOf(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe('Errors 네임스페이스 로케일 키 동기화 (TASK-B-350)', () => {
  const baseline = errorsOf(loadMessages(BASELINE));
  const baselineKeys = Object.keys(baseline).sort();

  it('ko 기준 키가 91개이고 모두 비어 있지 않은 문자열이다', () => {
    expect(baselineKeys).toEqual([
      'agency_org_missing',
      'already_delivered',
      'auth_account_exists',
      'auth_email_not_confirmed',
      'auth_invalid_credentials',
      'auth_password_invalid',
      'auth_rate_limited',
      'auth_signup_failed',
      'auth_signup_profile_failed',
      'auth_unexpected',
      'billing_finalize_status_invalid',
      'cannot_suspend_self',
      'cost_amount_invalid',
      'cost_currency_required',
      'cost_name_required',
      'current_password_incorrect',
      'destination_country_not_found',
      'document_fetch_failed',
      'document_save_failed',
      'document_save_failed_after_shipping',
      'email_not_available',
      'exchange_amount_date_required',
      'fetch_failed',
      'find_corp_admin_not_found',
      'find_corp_not_found',
      'find_member_not_found',
      'generic',
      'grade_fill_all_required',
      'grade_promotion_already_processed',
      'grade_promotion_individual_only',
      'grade_promotion_pending_exists',
      'inbound_no_measurement_changes',
      'insufficient_balance',
      'internal_error',
      'inventory_below_zero',
      'inventory_not_found',
      'invoice_already_canceled',
      'invoice_already_finalized',
      'invoice_create_failed',
      'invoice_finalize_reason_required',
      'invoice_not_found',
      'label_issue_failed',
      'label_not_found',
      'label_void_failed',
      'manual_reason_required',
      'master_order_bound',
      'measurements_stale',
      'network_error',
      'not_found',
      'not_ups_order',
      'order_edit_status_invalid',
      'order_has_no_packages',
      'order_not_found',
      'own_agency_only',
      'own_shipper_only',
      'own_shipper_outbound',
      'packages_not_found',
      'password_change_failed',
      'password_reset_failed',
      'permission_denied',
      'profile_not_found',
      'qty_reason_required',
      'qty_required',
      'rate_carrier_from_required',
      'rate_slabs_required',
      'route_required_for_scheduled',
      'settlement_items_locked',
      'settlement_order_already_finalized',
      'settlement_recalc_locked',
      'shipper_scope_denied',
      'shipping_method_not_found',
      'shxk_generic',
      'shxk_required_missing',
      'shxk_validation_failed',
      'status_cancel_inbound',
      'status_change_denied',
      'status_departure_cancel',
      'status_departure_confirm',
      'status_departure_undo',
      'status_outbound_confirm',
      'status_ups_register',
      'status_ups_undo',
      'surcharge_required',
      'unknown_action',
      'ups_actual_charge_status_invalid',
      'ups_actual_cost_status_invalid',
      'ups_edit_registered_locked',
      'ups_edit_status_locked',
      'voc_closed_not_revertable',
      'withdraw_confirm_input',
      'zone_date_required',
    ]);

    for (const key of baselineKeys) {
      expect(baseline[key], `ko.Errors.${key}`).toBeTruthy();
      expect(typeof baseline[key]).toBe('string');
    }
  });

  for (const locale of LOCALES.filter((value) => value !== BASELINE)) {
    it(`${locale} 키 집합이 ko와 완전히 일치한다 (누락·추가 모두 실패)`, () => {
      const messages = loadMessages(locale);
      const errors = errorsOf(messages);

      expect(Object.keys(errors).sort()).toEqual(baselineKeys);

      for (const key of baselineKeys) {
        expect(errors[key], `${locale}.Errors.${key}`).toBeTruthy();
        expect(typeof errors[key]).toBe('string');
      }
    });

    it(`${locale} ICU 플레이스홀더가 ko와 일치한다 (예: {code}, {fields})`, () => {
      const errors = errorsOf(loadMessages(locale));

      for (const key of baselineKeys) {
        expect(placeholdersOf(errors[key]), `${locale}.Errors.${key} placeholders`).toEqual(
          placeholdersOf(baseline[key]),
        );
      }
    });
  }
});
