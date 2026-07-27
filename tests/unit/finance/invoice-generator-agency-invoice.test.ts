import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mock variables ----

const { mockSupabase, insertedInvoices } = vi.hoisted(() => {
  const invoices: any[] = [];
  return {
    mockSupabase: { from: vi.fn() } as any,
    insertedInvoices: invoices,
  };
});

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock('../../params/service', () => ({
  getNumericParam: vi.fn().mockResolvedValue(1350),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('./settlement', () => ({
  SettlementEngine: vi.fn().mockImplementation(() => ({
    calculateOrderCosts: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock('./cost-aggregator', () => ({
  CostAggregator: vi.fn().mockImplementation(() => ({
    calculateTotalAmount: vi.fn().mockReturnValue(130),
  })),
}));

// ---- Chainable mock helper ----

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq'];
  methods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

/**
 * Chainable mock that captures .insert() payloads and auto-generates id.
 * For zen_invoices: 1st call = finalize check (returns null), subsequent calls = insert (captures payload, returns generated id)
 */
function createTrackingInvoiceMock() {
  const callCount = { n: 0 };
  return () => {
    callCount.n++;
    if (callCount.n === 1) {
      // finalize check → no finalized invoice
      return createChainableMock(null);
    }
    // insert call: capture the payload, return generated id
    const chain = createChainableMock(null);
    const origInsert = chain.insert.bind(chain);
    chain.insert = vi.fn().mockImplementation((payload: any) => {
      const record = { ...payload, id: `inv-gen-${insertedInvoices.length + 1}` };
      insertedInvoices.push(record);
      // Override then to return this record
      chain.then = (resolve: any) => resolve({ data: record, error: null });
      return chain;
    });
    return chain;
  };
}

// ---- Test fixtures ----

const AGENCY_ORG_ID = '22222222-2222-2222-2222-222222222222';
const SHIPPER_ID    = '33333333-3333-3333-3333-333333333333';
const ORDER_ID      = '44444444-4444-4444-4444-444444444444';

function mockOrderWithAgency() {
  return {
    id: ORDER_ID,
    order_no: 'ORD-TEST-001',
    shipper_id: SHIPPER_ID,
    agency_org_id: AGENCY_ORG_ID,
    billing_status: null,
    costs: [
      { id: 'cost-1', cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD', invoice_id: null },
      { id: 'cost-2', cost_type: 'FUEL_SURCHARGE', unit_price: 30, quantity: 1, currency: 'USD', invoice_id: null },
    ],
  };
}

function mockOrderDirect() {
  return {
    id: ORDER_ID,
    order_no: 'ORD-DIRECT-001',
    shipper_id: SHIPPER_ID,
    agency_org_id: null,
    billing_status: null,
    costs: [
      { id: 'cost-10', cost_type: 'BASE_FREIGHT', unit_price: 200, quantity: 1, currency: 'USD', invoice_id: null },
    ],
  };
}

function mockRateSnapshot() {
  return {
    metadata: {
      applied_rule: 'UPS_3TIER',
      platform: {
        currency: 'USD',
        baseSellingPrice: 80,
        fuelSurchargeSellingAmount: 20,
        surgeFeeSellingAmount: 10,
        otherChargesSellingTotal: 5,
      },
    },
  };
}

// ---- Import after mocks ----

import { InvoiceGenerator } from '@/lib/finance/settlement/invoice-generator';

describe('TASK-B-235: admin→agency 인보이스 생성 로직 (Issue #918)', () => {
  let generator: InvoiceGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedInvoices.length = 0;
    generator = new InvoiceGenerator();
  });

  it('TC-918-01: agency_org_id 있는 오더 → 인보이스 2건 (AGENCY_TO_SHIPPER + ADMIN_TO_AGENCY)', async () => {
    const order = mockOrderWithAgency();
    const snapshot = mockRateSnapshot();
    const invoiceMockFactory = createTrackingInvoiceMock();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_invoices') return invoiceMockFactory();
      if (table === 'zen_orders') return createChainableMock(order);
      if (table === 'zen_order_costs') return createChainableMock(null);
      if (table === 'zen_order_rate_snapshots') return createChainableMock(snapshot);
      return createChainableMock(null);
    });

    const result = await generator.generateInvoice(ORDER_ID);

    expect(result.success).toBe(true);
    expect(insertedInvoices.length).toBe(2);

    // 1st insert: shipper invoice
    const shipperInv = insertedInvoices[0];
    expect(shipperInv.invoice_tier).toBe('AGENCY_TO_SHIPPER');
    expect(shipperInv.billed_org_id).toBe(SHIPPER_ID);
    expect(shipperInv.shipper_id).toBe(SHIPPER_ID);

    // 2nd insert: admin→agency invoice
    const agencyInv = insertedInvoices[1];
    expect(agencyInv.invoice_tier).toBe('ADMIN_TO_AGENCY');
    expect(agencyInv.billed_org_id).toBe(AGENCY_ORG_ID);
    expect(agencyInv.shipper_id).toBe(SHIPPER_ID);
  });

  it('TC-918-02: agency_org_id 없는 오더 → 인보이스 1건 (ADMIN_TO_SHIPPER), agencyInvoice null', async () => {
    const order = mockOrderDirect();
    const invoiceMockFactory = createTrackingInvoiceMock();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_invoices') return invoiceMockFactory();
      if (table === 'zen_orders') return createChainableMock(order);
      if (table === 'zen_order_costs') return createChainableMock(null);
      return createChainableMock(null);
    });

    const result = await generator.generateInvoice(ORDER_ID);

    expect(result.success).toBe(true);
    expect(insertedInvoices.length).toBe(1);
    expect(result.agencyInvoice).toBeNull();

    const invoice = insertedInvoices[0];
    expect(invoice.invoice_tier).toBe('ADMIN_TO_SHIPPER');
    expect(invoice.billed_org_id).toBe(SHIPPER_ID);
  });

  it('TC-918-03: admin→agency 금액 = platform.baseSellingPrice + fuel + surge + other', async () => {
    const order = mockOrderWithAgency();
    const snapshot = mockRateSnapshot();
    const invoiceMockFactory = createTrackingInvoiceMock();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_invoices') return invoiceMockFactory();
      if (table === 'zen_orders') return createChainableMock(order);
      if (table === 'zen_order_costs') return createChainableMock(null);
      if (table === 'zen_order_rate_snapshots') return createChainableMock(snapshot);
      return createChainableMock(null);
    });

    const result = await generator.generateInvoice(ORDER_ID);

    expect(result.success).toBe(true);
    expect(insertedInvoices.length).toBe(2);

    // 2nd invoice: platformTotal = 80 + 20 + 10 + 5 = 115
    const agencyInv = insertedInvoices[1];
    expect(agencyInv.total_amount).toBe(115);
    expect(agencyInv.currency).toBe('USD');
    expect(agencyInv.metadata.platform_breakdown).toEqual({
      baseFreight: 80,
      fuelSurcharge: 20,
      surgeFee: 10,
      otherCharges: 5,
    });
  });
});
