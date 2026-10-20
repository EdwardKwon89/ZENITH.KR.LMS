import { describe, it, expect } from 'vitest';
import {
  buildOrderEditDefaults,
  normalizeUpsContentType,
  resolveShipperAddressDefaults,
} from '@/lib/orders/edit-defaults';

// TASK-B-333 (Issue #1240 / #1238 항목 4·5): 수정 화면 저장값 복원 + UPS CONTENT 정규화 +
// TASK-B-332 후속 레거시 하이픈 전화번호 정제 — 실제 순수 함수를 import·호출한다.

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B',
    shipper_id: 'shipper-1',
    transport_mode: 'UPS',
    shipper_name: 'Saved Custom Shipper',
    shipper_address: '서울 성북구 동소문로 290-1',
    shipper_address_english: '290-1 Dongsomun-ro, Seongbuk-gu',
    shipper_address_detail_english: 'Suite 200',
    shipper_contact_phone: '010-1234-5678',
    recipient_phone: '+86 393-8302-0288',
    packages: [
      {
        id: 'pkg-1',
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 5,
        special_cargo_type: 'NONE',
        content_type: 'GENERAL',
        items: [{ item_name: 'Widget', quantity: 1, unit_price: 10, currency: 'USD', hs_code: '8471300000', item_packing_unit: 'EA' }],
      },
    ],
    ...overrides,
  };
}

describe('TASK-B-333: normalizeUpsContentType (Issue #1240 항목 5)', () => {
  it('UPS + GENERAL(null/빈값/기타 포함) → NONDOC', () => {
    expect(normalizeUpsContentType('GENERAL', 'UPS')).toBe('NONDOC');
    expect(normalizeUpsContentType('', 'UPS')).toBe('NONDOC');
    expect(normalizeUpsContentType(null, 'UPS')).toBe('NONDOC');
    expect(normalizeUpsContentType(undefined, 'UPS')).toBe('NONDOC');
    expect(normalizeUpsContentType('XYZ', 'UPS')).toBe('NONDOC');
  });

  it('UPS + DOC → DOC 유지', () => {
    expect(normalizeUpsContentType('DOC', 'UPS')).toBe('DOC');
  });

  it('UPS + NONDOC → NONDOC 유지', () => {
    expect(normalizeUpsContentType('NONDOC', 'UPS')).toBe('NONDOC');
  });

  it('비UPS → 기존 값 유지 (null/undefined → GENERAL)', () => {
    expect(normalizeUpsContentType('GENERAL', 'AIR')).toBe('GENERAL');
    expect(normalizeUpsContentType('DOC', 'AIR')).toBe('DOC');
    expect(normalizeUpsContentType(null, 'AIR')).toBe('GENERAL');
    expect(normalizeUpsContentType(undefined, undefined)).toBe('GENERAL');
  });
});

describe('TASK-B-333: buildOrderEditDefaults (Issue #1240 항목 4·5)', () => {
  it('저장된 화주명·영문주소를 defaultValues에 보존한다 (항목 4)', () => {
    const defaults = buildOrderEditDefaults(baseOrder()) as any;
    expect(defaults.shipper_name).toBe('Saved Custom Shipper');
    expect(defaults.shipper_address_english).toBe('290-1 Dongsomun-ro, Seongbuk-gu');
    expect(defaults.shipper_address_detail_english).toBe('Suite 200');
    expect(defaults.shipper_address).toBe('서울 성북구 동소문로 290-1');
  });

  it('UPS 패키지 GENERAL content_type을 NONDOC으로 정규화한다 (항목 5)', () => {
    const defaults = buildOrderEditDefaults(baseOrder({ packages: [{ id: 'p', content_type: 'GENERAL', items: [] }] })) as any;
    expect(defaults.packages[0].content_type).toBe('NONDOC');
  });

  it('UPS DOC content_type은 유지한다 (항목 5)', () => {
    const defaults = buildOrderEditDefaults(baseOrder({ packages: [{ id: 'p', content_type: 'DOC', items: [] }] })) as any;
    expect(defaults.packages[0].content_type).toBe('DOC');
  });

  it('비UPS GENERAL content_type은 유지한다 (회귀 방지)', () => {
    const defaults = buildOrderEditDefaults(baseOrder({ transport_mode: 'AIR', packages: [{ id: 'p', content_type: 'GENERAL', items: [] }] })) as any;
    expect(defaults.packages[0].content_type).toBe('GENERAL');
  });

  it('레거시 하이픈 전화번호를 숫자만으로 정제한다 (TASK-B-332 후속)', () => {
    const defaults = buildOrderEditDefaults(baseOrder()) as any;
    expect(defaults.shipper_contact_phone).toBe('01012345678');
    expect(defaults.recipient_phone).toBe('8639383020288');
  });

  it('이미 숫자만인 전화값은 불변, null/undefined는 빈 문자열', () => {
    const digits = buildOrderEditDefaults(baseOrder({ shipper_contact_phone: '01012345678', recipient_phone: '01099887766' })) as any;
    expect(digits.shipper_contact_phone).toBe('01012345678');
    expect(digits.recipient_phone).toBe('01099887766');

    const empty = buildOrderEditDefaults(baseOrder({ shipper_contact_phone: null, recipient_phone: undefined })) as any;
    expect(empty.shipper_contact_phone).toBe('');
    expect(empty.recipient_phone).toBe('');
  });
});

