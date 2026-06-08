'use server';

import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

/**
 * [PH5-WAL-01] 현재 사용자의 조직 지갑 잔액을 조회합니다.
 * 지갑이 없을 경우 자동으로 생성(초기화)합니다.
 */
export async function getWalletBalance() {
  const { supabase, profile } = await validateUserAction();
  if (!profile?.org_id) throw new Error("조직 정보가 없습니다.");

  // 1. 지갑 조회
  let { data: wallet, error } = await supabase
    .from('zen_wallet')
    .select('id, balance, currency')
    .eq('org_id', profile.org_id)
    .single();

  // 2. 지갑이 없으면 생성
  if (error && error.code === 'PGRST116') {
    const { data: newWallet, error: createError } = await supabase
      .from('zen_wallet')
      .insert({ org_id: profile.org_id, balance: 0 })
      .select()
      .single();
    
    if (createError) throw new Error(`지갑 생성 실패: ${createError.message}`);
    wallet = newWallet;
  } else if (error) {
    throw new Error(`지갑 조회 실패: ${error.message}`);
  }

  if (!wallet) {
    throw new Error("지갑 정보를 찾거나 생성할 수 없습니다.");
  }

  return {
    success: true,
    balance: Number(wallet.balance),
    currency: wallet.currency,
    walletId: wallet.id
  };
}

/**
 * [PH5-WAL-01] 특정 조직의 지갑에 금액을 충전합니다. (관리자 전용)
 */
export async function topUpWallet(orgId: string, amount: number, description?: string) {
  const { supabase, profile } = await validateAdminAction();
  if (!profile) {
    throw new Error("인증된 사용자 프로필을 찾을 수 없습니다.");
  }

  // 1. 지갑 존재 확인 (없으면 생성)
  let { data: wallet } = await supabase
    .from('zen_wallet')
    .select('id, balance')
    .eq('org_id', orgId)
    .single();

  if (!wallet) {
    const { data: newWallet, error: createError } = await supabase
      .from('zen_wallet')
      .insert({ org_id: orgId, balance: 0 })
      .select()
      .single();
    if (createError) throw new Error(`지갑 생성 실패: ${createError.message}`);
    wallet = newWallet;
  }

  if (!wallet) throw new Error("지갑 정보를 가져올 수 없습니다.");
  const newBalance = Number(wallet.balance) + amount;

  // 2. 트랜잭션 처리 (잔액 업데이트 + 이력 생성)
  // Note: Supabase RPC를 사용하는 것이 좋으나, 여기서는 개별 업데이트로 처리 (성능보다는 가독성)
  const { error: updateError } = await supabase
    .from('zen_wallet')
    .update({ balance: newBalance })
    .eq('id', wallet.id);

  if (updateError) throw new Error(`잔액 업데이트 실패: ${updateError.message}`);

  const { error: logError } = await supabase
    .from('zen_wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      type: 'TOP_UP',
      amount: amount,
      status: 'COMPLETED',
      description: description || 'Admin Top-up',
      created_by: profile.id
    });

  if (logError) {
    // 롤백 (단순 구현)
    await supabase.from('zen_wallet').update({ balance: wallet.balance }).eq('id', wallet.id);
    throw new Error(`거래 이력 생성 실패: ${logError.message}`);
  }

  revalidatePath('/mypage');
  return { success: true, newBalance };
}

/**
 * [PH5-WAL-01] 환불을 요청합니다. (PENDING 상태 생성)
 */
export async function requestRefund(amount: number, description?: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) {
    throw new Error("인증된 사용자 프로필을 찾을 수 없습니다.");
  }
  if (!profile?.org_id) throw new Error("조직 정보가 없습니다.");

  // 1. 지갑 확인
  const { data: wallet, error: walletError } = await supabase
    .from('zen_wallet')
    .select('id, balance')
    .eq('org_id', profile.org_id)
    .single();

  if (walletError || !wallet) throw new Error("지갑을 찾을 수 없습니다.");
  if (Number(wallet.balance) < amount) throw new Error("잔액이 부족합니다.");

  // 2. PENDING 트랜잭션 생성 (실제 잔액은 승인 시 차감)
  const { data: tx, error: txError } = await supabase
    .from('zen_wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      type: 'REFUND_REQUEST',
      amount: amount,
      status: 'PENDING',
      description: description,
      created_by: profile.id
    })
    .select()
    .single();

  if (txError) throw new Error(`환불 요청 실패: ${txError.message}`);

  revalidatePath('/mypage');
  return { success: true, transactionId: tx.id };
}

/**
 * [PH5-WAL-03] 지갑 잔액으로 인보이스를 결제합니다.
 */
export async function payInvoiceFromWallet(invoiceId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) {
    throw new Error("인증된 사용자 프로필을 찾을 수 없습니다.");
  }
  
  // 1. 인보이스 정보 조회
  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .select('invoice_no, total_amount, shipper_id, status')
    .eq('id', invoiceId)
    .single();

  if (invError || !invoice) throw new Error("인보이스를 찾을 수 없습니다.");
  if (invoice.status === 'PAID') throw new Error("이미 결제된 인보이스입니다.");

  // 2. RPC 호출로 원자적 트랜잭션 수행
  const { data: newBalance, error: rpcError } = await supabase.rpc('pay_invoice_from_wallet_atomic', {
    p_invoice_id: invoiceId,
    p_profile_id: profile.id
  });

  if (rpcError) {
    if (rpcError.message.includes('INSUFFICIENT_BALANCE')) {
      return { success: false, error: 'INSUFFICIENT_BALANCE', message: '지갑 잔액이 부족합니다.' };
    }
    throw new Error(rpcError.message);
  }

  revalidatePath('/finance/invoices');
  revalidatePath('/mypage');

  return { success: true, invoice_no: invoice.invoice_no, remainingBalance: Number(newBalance) };
}

/**
 * [PH5-WAL-04] 최근 거래 내역을 조회합니다.
 */
export async function getWalletTransactions(limit = 20, offset = 0) {
  const { supabase, profile } = await validateUserAction();
  if (!profile?.org_id) throw new Error("조직 정보가 없습니다.");

  const { data, error } = await supabase
    .from('zen_wallet_transactions')
    .select('id, wallet_id, type, amount, balance_after, status, description, created_at, created_by_profile:created_by(email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`거래 내역 조회 실패: ${error.message}`);

  return data;
}
