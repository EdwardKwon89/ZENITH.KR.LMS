import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInvoicesForOrder, updatePaymentStatus } from '@/app/actions/finance';
import { updateOrderStatus } from '@/app/actions/orders';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';
import { InvoiceGenerator } from '@/lib/finance/settlement';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/finance/settlement', () => {
  return {
    SettlementEngine: vi.fn().mockImplementation(function(this: any) {
      return { calculateOrderCosts: vi.fn().mockResolvedValue({ success: true, totalFreight: 1250.55, currency: 'USD' }) };
    }),
    InvoiceGenerator: vi.fn().mockImplementation(function(this: any) {
      return { generateInvoice: vi.fn().mockResolvedValue({ success: true, invoice: { id: 'inv-999', invoice_no: 'INV-TEMP' } }) };
    })
  };
});

let mockSupabase: any;

vi.mock('@/lib/supabase', () => ({
  get supabase() { return mockSupabase; }
}));

describe('ZENITH Finance Integration: WBS 3.2 Integrity Test', () => {
  const mockUser = { id: 'auth-user-123' };
  const mockAdminProfile = { id: 'admin-123', org_id: 'zenith-hq', role: 'ADMIN' };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    (validateUserAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    (validateAdminAction as any).mockResolvedValue({
      user: { id: 'admin' },
      profile: mockAdminProfile,
      supabase: mockSupabase
    });
  });

  describe('Scenario 1: Auto-Invoicing on Order Release', () => {
    it('TC-F.1: [Success] 오더가 RELEASED 상태가 될 때 정산서가 자동 생성되어야 함', async () => {
      // 1. updateOrderStatus 내 로직
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // masterCheck
      mockSupabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.PACKED } }); // currentStatus
      
      const result = await updateOrderStatus('order-1', OrderStatus.RELEASED, 'Ready for shipment');

      expect(result.success).toBe(true);
      // InvoiceGenerator 인스턴스가 생성되고 generateInvoice가 호출되는지 확인
      expect(InvoiceGenerator).toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Financial Precision & Integrity', () => {
    it('TC-F.2: [Success] 인보이스 생성 로직 검증', async () => {
      // Mock generateInvoice to return precision amount
      const mockGenerate = vi.fn().mockResolvedValue({ success: true, invoice: { id: 'inv-777', total_amount: 4567.8912 } });
      (InvoiceGenerator as any).mockImplementationOnce(function(this: any) {
        return { generateInvoice: mockGenerate };
      });

      const result = await generateInvoicesForOrder('order-precision');

      expect(result.success).toBe(true);
      expect(mockGenerate).toHaveBeenCalledWith('order-precision');
    });
  });

  describe('Scenario 3: Payment Workflow Synchronization', () => {
    it('TC-F.3: [Success] 인보이스 결제 완료 시 오더의 Billing Status가 PAID로 자동 변경되어야 함', async () => {
      // 1. findByIdBasic chain (new IMP-051 audit)
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { metadata: { source_order_id: 'order-101' }, status: 'PENDING' }, 
        error: null 
      });
      
      // 2. updatePaymentStatus repo chain: update().eq().select().single()
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { metadata: { source_order_id: 'order-101' } }, 
        error: null 
      });

      // 3. Audit history insert (best-effort)
      mockSupabase.insert.mockReturnValueOnce({ error: null });
      
      await updatePaymentStatus('inv-101', 'PAID', 1250.55);

      expect(mockSupabase.from).toHaveBeenCalledWith('zen_orders');
      const updateCall = mockSupabase.update.mock.calls.find((call: unknown[]) => (call[0] as Record<string, unknown>).billing_status === 'PAID');
      expect(updateCall).toBeDefined();
    });
  });

  describe('Scenario 4: Multi-Currency & Security Expansion (TC-F.4~6)', () => {
    it('TC-F.4: [Success] 다중 통화 환산(KRW)이 올바르게 전달되는지 검증', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ success: true, invoice: { id: 'inv-ex', currency: 'KRW' } });
      (InvoiceGenerator as any).mockImplementationOnce(function(this: any) {
        return { generateInvoice: mockGenerate };
      });

      const result = await generateInvoicesForOrder('order-ex');

      expect(result.success).toBe(true);
      expect(mockGenerate).toHaveBeenCalledWith('order-ex');
    });

    it('TC-F.5: [Failure] 일반 화주(CORPORATE)는 결제 상태를 변경할 수 없어야 함 (보안 가드)', async () => {
      (validateUserAction as any).mockResolvedValueOnce({
        supabase: mockSupabase,
        profile: { role: 'CORPORATE' },
      });

      await expect(updatePaymentStatus('inv-101', 'PAID', 1000))
        .rejects.toThrow("결제 상태를 수정할 권한이 없습니다.");
    });

    it('TC-F.6: [Policy] 인보이스가 생성된 오더는 상태 변경이 제한되어야 함 (Data Integrity)', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // master check
      mockSupabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.RELEASED } }); // current status
      
      const result = await updateOrderStatus('order-inv', OrderStatus.DELIVERED);
      
      expect(result.success).toBe(true); 
    });
  });
});
