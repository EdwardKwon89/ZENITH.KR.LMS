/**
 * 공통 에러 응답 헬퍼
 * 프로덕션 환경에서는 스택 트레이스를 제거하고 일반화된 메시지만 반환합니다.
 */

export function formatErrorResponse(
  error: unknown,
  fallbackMessage: string = '서버 오류가 발생했습니다.'
): { message: string; stack?: string } {
  const isDev = process.env.NODE_ENV === 'development';
  const err = error instanceof Error ? error : new Error(String(error));

  return {
    message: isDev ? err.message : fallbackMessage,
    ...(isDev ? { stack: err.stack } : {}),
  };
}
