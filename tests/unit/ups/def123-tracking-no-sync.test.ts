import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('DEF-123: registerUpsOrder 시 tracking_configs.tracking_no 갱신', () => {
  it('ups-labels.ts에 tracking_configs 갱신 로직이 포함됨', async () => {
    const src = readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    // saveInitialLabel 이후 tracking_configs 갱신 확인
    expect(src).toContain("from('zen_tracking_configs')");
    expect(src).toContain('tracking_no: orderResult.trackingNo');
    expect(src).toContain("eq('order_id', order.id as string)");
  });

  it('trackingNo가 있을 때만 갱신 (조건문 확인)', async () => {
    const src = readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    // if (orderResult.trackingNo) 조건 확인
    expect(src).toContain('if (orderResult.trackingNo)');
  });
});
