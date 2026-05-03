
import { createAdminClient } from './src/utils/supabase/server.ts';
import { SettlementEngine } from './src/lib/finance/settlement.ts';

async function debug() {
  const orderId = 'd197352a-ba9f-4640-9176-c50c852d8138';
  console.log(`Debugging settlement for order: ${orderId}`);
  
  const engine = new SettlementEngine();
  const result = await engine.calculateOrderCosts(orderId);
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

debug().catch(console.error);
