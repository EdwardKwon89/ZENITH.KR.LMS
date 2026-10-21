// TASK-B-337 (Issue #1251): SHXK 신고단위 7종 정본 목록·YDS/KG 지원·정합 테스트
//
// 원칙: 실제 모듈에서 import한 상수·함수를 호출한다(옵션 배열을 테스트에 복사 금지 — shadow test 방지).
import { describe, it, expect } from 'vitest';
import { SHXK_DECLARE_UNITS, isShxkDeclareUnit } from '@/lib/shxk/declare-units';
import { PACKING_UNIT_OPTIONS, DEFAULT_PACKING_UNIT } from '@/lib/orders/packing-units';
import { resolveShxkUnitCode, buildInvoiceFromItems } from '@/lib/ups/label-mapping';
import { validateShxkPayload } from '@/lib/shxk/validate-payload';
import { orderItemSchema } from '@/lib/validation/order';

// 1. resolveShxkUnitCode — 7개 코드 각각 자기 자신 반환
describe('TC-337-1: resolveShxkUnitCode — 7개 코드 그대로 반환', () => {
  const codes = SHXK_DECLARE_UNITS.map((u) => u.code);

  it.each(codes)('%s → %s (변환 없음)', (code) => {
    expect(resolveShxkUnitCode(code)).toBe(code);
  });

  it('소문자 입력은 대문자화되어 그대로 반환', () => {
    expect(resolveShxkUnitCode('pce')).toBe('PCE');
    expect(resolveShxkUnitCode('yds')).toBe('YDS');
    expect(resolveShxkUnitCode('kg')).toBe('KG');
    expect(resolveShxkUnitCode('ea')).toBe('EA');
  });

  it('빈 값·미지값 XYZ → PCE 폴백', () => {
    expect(resolveShxkUnitCode('')).toBe('PCE');
    expect(resolveShxkUnitCode('XYZ')).toBe('PCE');
  });
});

// 2. 정합 불변식(핵심): 옵션 전부가 자기 자신으로 전송되고 정본 목록에 포함
describe('TC-337-2: PACKING_UNIT_OPTIONS ↔ resolveShxkUnitCode ↔ isShxkDeclareUnit 정합', () => {
  it('모든 옵션 v에 대해 resolveShxkUnitCode(v) === v && isShxkDeclareUnit(v)', () => {
    for (const opt of PACKING_UNIT_OPTIONS) {
      expect(resolveShxkUnitCode(opt.value)).toBe(opt.value);
      expect(isShxkDeclareUnit(opt.value)).toBe(true);
    }
  });
});

// 3. 옵션 집합 == 정본 목록 code 집합 (순서 무관)
describe('TC-337-3: PACKING_UNIT_OPTIONS가 SHXK_DECLARE_UNITS code 집합과 정확히 일치', () => {
  it('집합 비교', () => {
    const optionSet = new Set(PACKING_UNIT_OPTIONS.map((o) => o.value));
    const canonSet = new Set(SHXK_DECLARE_UNITS.map((u) => u.code));
    expect(optionSet).toEqual(canonSet);
    expect(optionSet.size).toBe(7);
  });
});

// 4. buildInvoiceFromItems — EA/PCS/YDS/KG가 같은 값으로 나감
describe('TC-337-4: buildInvoiceFromItems — unit_code가 변환 없이 그대로', () => {
  it.each(['EA', 'PCS', 'YDS', 'KG'])('%s → unit_code %s', (unit) => {
    const packages = [{ items: [{ item_name: 'Item', quantity: 1, unit_price: 10, item_packing_unit: unit }] }];
    const result = buildInvoiceFromItems(packages as any);
    expect(result[0].unit_code).toBe(unit);
  });
});

// 5. validateShxkPayload — 허용 단위 통과 / XYZ는 한글 에러
describe('TC-337-5: validateShxkPayload 단위 검사', () => {
  function basePayload(unitCode: string) {
    return {
      shipper: { shipper_name: 'SNTL', shipper_countrycode: 'KR', shipper_street: '123 St', shipper_telephone: '01011112222' },
      consignee: {
        consignee_name: 'John', consignee_countrycode: 'US', consignee_street: '456 Oak St',
        consignee_city: 'LA', consignee_postcode: '90001', consignee_telephone: '01033334444',
      },
      invoice: [{ invoice_enname: 'Widget', invoice_quantity: '1', invoice_unitcharge: '10.00', hs_code: '8471300000', unit_code: unitCode }],
    };
  }

  it('허용 단위(PCE)는 에러 없음', () => {
    expect(validateShxkPayload(basePayload('PCE'))).toEqual([]);
  });

  it('미지 단위 XYZ → 반환 배열에 한글 에러 포함', () => {
    expect(validateShxkPayload(basePayload('XYZ'))).toContain('품목 1: 단위 코드 XYZ은(는) SHXK 허용 단위가 아닙니다');
  });
});

// 6. 기본값 PCE — 상수 + 스키마 실제 safeParse
describe('TC-337-6: 기본값 PCE', () => {
  it('DEFAULT_PACKING_UNIT === "PCE"', () => {
    expect(DEFAULT_PACKING_UNIT).toBe('PCE');
  });

  it('orderItemSchema.parse — item_packing_unit 미지정 시 PCE', () => {
    const parsed = orderItemSchema.parse({ item_name: 'Item', quantity: 1, unit_price: 10 });
    expect(parsed.item_packing_unit).toBe('PCE');
  });
});
