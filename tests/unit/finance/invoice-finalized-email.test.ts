import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg-123' }, error: null });

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  }
}));

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

describe('TC-F.10: sendInvoiceFinalizedEmail', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_123';
  });

  it('should send email with correct params', async () => {
    const { sendInvoiceFinalizedEmail } = await import('@/lib/notifications/email');
    await sendInvoiceFinalizedEmail({
      email: 'shipper@example.com',
      shipperName: 'Test Shipper Co',
      invoiceNo: 'INV-20260723-0001',
      totalAmount: 2500.00,
      currency: 'USD',
      dueDate: '2026-08-06',
      orderNo: 'ZEN-2026-001',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'shipper@example.com',
        subject: expect.stringContaining('INV-20260723-0001'),
      })
    );
  });

  it('should escape HTML in shipper name', async () => {
    const { sendInvoiceFinalizedEmail } = await import('@/lib/notifications/email');
    await sendInvoiceFinalizedEmail({
      email: 'shipper@test.com',
      shipperName: '<script>alert("xss")</script>',
      invoiceNo: 'INV-001',
      totalAmount: 100,
      currency: 'USD',
      dueDate: '2026-08-06',
    });
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).not.toContain('<script>');
    expect(callArgs.html).toContain('&lt;script&gt;');
  });
});
