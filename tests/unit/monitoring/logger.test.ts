import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

describe('Logger Utility', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info should call console.log with [INFO] prefix', () => {
    logger.info('Hello', 'World');
    expect(logSpy).toHaveBeenCalledWith('[INFO]', 'Hello', 'World');
  });

  it('logger.warn should call console.warn with [WARN] prefix', () => {
    logger.warn('Warning message');
    expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'Warning message');
  });

  it('logger.error should call console.error with [ERROR] prefix', () => {
    logger.error('Error message', new Error('Fail'));
    expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'Error message', expect.any(Error));
  });

  it('logger.debug should output [DEBUG] log in non-production environments', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test development env
    process.env.NODE_ENV = 'development';
    logger.debug('Debug message');
    expect(logSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug message');

    // Reset logSpy calls
    logSpy.mockClear();

    // Test production env
    process.env.NODE_ENV = 'production';
    logger.debug('Production debug message');
    expect(logSpy).not.toHaveBeenCalled();

    // Restore env
    process.env.NODE_ENV = originalEnv;
  });
});
