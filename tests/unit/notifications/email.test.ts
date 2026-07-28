import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg-123' }, error: null });

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  }
}));

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe('sendViaResend() error 체크 (DEF-B-022)', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_123';
  });

  it('Resend API가 error를 반환하면 예외를 던진다', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } });

    const { sendSignupWelcomeEmail } = await import('@/lib/notifications/email');
    await expect(sendSignupWelcomeEmail({
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'TestPass123',
    })).rejects.toThrow('Invalid API key');
  });

  it('Resend API가 성공하면 예외를 던지지 않는다', async () => {
    const { sendSignupWelcomeEmail } = await import('@/lib/notifications/email');
    await expect(sendSignupWelcomeEmail({
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'TestPass123',
    })).resolves.toBeUndefined();
  });
});

describe('sendSignupWelcomeEmail() (Issue #937)', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_123';
  });

  it('올바른 to/subject/html로 발송된다', async () => {
    const { sendSignupWelcomeEmail } = await import('@/lib/notifications/email');
    await sendSignupWelcomeEmail({
      email: 'newuser@example.com',
      fullName: '김철수',
      password: 'MySecurePass123',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newuser@example.com',
        subject: expect.stringContaining('회원가입이 완료되었습니다'),
        html: expect.stringContaining('MySecurePass123'),
      })
    );
  });

  it('HTML에 사용자 이름과 이메일이 포함된다', async () => {
    const { sendSignupWelcomeEmail } = await import('@/lib/notifications/email');
    await sendSignupWelcomeEmail({
      email: 'user@test.com',
      fullName: '홍길동',
      password: 'pass123',
    });

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain('홍길동');
    expect(html).toContain('user@test.com');
  });
});

describe('기존 이메일 함수 리팩터링 회귀 (DEF-B-022)', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_123';
  });

  it('sendStatusChangeEmail이 sendViaResend를 통해 발송된다', async () => {
    const { sendStatusChangeEmail } = await import('@/lib/notifications/email');
    await sendStatusChangeEmail(
      { email: 'test@example.com', name: 'Test' },
      'ZEN-001',
      'DELIVERED' as any
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });

  it('sendFreightChangeEmail이 sendViaResend를 통해 발송된다', async () => {
    const { sendFreightChangeEmail } = await import('@/lib/notifications/email');
    await sendFreightChangeEmail({
      email: 'test@example.com',
      shipperName: 'Test',
      orderNo: 'ZEN-001',
      oldFreight: 100,
      newFreight: 150,
      currency: 'USD',
      reason: '부피 재측정',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });

  it('sendShipperWelcomeEmail이 sendViaResend를 통해 발송된다', async () => {
    const { sendShipperWelcomeEmail } = await import('@/lib/notifications/email');
    await sendShipperWelcomeEmail({
      email: 'test@example.com',
      shipperName: 'Test',
      tempPassword: 'temp123',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });

  it('sendInvoiceFinalizedEmail이 sendViaResend를 통해 발송된다', async () => {
    const { sendInvoiceFinalizedEmail } = await import('@/lib/notifications/email');
    await sendInvoiceFinalizedEmail({
      email: 'test@example.com',
      shipperName: 'Test',
      invoiceNo: 'INV-001',
      totalAmount: 1000,
      currency: 'USD',
      dueDate: '2026-08-01',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });
});
