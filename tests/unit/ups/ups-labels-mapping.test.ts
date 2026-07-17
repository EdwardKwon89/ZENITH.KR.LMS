import { describe, it, expect } from 'vitest';
import {
  determineOrderCargotype,
  buildCargovolume,
  buildInvoiceFromItems,
  resolveProvinceEnglishName,
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

  describe('buildInvoiceFromItems', () => {
    it('collects items from all packages', () => {
      const pkgs = [
        { items: [{ item_name: 'Widget', quantity: 2, unit_price: 10, sku_code: 'W001' }] },
        { items: [{ item_name: 'Gadget', quantity: 1, unit_price: 50, hs_code: '8471' }] },
      ];
      const result = buildInvoiceFromItems(pkgs as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ invoice_enname: 'Widget', invoice_quantity: '2', invoice_unitcharge: '10', sku: 'W001' });
      expect(result[1]).toMatchObject({ invoice_enname: 'Gadget', invoice_quantity: '1', invoice_unitcharge: '50', hs_code: '8471' });
    });

    it('returns fallback when no items', () => {
      const result = buildInvoiceFromItems([{ items: [] }] as any);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }]);
    });

    it('handles packages with no items field', () => {
      const result = buildInvoiceFromItems([{}] as any);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }]);
    });
  });

  describe('resolveProvinceEnglishName', () => {
    it('일본 "28" → Hyōgo Prefecture 변환', () => {
      const result = resolveProvinceEnglishName('28', 'JP');
      expect(result).toBe('Hyōgo Prefecture');
    });

    it('일본 "13" → Tokyo 변환', () => {
      const result = resolveProvinceEnglishName('13', 'JP');
      expect(result).toBe('Tokyo');
    });

    it('미국 "CA" → California 변환', () => {
      const result = resolveProvinceEnglishName('CA', 'US');
      expect(result).toBe('California');
    });

    it('존재하지 않는 코드는 원래 코드값 폴백', () => {
      const result = resolveProvinceEnglishName('ZZ', 'JP');
      expect(result).toBe('ZZ');
    });

    it('빈 stateCode는 빈 문자열 반환', () => {
      const result = resolveProvinceEnglishName('', 'JP');
      expect(result).toBe('');
    });

    it('빈 countryCode는 stateCode 그대로 반환', () => {
      const result = resolveProvinceEnglishName('28', '');
      expect(result).toBe('28');
    });
  });
});
