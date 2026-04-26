import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRouteOptions, selectRoute, getRouteVisualization, getRouteConsistencyStatus } from '@/app/actions/routing';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { createOrder, updateOrderStatus } from '@/app/actions/orders';
import { adjustInventory } from '@/app/actions/inventory';
import { addTrackingEvent } from '@/app/actions/tracking';
import { calculateSettlementAction, issueInvoicePdf, updatePaymentStatus, issueTaxInvoice, sendTaxInvoiceEmail } from '@/app/actions/finance';
import { OrderStatus } from '@/types/orders';

// SettlementEngine / InvoiceGenerator / issueInvoicePdf 은 외부 의존성(supabase singleton, pdf, storage) 보유 — mock 처리 필요
vi.mock('@/lib/finance/settlement', () => ({
  SettlementEngine: class {
    calculateOrderCosts = vi.fn().mockResolvedValue({ success: true, chargeableWeight: 100, totalFreight: 1000, currency: 'USD', costId: 'cost-uuid-1' });
  },
  InvoiceGenerator: class {
    generateInvoice = vi.fn().mockResolvedValue({ success: true, invoice: { id: 'invoice-gen-1' } });
  }
}));
vi.mock('@/lib/finance/pdf', () => ({
  generateInvoicePdfBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf'))
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
  checkPermission: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'msg-123' }, error: null }),
      };
    }
  };
});

