import { describe, it, expect } from 'vitest';
import { generateInvoicePdfBuffer } from '@/lib/finance/pdf';

describe('Invoice PDF Generation', () => {
  it('should generate a PDF buffer from valid data', async () => {
    const mockData = {
      invoice_no: 'INV-2026-001',
      due_date: '2026-05-24',
      total_amount: 5000,
      currency: 'USD',
      shipper: {
        name: 'Test Shipper Corp',
        address: '123 Logistics Way, Seoul, KR',
        business_number: '123-45-67890'
      },
      costs: [
        {
          cost_type: 'Air Freight',
          quantity: 1,
          unit_price: 4500,
          total_amount: 4500,
          currency: 'USD'
        },
        {
          cost_type: 'Handling Fee',
          quantity: 1,
          unit_price: 500,
          total_amount: 500,
          currency: 'USD'
        }
      ]
    };

    const buffer = await generateInvoicePdfBuffer(mockData);
    
    expect(buffer).toBeDefined();
    expect(buffer instanceof Buffer).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF header check (%PDF-)
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
