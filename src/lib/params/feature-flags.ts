/**
 * ZENITH_LMS: Feature Flags Service
 */

import { createClient } from '@/utils/supabase/server';
import { unstable_cache } from 'next/cache';

const isTest = process.env.NODE_ENV === 'test';

/**
 * 특정 기능의 활성화 여부를 확인합니다.
 * @param key 기능 키
 * @param orgId 조직 ID (선택 사항, 특정 조직에만 켜진 기능 확인용)
 */
export const isFeatureEnabled = unstable_cache(
  async (key: string, orgId?: string): Promise<boolean> => {
    const supabase = isTest ? (global as any).mockSupabase : await createClient();
    if (!supabase) return false;
    
    // 1. 전역 설정 확인 (org_id IS NULL)
    const { data: globalFlag } = await supabase
      .from('zen_feature_flags')
      .select('is_enabled')
      .eq('key', key)
      .is('org_id', null)
      .single();

    if (globalFlag?.is_enabled) return true;

    // 2. 조직별 설정 확인
    if (orgId) {
      const { data: orgFlag } = await supabase
        .from('zen_feature_flags')
        .select('is_enabled')
        .eq('key', key)
        .eq('org_id', orgId)
        .single();
      
      return orgFlag?.is_enabled || false;
    }

    return false;
  },
  ['feature-flags'],
  {
    tags: ['feature-flags'],
    revalidate: 600, // 10 minutes
  }
);