describe('ZENITH Phase 3 UAT: E2E + Routing Integrated Validation', () => {
  const mockShipperUser = { id: 'shipper-user-123' };
  const mockShipperProfile = { id: 'shipper-1', org_id: 'shipper-corp', role: 'CORPORATE' };
  
  const mockAdminUser = { id: 'admin-user-123' };
  const mockAdminProfile = { id: 'admin-1', org_id: 'zenith-hq', role: 'ADMIN' };

  let mockSupabase: any;
  let mockResultQueue: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_123';
    mockResultQueue = [];

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      head: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.url/file.pdf' } }),
        })
      },
      then: function(resolve: any) {
        resolve(mockResultQueue.shift() || { data: null, error: null, count: 0 });
      }
    };

    (validateUserAction as any).mockResolvedValue({
      user: mockShipperUser,
      profile: mockShipperProfile,
      supabase: mockSupabase
    });

    (validateAdminAction as any).mockResolvedValue({
      user: mockAdminUser,
      profile: mockAdminProfile,
      supabase: mockSupabase
    });
  });

  it('TC-UAT-E2E.1: 완전 물류 사이클 (오더 → 경로 → 트래킹 → 정산 → 세금계산서)', async () => {
    const mockOrderId = 'order-e2e-1';

    // Step 3: Shipper calculates route -> selects BALANCED. (ROU.1, ROU.2)
    mockResultQueue.push(
      { data: { origin_port_id: 'port-1', dest_port_id: 'port-2' }, error: null }, // order single
      { error: null }, // upsert COST
      { error: null }, // upsert TIME
      { error: null }, // upsert BALANCED
      { data: [{ option_type: 'BALANCED', id: 'route-balanced-uuid' }], error: null } // select saved options
    );
    
    const routeOptions = await getRouteOptions(mockOrderId);
    expect(routeOptions.success).toBe(true);
    expect(routeOptions.options).toBeDefined();

    mockResultQueue.push(
      { error: null }, // upsert applied route
      { data: { id: 'route-balanced-uuid' }, error: null } // select applied route id
    );
    const selectRes = await selectRoute(mockOrderId, 'BALANCED');
    expect(selectRes.success).toBe(true);
    expect(selectRes.appliedRouteId).toBe('route-balanced-uuid');

    // Step 4: Admin confirms warehousing -> inventory increases
    // adjustInventory: (1) select single inv, (2) update qty, (3) insert history
    mockResultQueue.push(
      { data: { on_hand_qty: 100 }, error: null }, // select current inventory
      { error: null }, // update on_hand_qty
      { error: null }  // insert inventory_history log
    );
    const invRes = await adjustInventory({
      inventoryId: 'a3690b5e-40d9-4151-b21a-ab64b5aaa29a',
      adjustmentQty: 10,
      reason: 'E2E_INBOUND 입고 처리',
    });
    expect(invRes?.success).toBe(true);

    // Step 5: Admin syncs external tracking -> IN_TRANSIT
    mockResultQueue.push({ error: null }); // insert tracking
    const trkRes = await addTrackingEvent('master-1', { event_code: 'DEP', location: 'ICN', description: 'IN_TRANSIT' });
    expect(trkRes.success).toBe(true);

    // Step 6: calculateSettlementAction — SettlementEngine이 모킹되어 mock queue 불필요
    const costRes = await calculateSettlementAction(mockOrderId);
    expect(costRes.success).toBe(true);

    // Step 7: issueInvoicePdf DB flow: 1) invoices single, 2) pdf_history count, 3) pdf_history insert
    // storage.upload은 mockSupabase.storage에 의해 처리
    mockResultQueue.push(
      { data: { invoice_no: 'INV-001', total_amount: 1000, currency: 'USD', shipper: { name: 'A', address: 'Seoul', business_number: '123' }, costs: [] }, error: null },
      { count: 0, error: null }, // pdf_history count
      { error: null }, // pdf_history insert
    );
    const invPdfRes = await issueInvoicePdf('invoice-1');
    expect(invPdfRes.success).toBe(true);

    // Step 8: Admin pays invoice fully -> PAID (signature: invoiceId, status, amount)
    mockResultQueue.push(
      { data: { metadata: null }, error: null }, // update + select metadata
    );
    const payRes = await updatePaymentStatus('invoice-1', 'PAID', 1000);
    expect(payRes.success).toBe(true);

    // Step 9: issueTaxInvoice DB flow:
    //  1) zen_invoices single (+shipper+costs)  2) tax_invoices insert+single
    // sendTaxInvoiceEmail DB flow:
    //  3) tax_invoices select single  4) tax_invoices update
    mockResultQueue.push(
      { data: { id: 'invoice-1', total_amount: 1000, currency: 'USD', shipper_id: 'sh-1', shipper: { name: 'A', address: 'Seoul', business_number: '111', email: 'shipper@test.com' }, costs: [] }, error: null },
      { data: { id: 'tax-inv-uuid-1', tax_invoice_no: 'TX-20260424-0001' }, error: null },
    );
    const taxRes = await issueTaxInvoice('invoice-1');
    expect(taxRes.success).toBe(true);

    mockResultQueue.push(
      { data: { id: 'tax-inv-uuid-1', tax_invoice_no: 'TX-20260424-0001', currency: 'KRW', total_amount: 1100, metadata: {} }, error: null },
      { error: null }, // update status=SENT
    );
    const emailRes = await sendTaxInvoiceEmail(taxRes.taxInvoiceId!, 'shipper@test.com');
    expect(emailRes.success).toBe(true);
  });
  
  it('TC-UAT-ROU.3/4: 경로 타임라인 & 배지 UAT 검증', async () => {
    const mockOrderId = 'order-e2e-2';
    
    // ROU.3: Timeline Visualization
    mockResultQueue.push(
      { data: { selected_option: { option_type: 'BALANCED', segments: [] } }, error: null }, // order_routes maybeSingle
      { data: [], error: null } // tracking events
    );
    const vizRes = await getRouteVisualization(mockOrderId);
    expect(vizRes.success).toBe(true);
    expect(vizRes.milestones).toBeInstanceOf(Array);
    
    // ROU.4: Consistency Badge
    const badgeRes = await getRouteConsistencyStatus(mockOrderId);
    expect(badgeRes.success).toBe(true);
    expect(badgeRes.isConsistent).toBeDefined();
  });
});
