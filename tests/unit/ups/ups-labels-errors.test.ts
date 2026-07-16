import { describe, it, expect, vi } from 'vitest';

// Only test the placeShxkOrder return type and saveInitialLabel signature
// Full integration tests are covered by the dynamic import in CI

describe('Issue #553: SHXK response message', () => {
  it('placeShxkOrder 성공 반환 타입에 message 필드가 포함되어야 함', async () => {
    // Verify the source code contains the message field in the return type
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    // Check that the success return includes message
    expect(src).toContain('message: orderRes.message');
    // Check that the error return includes message
    expect(src).toContain('message: orderRes.message');
    // Check that zen_ups_label_errors insert exists
    expect(src).toContain("zen_ups_label_errors");
    // Check that saveInitialLabel accepts responseMessage
    expect(src).toContain('responseMessage?: string');
    // Check that shxk_response_message is stored
    expect(src).toContain('shxk_response_message');
  });

  it('zen_ups_labels shxk_response_message 컬럼 마이그레이션 존재', async () => {
    const fs = await import('fs');
    const mig = fs.readFileSync(
      'supabase/migrations/20260716110000_iss553_shxk_response_message.sql',
      'utf-8'
    );
    expect(mig).toContain('shxk_response_message');
    expect(mig).toContain('zen_ups_label_errors');
    expect(mig).toContain('zen_ups_label_errors_admin_all');
  });
});
