import { calculateSettlementAction } from './src/app/actions/finance';

async function test() {
  const orderId = 'd197352a-ba9f-4640-9176-c50c852d8138';
  console.log(`Testing settlement for ${orderId}...`);
  try {
    const result = await calculateSettlementAction(orderId);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
