import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withAction } from '@/lib/actions/wrapper';
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Server Action Wrapper (withAction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data when wrapped function succeeds', async () => {
    const action = vi.fn().mockResolvedValue('success-data');
    const wrapped = withAction(action);

    const result = await wrapped('arg1', 123);

    expect(action).toHaveBeenCalledWith('arg1', 123);
    expect(result).toEqual({ data: 'success-data', error: null });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return error message and log when wrapped function throws an Error', async () => {
    const testError = new Error('Database connection failed');
    const action = vi.fn().mockRejectedValue(testError);
    const wrapped = withAction(action);

    const result = await wrapped();

    expect(result).toEqual({ data: null, error: 'Database connection failed' });
    expect(logger.error).toHaveBeenCalledWith('[Action Error]', testError);
  });

  it('should return default message when wrapped function throws a non-Error value', async () => {
    const action = vi.fn().mockRejectedValue('unexpected string failure');
    const wrapped = withAction(action);

    const result = await wrapped();

    expect(result).toEqual({ data: null, error: '처리 중 오류가 발생했습니다.' });
    expect(logger.error).toHaveBeenCalledWith('[Action Error]', 'unexpected string failure');
  });
});
