import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';

describe('Issue #563: placeShxkOrder shipper_street 영문 우선 매핑', () => {
  const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

  it('lookupOrderPackages가 shipper_org를 조인한다', () => {
    expect(src).toContain('shipper_org:zen_organizations!shipper_id');
    expect(src).toContain('address_english');
    expect(src).toContain('address_detail_english');
  });

  it('placeShxkOrder가 shipper_org에서 영문 주소를 우선 사용한다', () => {
    expect(src).toContain('shipperOrg?.address_english');
    expect(src).toContain('shipperOrg?.address_detail_english');
  });

  it('영문 주소 없으면 조직 한글 주소로 폴백한다', () => {
    expect(src).toContain('shipperOrg?.address');
    expect(src).toContain('shipperOrg?.address_detail');
  });

  it('조직 주소 없으면 오더 스냅샷으로 폴백한다', () => {
    expect(src).toContain('order.shipper_address');
    expect(src).toContain('order.shipper_address_detail');
  });

  it('shipperStreet 계산에 filter(Boolean).join 사용', () => {
    expect(src).toContain('[shipperAddr, shipperAddrDetail].filter(Boolean).join(\' \')');
  });
});
