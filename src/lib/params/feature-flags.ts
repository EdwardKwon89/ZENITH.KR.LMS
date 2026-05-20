/**
 * ZENITH_LMS: Feature Flags Service
 */

import { createClient } from '@/utils/supabase/server';
import { unstable_cache } from 'next/cache';

const isTest = process.env.NODE_ENV === 'test';

/**
 * 특정 기능의 활성화 여부를 확인합니다.
 * unstable_cache로 결과를 60초간 캐싱하여 DB 부하를 줄입니다.
 * @param key 기능 키
 * @param orgId 조직 ID (선택 사항, 특정 조직에만 켜진 기능 확인용)
 */
export async function isFeatureEnabled(key: string, orgId?: string): Promise<boolean> {
  const supabase = isTest ? (global as any).mockSupabase : await createClient();
  if (!supabase) return false;

  const getCachedFlag = unstable_cache(
    async (flagKey: string, flagOrgId?: string) => {
      const { data: globalFlag } = await supabase
        .from('zen_feature_flags')
        .select('is_enabled')
        .eq('key', flagKey)
        .is('org_id', null)
        .single();

      if (globalFlag?.is_enabled) return true;

      if (flagOrgId) {
        const { data: orgFlag } = await supabase
          .from('zen_feature_flags')
          .select('is_enabled')
          .eq('key', flagKey)
          .eq('org_id', flagOrgId)
          .single();
        return orgFlag?.is_enabled || false;
      }

      return false;
    },
    ['feature-flags'],
    { revalidate: 60 },
  );

  return getCachedFlag(key, orgId);
}