describe('TASK-B-333: resolveShipperAddressDefaults (Issue #1240 항목 4)', () => {
  const saved = {
    country_code: 'KR',
    state_province: '11',
    city: 'Seoul',
    address: 'Saved Street 1',
    address_detail: 'Saved Bldg',
    zipcode: '04515',
    address_english: 'Saved Street 1 EN',
    address_detail_english: 'Saved Bldg EN',
  };
  const affiliation = {
    orgCountryCode: 'KR',
    orgStateProvince: '41',
    orgCity: 'Seongnam-si',
    orgAddressStreet: 'Org Street 9',
    orgAddressDetail: 'Org Bldg',
    orgZipcode: '13494',
  };

  it('수정 모드 + 토글 없음(isEdit && !touched) → 저장 주소값 사용', () => {
    const res = resolveShipperAddressDefaults({ isEdit: true, touched: false, mode: 'auto', saved, affiliation });
    expect(res).toMatchObject({
      country_code: 'KR',
      state_province: '11',
      city: 'Seoul',
      address: 'Saved Street 1',
      address_detail: 'Saved Bldg',
      zipcode: '04515',
      address_english: 'Saved Street 1 EN',
      address_detail_english: 'Saved Bldg EN',
    });
  });

  it('수정 모드라도 토글 후 manual → 빈 값', () => {
    const res = resolveShipperAddressDefaults({ isEdit: true, touched: true, mode: 'manual', saved, affiliation });
    expect(res).toMatchObject({ country_code: '', state_province: '', city: '', address: '', address_detail: '', zipcode: '' });
  });

  it('수정 모드라도 토글 후 auto → affiliation 소속값', () => {
    const res = resolveShipperAddressDefaults({ isEdit: true, touched: true, mode: 'auto', saved, affiliation });
    expect(res).toMatchObject({
      country_code: 'KR',
      state_province: '41',
      city: 'Seongnam-si',
      address: 'Org Street 9',
      address_detail: 'Org Bldg',
      zipcode: '13494',
    });
  });

  it('신규 등록(비수정) manual → 빈 값, auto → affiliation (회귀 방지)', () => {
    const manual = resolveShipperAddressDefaults({ isEdit: false, touched: false, mode: 'manual', saved, affiliation });
    expect(manual).toMatchObject({ address: '', state_province: '' });

    const auto = resolveShipperAddressDefaults({ isEdit: false, touched: false, mode: 'auto', saved, affiliation });
    expect(auto).toMatchObject({
      country_code: 'KR',
      state_province: '41',
      city: 'Seongnam-si',
      address: 'Org Street 9',
      address_detail: 'Org Bldg',
      zipcode: '13494',
    });
  });
});

// TASK-B-340 (Issue #1256): 화주 국가코드 빈 값('') 기본값 정정 — `??`는 ''을 통과시켰다.
describe('TASK-B-340: 화주 국가코드 빈 값 기본값 정정 (Issue #1256)', () => {
  it('buildOrderEditDefaults — "" → KR, null → KR, "JP" → JP (recipient는 불변)', () => {
    expect((buildOrderEditDefaults(baseOrder({ shipper_country_code: '' })) as any).shipper_country_code).toBe('KR');
    expect((buildOrderEditDefaults(baseOrder({ shipper_country_code: null })) as any).shipper_country_code).toBe('KR');
    expect((buildOrderEditDefaults(baseOrder({ shipper_country_code: 'JP' })) as any).shipper_country_code).toBe('JP');
    // recipient_country_code는 이 Task에서 변경하지 않는다 — ''가 그대로 유지됨
    expect((buildOrderEditDefaults(baseOrder({ recipient_country_code: '' })) as any).recipient_country_code).toBe('');
  });

  it('resolveShipperAddressDefaults — saved.country_code "" → KR', () => {
    const res = resolveShipperAddressDefaults({
      isEdit: true,
      touched: false,
      mode: 'auto',
      saved: { country_code: '', address: 'Saved Street 1' },
      affiliation: null,
    });
    expect(res.country_code).toBe('KR');
    expect(res.address).toBe('Saved Street 1');
  });
});
