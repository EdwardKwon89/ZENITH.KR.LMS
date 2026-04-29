'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { CustomsStatus, CustomsDeclaration } from '@/lib/customs/types';
import { ManualAdapter } from '@/lib/customs/manual-adapter';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';

/**
 * 1. 통관 신고 생성 (Admin 전용)
 */
export async function createDeclaration(payload: {
  orderId: string;
  cargoDescription: string;
  declaredValue: number;
  currencyCode: string;
}) {
  const { supabase } = await validateAdminAction();

  const { data, error } = await supabase
    .from('customs_declarations')
    .insert([
      {
        order_id: payload.orderId,
        cargo_description: payload.cargoDescription,
        declared_value: payload.declaredValue,
        currency_code: payload.currencyCode,
        status: 'PENDING',
        adapter_type: 'MANUAL',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating declaration:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/customs');
  return { success: true, id: data.id };
}

/**
 * 2. 통관 신고 목록 조회 (Admin: 전체 / User: 본인 오더)
 */
export async function getDeclarations(params?: {
  status?: CustomsStatus;
  orderId?: string;
  limit?: number;
  offset?: number;
}) {
  const { supabase, profile } = params?.orderId 
    ? await validateUserAction() 
    : await validateAdminAction();

  let query = supabase
    .from('customs_declarations')
    .select(`
      *,
      order:orders (
        order_no,
        shipper:profiles!shipper_id (
          full_name
        )
      )
    `, { count: 'exact' });

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  if (params?.orderId) {
    query = query.eq('order_id', params.orderId);
  }

  const limit = params?.limit ?? 10;
  const offset = params?.offset ?? 0;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching declarations:', error);
    return { declarations: [], total: 0 };
  }

  // 데이터 가공 (Flattening)
  const declarations: CustomsDeclaration[] = data.map((item: any) => ({
    ...item,
    order_no: item.order?.order_no,
    shipper_name: item.order?.shipper?.full_name,
  }));

  return { declarations, total: count ?? 0 };
}

/**
 * 3. 상태 갱신 (Admin 전용)
 */
export async function updateDeclarationStatus(payload: {
  id: string;
  status: CustomsStatus;
  declarationNo?: string;
  adminNote?: string;
}) {
  const { supabase } = await validateAdminAction();

  const updatePayload: any = {
    status: payload.status,
    updated_at: new Date().toISOString(),
  };

  if (payload.declarationNo) updatePayload.declaration_no = payload.declarationNo;
  if (payload.adminNote) updatePayload.admin_note = payload.adminNote;

  // 승인 또는 반려 시 완료일 설정
  if (payload.status === 'APPROVED' || payload.status === 'REJECTED') {
    updatePayload.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('customs_declarations')
    .update(updatePayload)
    .eq('id', payload.id);

  if (error) {
    console.error('Error updating declaration status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/customs');
  revalidatePath('/mypage/customs');
  return { success: true };
}

/**
 * 4. 신고 제출 (Admin 전용) - Adapter 호출
 */
export async function submitDeclaration(id: string) {
  const { supabase } = await validateAdminAction();

  // 1. 현재 데이터 조회
  const { data: declaration, error: fetchError } = await supabase
    .from('customs_declarations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !declaration) {
    return { success: false, error: 'Declaration not found' };
  }

  // 2. 어댑터 호출 (현재는 ManualAdapter 고정)
  const adapter = new ManualAdapter();
  const result = await adapter.submitDeclaration(declaration);

  if (!result.success) {
    return { success: false, error: 'Adapter submission failed' };
  }

  // 3. 상태 업데이트 (SUBMITTED)
  const { error: updateError } = await supabase
    .from('customs_declarations')
    .update({
      status: 'SUBMITTED',
      declaration_no: result.declarationNo,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating status after submission:', updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/customs');
  return { success: true };
}
