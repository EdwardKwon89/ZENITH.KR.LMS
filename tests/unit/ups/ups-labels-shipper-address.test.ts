import { describe, it, expect } from 'vitest';
import { resolveShipperStreet } from '@/lib/ups/label-mapping';

describe('Issue #563: resolveShipperStreet 우선순위', () => {
  it('조직에 영문주소 있으면 영문주소를 최우선 사용한다', () => {
    const order = { shipper_address: '한글주소', shipper_address_detail: '한글상세' };
    const shipperOrg = { address_english: 'English St', address_detail_english: 'Suite 1', address: '한글주소2' };
    expect(resolveShipperStreet(order, shipperOrg)).toBe('English St Suite 1');
  });

  it('영문주소 없으면 조직 한글주소로 폴백한다', () => {
    const order = { shipper_address: '레거시주소' };
    const shipperOrg = { address: '조직 한글주소', address_detail: '조직 상세' };
    expect(resolveShipperStreet(order, shipperOrg)).toBe('조직 한글주소 조직 상세');
  });

  it('조직 주소 자체가 없으면 오더 레거시 스냅샷으로 폴백한다', () => {
    const order = { shipper_address: '레거시주소', shipper_address_detail: '레거시상세' };
    expect(resolveShipperStreet(order, undefined)).toBe('레거시주소 레거시상세');
  });

  it('영문 주소만 있고 상세가 없으면 주소만 반환한다', () => {
    const order = { shipper_address: '한글주소' };
    const shipperOrg = { address_english: 'English St' };
    expect(resolveShipperStreet(order, shipperOrg)).toBe('English St');
  });

  it('모든 주소가 없으면 빈 문자열을 반환한다', () => {
    const order = {};
    expect(resolveShipperStreet(order, undefined)).toBe('');
  });
});
