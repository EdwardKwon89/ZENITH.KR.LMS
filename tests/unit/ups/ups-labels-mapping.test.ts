import { describe, it, expect } from 'vitest';
import {
  determineOrderCargotype,
  buildCargovolume,
  buildInvoiceFromItems,
  resolveShipperStreet,
  resolveShxkUnitCode,
  buildCreateOrderPayload,
} from '@/lib/ups/label-mapping';

describe('UPS Labels Mapping Functions', () => {
  describe('determineOrderCargotype', () => {
    it('all DOC packages → cargotype=D, mailCargoType=3', () => {
      const pkgs = [{ content_type: 'DOC' }, { content_type: 'DOC' }];
      const result = determineOrderCargotype(pkgs as any);
      expect(result.cargotype).toBe('D');
      expect(result.mailCargoType).toBe('3');
    });

    it('mixed DOC/NONDOC → cargotype=W, mailCargoType=4', () => {
      const pkgs = [{ content_type: 'DOC' }, { content_type: 'NONDOC' }];
      const result = determineOrderCargotype(pkgs as any);
      expect(result.cargotype).toBe('W');
      expect(result.mailCargoType).toBe('4');
    });

    it('all NONDOC → cargotype=W, mailCargoType=4', () => {
      const pkgs = [{ content_type: 'NONDOC' }, { content_type: 'GENERAL' }];
      const result = determineOrderCargotype(pkgs as any);
      expect(result.cargotype).toBe('W');
      expect(result.mailCargoType).toBe('4');
    });

    it('empty packages → cargotype=W, mailCargoType=4 (보수적 기본값)', () => {
      const result = determineOrderCargotype([]);
      expect(result.cargotype).toBe('W');
      expect(result.mailCargoType).toBe('4');
    });
  });

  describe('buildCargovolume', () => {
    it('maps package dimensions correctly with pkg.id as child_number', () => {
      const pkgs = [
        { id: 'pkg-uuid-001', length: 30, width: 20, height: 10, gross_weight: 5 },
        { id: 'pkg-uuid-002', length: 40, width: 30, height: 20, gross_weight: 8 },
      ];
      const result = buildCargovolume(pkgs as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        child_number: 'pkg-uuid-001', involume_length: 30, involume_width: 20,
        involume_height: 10, involume_grossweight: 5,
      });
      expect(result[1]).toEqual({
        child_number: 'pkg-uuid-002', involume_length: 40, involume_width: 30,
        involume_height: 20, involume_grossweight: 8,
      });
    });

    it('handles empty packages', () => {
      expect(buildCargovolume([])).toEqual([]);
    });

    it('defaults missing dimensions to 0 and uses empty string for missing id', () => {
      const result = buildCargovolume([{}] as any);
      expect(result[0]).toEqual({
        child_number: '', involume_length: 0, involume_width: 0,
        involume_height: 0, involume_grossweight: 0,
      });
    });
  });

  describe('resolveShxkUnitCode', () => {
    it('EA → PCE', () => {
      expect(resolveShxkUnitCode('EA')).toBe('PCE');
    });

    it('PCS → PCE', () => {
      expect(resolveShxkUnitCode('PCS')).toBe('PCE');
    });

    it('SET → SET', () => {
      expect(resolveShxkUnitCode('SET')).toBe('SET');
    });

    it('MTR → MTR', () => {
      expect(resolveShxkUnitCode('MTR')).toBe('MTR');
    });

    it('빈 문자열 → PCE (기본값)', () => {
      expect(resolveShxkUnitCode('')).toBe('PCE');
    });

    it('미지값 XYZ → PCE (기본값 폴백)', () => {
      expect(resolveShxkUnitCode('XYZ')).toBe('PCE');
    });

    it('소문자 ea → PCE (대소문자 무시)', () => {
      expect(resolveShxkUnitCode('ea')).toBe('PCE');
    });
  });

  describe('buildInvoiceFromItems', () => {
    it('collects items from all packages', () => {
      const pkgs = [
        { items: [{ item_name: 'Widget', quantity: 2, unit_price: 10, sku_code: 'W001', item_packing_unit: 'EA' }] },
        { items: [{ item_name: 'Gadget', quantity: 1, unit_price: 50, hs_code: '8471', item_packing_unit: 'MTR' }] },
      ];
      const result = buildInvoiceFromItems(pkgs as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ invoice_enname: 'Widget', invoice_quantity: '2', invoice_unitcharge: '10', sku: 'W001', unit_code: 'PCE' });
      expect(result[1]).toMatchObject({ invoice_enname: 'Gadget', invoice_quantity: '1', invoice_unitcharge: '50', hs_code: '8471', unit_code: 'MTR' });
    });

    it('item_packing_unit을 unit_code로 변환해 반환한다', () => {
      const packages = [{ items: [{ item_name: 'Jeans', quantity: 1, unit_price: 10, item_packing_unit: 'EA' }] }];
      const result = buildInvoiceFromItems(packages);
      expect(result[0].unit_code).toBe('PCE');
    });

    it('item_packing_unit 없으면 PCE 기본값', () => {
      const packages = [{ items: [{ item_name: 'Shirt', quantity: 1, unit_price: 20 }] }];
      const result = buildInvoiceFromItems(packages);
      expect(result[0].unit_code).toBe('PCE');
    });

    it('returns fallback when no items', () => {
      const result = buildInvoiceFromItems([{ items: [] }] as any);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00', unit_code: 'PCE' }]);
    });

    it('handles packages with no items field', () => {
      const result = buildInvoiceFromItems([{}] as any);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00', unit_code: 'PCE' }]);
    });
  });

  describe('resolveShipperStreet', () => {
    it('우선순위: org address_english > org address > order shipper_address', () => {
      const order = { shipper_address: 'Fallback Street' };
      const org = { address_english: 'English Address', address: 'Korean Address' };
      expect(resolveShipperStreet(order as any, org as any)).toBe('English Address');
    });

    it('org address_english 없으면 org address 사용', () => {
      const order = { shipper_address: 'Fallback Street' };
      const org = { address: 'Korean Address' };
      expect(resolveShipperStreet(order as any, org as any)).toBe('Korean Address');
    });

    it('org 없으면 order.shipper_address 사용', () => {
      const order = { shipper_address: 'Order Street' };
      expect(resolveShipperStreet(order as any, undefined)).toBe('Order Street');
    });

    it('address + address_detail 조합', () => {
      const org = { address_english: 'Main St', address_detail_english: 'Unit 101' };
      expect(resolveShipperStreet({} as any, org as any)).toBe('Main St Unit 101');
    });
  });

  describe('buildCreateOrderPayload', () => {
    const sampleOrder = {
      order_no: 'ORD-001',
      shipper_contact_name: 'Shipper Kim',
      shipper_country_code: 'KR',
      shipper_state_province: '11',
      shipper_city: 'Mapo-gu',
      shipper_zipcode: '04515',
      shipper_contact_phone: '02-1234-5678',
      recipient_name: 'John Doe',
      recipient_country_code: 'US',
      recipient_state_province: 'CA',
      recipient_city: 'Los Angeles',
      recipient_address: '123 Main St',
      recipient_address_local: '',
      recipient_zipcode: '90001',
      recipient_phone: '213-555-0100',
      recipient_email: 'john@example.com',
      recipient_pccc: '123456',
      shipper_org: null,
    };

    const samplePackages = [
      {
        id: 'pkg-1',
        length: 30, width: 20, height: 10,
        gross_weight: 5,
        physical_box_count: 2,
        content_type: 'NONDOC',
        items: [{ item_name: 'Widget', quantity: 1, unit_price: 100 }],
      },
    ];

    const shipperDefaults = { name: 'SNTL Korea Co Ltd', country: 'KR' };

    it('필수 필드가 올바르게 매핑되는지 검증', () => {
      const result = buildCreateOrderPayload('SHP-CODE', sampleOrder as any, 'US', samplePackages as any, shipperDefaults);

      expect(result.reference_no).toBe('ORD-001');
      expect(result.shipping_method).toBe('SHP-CODE');
      expect(result.order_status).toBe('P');
      expect(result.order_pieces).toBe(2);
      expect(result.order_weight).toBe(5);

      expect((result.shipper as any).shipper_name).toBe('Shipper Kim');
      expect((result.shipper as any).shipper_countrycode).toBe('KR');
      expect((result.shipper as any).shipper_province).toBe('11');

      expect((result.consignee as any).consignee_name).toBe('John Doe');
      expect((result.consignee as any).consignee_countrycode).toBe('US');
      expect((result.consignee as any).consignee_province).toBe('CA');
      expect((result.consignee as any).consignee_email).toBe('john@example.com');
      expect((result.consignee as any).consignee_tariff).toBe('123456');

      expect(result.cargotype).toBe('W');
      expect(result.mail_cargo_type).toBe('4');
      expect((result.cargovolume as any[])).toHaveLength(1);
      expect((result.invoice as any[])).toHaveLength(1);
    });

    it('shipperDefaults 폴백 동작 검증 (shipper_contact_name/shipper_country_code 없을 때)', () => {
      const orderNoContact = { ...sampleOrder, shipper_contact_name: '', shipper_country_code: '' };
      const result = buildCreateOrderPayload('SHP-CODE', orderNoContact as any, 'US', samplePackages as any, shipperDefaults);

      expect((result.shipper as any).shipper_name).toBe('SNTL Korea Co Ltd');
      expect((result.shipper as any).shipper_countrycode).toBe('KR');
    });

    it('recipient_name 없으면 기본값 "E2E Consignee" 사용', () => {
      const orderNoName = { ...sampleOrder, recipient_name: '' };
      const result = buildCreateOrderPayload('SHP-CODE', orderNoName as any, 'US', samplePackages as any, shipperDefaults);

      expect((result.consignee as any).consignee_name).toBe('E2E Consignee');
    });

    it('recipient_address_local 있으면 street에 괄호 추가', () => {
      const orderWithLocal = { ...sampleOrder, recipient_address_local: '서울시 강남구' };
      const result = buildCreateOrderPayload('SHP-CODE', orderWithLocal as any, 'US', samplePackages as any, shipperDefaults);

      expect((result.consignee as any).consignee_street).toBe('123 Main St (서울시 강남구)');
    });

    it('빈 packages → cargotype=W, invoice fallback, pieces=0, weight=0', () => {
      const result = buildCreateOrderPayload('SHP-CODE', sampleOrder as any, 'US', [], shipperDefaults);

      expect(result.cargotype).toBe('W');
      expect(result.order_pieces).toBe(0);
      expect(result.order_weight).toBe(0);
      expect((result.invoice as any[])).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00', unit_code: 'PCE' }]);
    });
  });

});
