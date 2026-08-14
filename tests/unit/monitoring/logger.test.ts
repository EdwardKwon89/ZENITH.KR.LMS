import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';
import { setRequestContextStore } from '@/lib/logging/request-context';
import { AsyncLocalStorage } from 'node:async_hooks';

describe('Logger Utility', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    setRequestContextStore(new AsyncLocalStorage());
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function parseEntry(spy: any) {
    const line = spy.mock.calls.at(-1)?.[0];
    expect(typeof line).toBe('string');
    return JSON.parse(line);
  }

  it('logger.info should call console.log with structured JSON', () => {
    logger.info('Hello', 'World');
    const entry = parseEntry(logSpy);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Hello');
    expect(entry.data).toEqual(['World']);
  });

  it('logger.warn should call console.warn with [WARN] level', () => {
    logger.warn('Warning message');
    const entry = parseEntry(warnSpy);
    expect(entry.level).toBe('warn');
    expect(entry.message).toBe('Warning message');
  });

  it('logger.error should call console.error with [ERROR] level and serialize Error', () => {
    logger.error('Error message', new Error('Fail'));
    const entry = parseEntry(errorSpy);
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Error message');
    expect(entry.data[0]).toMatchObject({ name: 'Error', message: 'Fail' });
  });

  it('logger.debug should output in non-production environments', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test development env
    (process.env as any).NODE_ENV = 'development';
    logger.debug('Debug message');
    const entry = parseEntry(logSpy);
    expect(entry.level).toBe('debug');
    expect(entry.message).toBe('Debug message');

    // Reset logSpy calls
    logSpy.mockClear();

    // Test production env
    (process.env as any).NODE_ENV = 'production';
    logger.debug('Production debug message');
    expect(logSpy).not.toHaveBeenCalled();

    // Restore env
    (process.env as any).NODE_ENV = originalEnv;
  });
});
