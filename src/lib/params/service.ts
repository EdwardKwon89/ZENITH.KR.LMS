/**
 * ZENITH_LMS: System Parameters Service
 * 캐싱 레이어를 포함한 시스템 파라미터 조회 및 업데이트 로직
 */

import { createClient as createServerClient } from '@/utils/supabase/server';
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

const isTest = process.env.NODE_ENV === 'test';

export type ParamCategory = 'FINANCE' | 'TRACKING' | 'ROUTING' | 'SYSTEM';

export interface SystemParam {
  id: string;
  key: string;
  category: ParamCategory;
  value_text?: string;
  value_numeric?: number;
  value_jsonb?: any;
  description: string;
}

/**
 * 특정 키의 파라미터를 조회합니다. (캐싱 적용)
 */
export const getParam = unstable_cache(
  async (key: string): Promise<SystemParam | null> => {
    // 테스트 환경에서는 전역 mockSupabase를 사용하거나(있다면), 에러 방지를 위해 조건부 처리
    const supabase = isTest ? (global as any).mockSupabase : await createServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('zen_system_params')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`[PARAM_SERVICE] Error fetching param ${key}:`, error.message);
      return null;
    }
    return data;
  },
  ['system-params'], // Query key
  {
    tags: ['system-params'], // Revalidation tag
    revalidate: 3600, // 1 hour fallback
  }
);

/**
 * 카테고리별 파라미터 목록을 조회합니다. (캐싱 적용)
 */
export const getParamsByCategory = unstable_cache(
  async (category: ParamCategory): Promise<SystemParam[]> => {
    const supabase = isTest ? (global as any).mockSupabase : await createServerClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('zen_system_params')
      .select('*')
      .eq('category', category)
      .order('key', { ascending: true });

    if (error) {
      console.error(`[PARAM_SERVICE] Error fetching params for ${category}:`, error.message);
      return [];
    }
    return data || [];
  },
  ['system-params-category'],
  {
    tags: ['system-params'],
    revalidate: 3600,
  }
);

/**
 * 파라미터 값을 업데이트하고 캐시를 무효화합니다.
 */
export async function updateSystemParam(
  key: string,
  payload: Partial<Pick<SystemParam, 'value_text' | 'value_numeric' | 'value_jsonb' | 'description'>>,
  userId: string
) {
  const supabase = await createServerClient();
  
  // 1. 기존 값 조회 (감사 로그용)
  const oldParam = await getParam(key);
  
  // 2. 업데이트 수행
  const { data, error } = await supabase
    .from('zen_system_params')
    .update({
      ...payload,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single();

  if (error) throw new Error(`Param update failed: ${error.message}`);

  // 3. 감사 로그 기록
  const oldValueStr = oldParam ? JSON.stringify({ t: oldParam.value_text, n: oldParam.value_numeric, j: oldParam.value_jsonb }) : null;
  const newValueStr = JSON.stringify({ t: data.value_text, n: data.value_numeric, j: data.value_jsonb });

  await supabase.from('zen_param_audit_log').insert({
    param_key: key,
    old_value: oldValueStr,
    new_value: newValueStr,
    changed_by: userId,
  });

  // 4. 캐시 무효화
  (revalidateTag as any)('system-params');
  
  return data;
}

/**
 * 숫자형 파라미터 값을 편리하게 가져오는 헬퍼
 */
export async function getNumericParam(key: string, defaultValue: number): Promise<number> {
  const param = await getParam(key);
  return param?.value_numeric !== null && param?.value_numeric !== undefined 
    ? Number(param.value_numeric) 
    : defaultValue;
}
