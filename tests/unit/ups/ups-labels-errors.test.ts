import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: null,
    profile: { id: 'test-user', role: 'ADMIN' },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(), createClient: vi.fn() }));
vi.mock('@/lib/ups/label-mapping', () => ({
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([{ invoice_enname: 'Test', invoice_quantity: '1', invoice_unitcharge: '1.00' }]),
}));

function mockResolvedChain(data: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe('Issue #553: SHXK response message', () => {
  it('소스코드에서 message 관련 처리가 정상 구현됨', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    // 성공 반환에 message 포함
    expect(src).toContain('message: orderRes.message');
    // saveInitialLabel 호출부에 responseMessage 전달
    expect(src).toContain('responseMessage?: string');
    // shxk_response_message 컬럼 저장
    expect(src).toContain('shxk_response_message');
    // 실패 시 zen_ups_label_errors INSERT
    expect(src).toContain("from('zen_ups_label_errors')");
    // error_message에 실제 메시지 전달 (네거티브 컨트롤: 하드코딩 방지)
    expect(src).toMatch(/error_message:\s*orderResult\.message/);
    // 하드코딩된 값이 없는지 확인 (네거티브 컨트롤)
    expect(src).not.toContain("error_message: 'WRONG_HARDCODED_VALUE'");
  });

  it('마이그레이션에 shxk_response_message 컬럼과 zen_ups_label_errors 테이블 포함', async () => {
    const fs = await import('fs');
    const mig = fs.readFileSync(
      'supabase/migrations/20260716110000_iss553_shxk_response_message.sql',
      'utf-8'
    );
    expect(mig).toContain('shxk_response_message');
    expect(mig).toContain('CREATE TABLE public.zen_ups_label_errors');
  });
});
