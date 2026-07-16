import { describe, it, expect } from 'vitest';

// Replicate the pure functions from ups-labels.ts for testing
function determineOrderCargotype(packages: { content_type?: string }[]): { cargotype: string; mailCargoType: string } {
  const allDoc = packages.every(p => p.content_type === 'DOC');
  return allDoc
    ? { cargotype: 'D', mailCargoType: '3' }
    : { cargotype: 'W', mailCargoType: '4' };
}

function buildCargovolume(packages: Record<string, unknown>[]): Record<string, unknown>[] {
  return packages.map((pkg, idx) => ({
    child_number: String(idx + 1),
    involume_length: Number(pkg.length ?? 0),
    involume_width: Number(pkg.width ?? 0),
    involume_height: Number(pkg.height ?? 0),
    involume_grossweight: Number(pkg.gross_weight ?? 0),
  }));
}

function buildInvoiceFromItems(packages: Record<string, unknown>[]): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  for (const pkg of packages) {
    const pkgItems = (pkg.items as any[]) || [];
    for (const item of pkgItems) {
      items.push({
        invoice_enname: item.item_name || 'General Merchandise',
        invoice_quantity: String(item.quantity ?? 1),
        invoice_unitcharge: String(item.unit_price ?? '1.00'),
        ...(item.sku_code ? { sku: item.sku_code } : {}),
        ...(item.hs_code ? { hs_code: item.hs_code } : {}),
      });
    }
  }
  return items.length > 0 ? items : [{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }];
}

describe('UPS Labels Mapping Functions', () => {
  describe('determineOrderCargotype', () => {
    it('all DOC packages → cargotype=D, mailCargoType=3', () => {
      const pkgs = [{ content_type: 'DOC' }, { content_type: 'DOC' }];
      const result = determineOrderCargotype(pkgs);
      expect(result.cargotype).toBe('D');
      expect(result.mailCargoType).toBe('3');
    });

    it('mixed DOC/NONDOC → cargotype=W, mailCargoType=4', () => {
      const pkgs = [{ content_type: 'DOC' }, { content_type: 'NONDOC' }];
      const result = determineOrderCargotype(pkgs);
      expect(result.cargotype).toBe('W');
      expect(result.mailCargoType).toBe('4');
    });

    it('all NONDOC → cargotype=W, mailCargoType=4', () => {
      const pkgs = [{ content_type: 'NONDOC' }, { content_type: 'GENERAL' }];
      const result = determineOrderCargotype(pkgs);
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
    it('maps package dimensions correctly', () => {
      const pkgs = [
        { length: 30, width: 20, height: 10, gross_weight: 5 },
        { length: 40, width: 30, height: 20, gross_weight: 8 },
      ];
      const result = buildCargovolume(pkgs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        child_number: '1', involume_length: 30, involume_width: 20,
        involume_height: 10, involume_grossweight: 5,
      });
      expect(result[1]).toEqual({
        child_number: '2', involume_length: 40, involume_width: 30,
        involume_height: 20, involume_grossweight: 8,
      });
    });

    it('handles empty packages', () => {
      expect(buildCargovolume([])).toEqual([]);
    });

    it('defaults missing dimensions to 0', () => {
      const result = buildCargovolume([{}]);
      expect(result[0]).toEqual({
        child_number: '1', involume_length: 0, involume_width: 0,
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
      const result = buildInvoiceFromItems(pkgs);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ invoice_enname: 'Widget', invoice_quantity: '2', invoice_unitcharge: '10', sku: 'W001' });
      expect(result[1]).toMatchObject({ invoice_enname: 'Gadget', invoice_quantity: '1', invoice_unitcharge: '50', hs_code: '8471' });
    });

    it('returns fallback when no items', () => {
      const result = buildInvoiceFromItems([{ items: [] }]);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }]);
    });

    it('handles packages with no items field', () => {
      const result = buildInvoiceFromItems([{}]);
      expect(result).toEqual([{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }]);
    });
  });
});
