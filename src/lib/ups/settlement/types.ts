export interface SettlementMoneyInput {
  amount: number;
  currency?: string;
}

export interface SettlementChargeInput {
  name: string;
  amount: number;
  currency?: string;
}

export interface UpsSettlementInput {
  orderId: string;
  actualWeightKg?: number;
  actualLengthCm?: number;
  actualWidthCm?: number;
  actualHeightCm?: number;
  /** 기본운임(원가). 통화 미지정 시 KRW. */
  baseFreight?: SettlementMoneyInput;
  fuelSurcharge?: SettlementMoneyInput;
  surgeFee?: SettlementMoneyInput;
  otherCharges?: SettlementChargeInput[];
  upsInvoiceNo?: string;
  upsInvoiceDate?: string;
  notes?: string;
}

export interface SettlementCostSummary {
  releasedDate: string;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
  totalCostKrw: number;
  baseCostKrw: number;
  fuelCostKrw: number;
  surgeCostKrw: number;
  otherChargesCostKrw: number;
  baseRawKrw: number;
  surchargeRate: number;
  surchargeAmountKrw: number;
  appliedExchangeRates: Record<string, number>;
}

export interface SettlementRunTierAmount {
  tier: 'ADMIN_TO_AGENCY' | 'SHIPPER';
  base_freight: number;
  fuel_surcharge: number;
  surge_fee: number;
  other_charges: number;
  freight_adjustment: number;
  settlement_charges_total: number;
  line_total: number;
}

export interface SettlementRunCharge {
  tier: 'ADMIN_TO_AGENCY' | 'SHIPPER';
  line_no: number;
  name: string;
  amount: number;
}

export interface UpsSettlementPreview {
  releasedDate: string;
  chargeWeightKg: number;
  cost: SettlementCostSummary;
  amounts: SettlementRunTierAmount[];
  charges: SettlementRunCharge[];
}

export interface UpsSettlementActionResult {
  success: boolean;
  error?: string;
  preview?: UpsSettlementPreview;
  runId?: string;
  version?: number;
}

export class SettlementCurrencyError extends Error {
  constructor(currency: string) {
    super(`MISSING_RATE:${currency}`);
    this.name = 'SettlementCurrencyError';
  }
}

/** 상품/도착국 등 매출 estimate에 필요한 입력을 확정할 수 없을 때. */
export class SettlementEstimateError extends Error {
  readonly reason: 'PRODUCT_NOT_FOUND' | 'DEST_COUNTRY_MISSING';

  constructor(reason: 'PRODUCT_NOT_FOUND' | 'DEST_COUNTRY_MISSING') {
    super(reason);
    this.name = 'SettlementEstimateError';
    this.reason = reason;
  }
}
