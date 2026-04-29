import { ICustomsAdapter, CustomsDeclaration, CustomsStatus } from './types';
import { createClient } from '@/utils/supabase/server';

export class ManualAdapter implements ICustomsAdapter {
  /**
   * 신고 제출 (수동 처리 모드)
   * 실제 API 호출 없이 상태를 SUBMITTED로 전환할 준비가 되었음을 알림
   */
  async submitDeclaration(declaration: CustomsDeclaration): Promise<{ success: boolean; declarationNo?: string }> {
    // 수동 어댑터에서는 실제 제출 로직 없이 성공만 반환
    // 이후 관리자가 수동으로 신고번호를 입력하고 승인 처리함
    return { 
      success: true, 
      declarationNo: declaration.declaration_no || `MANUAL-${Date.now()}` 
    };
  }

  /**
   * 상태 조회
   * DB의 현재 상태를 그대로 반환
   */
  async getStatus(declarationNo: string): Promise<CustomsStatus> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customs_declarations')
      .select('status')
      .eq('declaration_no', declarationNo)
      .single();

    if (error || !data) {
      return 'PENDING';
    }

    return data.status as CustomsStatus;
  }
}
