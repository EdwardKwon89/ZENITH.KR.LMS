import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * BaseRepository: Supabase 클라이언트 의존성 주입 기반 공통 DB 접근 추상 클래스
 *
 * 설계 원칙:
 * - Repository는 DB 접근만 담당 (권한 검증은 action 계층 유지)
 * - Supabase 클라이언트는 action에서 validateUserAction() 등으로 획득 후 주입
 * - React.cache() 기반 클라이언트 재사용은 action 계층에서 담당 (IMP-059 계승)
 */
export abstract class BaseRepository {
  protected readonly db: SupabaseClient<Database>;

  constructor(db: SupabaseClient<Database>) {
    this.db = db;
  }
}
