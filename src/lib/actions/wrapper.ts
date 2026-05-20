import { logger } from '@/lib/logger';

export type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

/**
 * Server Actions용 에러 처리 및 표준 응답 고차 함수 (HOF)
 */
export function withAction<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args) => {
    try {
      const data = await fn(...args);
      return { data, error: null };
    } catch (err: any) {
      logger.error('[Action Error]', err);
      const errorMessage = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
      return { data: null, error: errorMessage };
    }
  };
}
