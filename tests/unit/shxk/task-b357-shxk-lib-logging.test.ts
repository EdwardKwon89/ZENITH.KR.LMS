import { describe, it, expect, vi, beforeEach } from 'vitest';

// TASK-B-357 (Issue #1351, 관련 #1182): lib/shxk order·tracking 실패 분기 logger 도입 회귀 테스트.
//
// (a) success!==1 업무 실패 → logger.warn (함수·SHXK method·success·응답 원문 message·식별자)
// (b) 예상 밖 빈 데이터/DB 실패/예외 → logger.error (에러 객체 동반)
// (c) 반환값 불변 — 기존 형태 그대로 (동작 불변 증명)
// (d) 성공 경로에서는 logger.warn/error 미호출
// (e) 인증키·개인정보(수취인명/전화/주소)가 로그 인자에 미포함

const mockCallShxk = vi.hoisted(() => vi.fn());
const mockCreateAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/shxk/client', () => ({ callShxk: mockCallShxk }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: mockCreateAdminClient }));
vi.mock('@/lib/shxk/translate', () => ({
  translateShxkText: vi.fn(() => ({ ko: 'ko 설명', en: 'en description' })),
}));

import { createorder, gettrackingnumber, getnewlabel, removeorder } from '@/lib/shxk/order';
import { pollTracking, storeTrackingEvents, type GetTrackData } from '@/lib/shxk/tracking';
import { logger } from '@/lib/logger';

/** storeTrackingEvents용 stage 인식 supabase 체인 mock (select→insert→update 순서 구분) */
function makeTrackingDb(opts: { selectError?: any; insertError?: any; updateError?: any } = {}) {
  const state = { stage: 'select' as 'select' | 'insert' | 'update' };
  const chain: any = {};
  chain.select = () => { state.stage = 'select'; return chain; };
  chain.insert = (rows: unknown) => { state.stage = 'insert'; chain._rows = rows; return chain; };
  chain.update = () => { state.stage = 'update'; return chain; };
  chain.eq = () => chain;
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    if (state.stage === 'select') {
      return Promise.resolve({ data: [], error: opts.selectError ?? null }).then(resolve, reject);
    }
    if (state.stage === 'insert') {
      return Promise.resolve({ data: null, error: opts.insertError ?? null }).then(resolve, reject);
    }
    return Promise.resolve({ data: null, error: opts.updateError ?? null }).then(resolve, reject);
  };
  return { from: vi.fn(() => chain) };
}

const trackData = (status = 'IN_TRANSIT'): GetTrackData => ({
  server_hawbcode: 'HAWB1',
  destination_country: 'US',
  track_status: status,
  track_status_name: 'In Transit',
  signatory_name: '',
  details: [
    { track_occur_date: '2026-01-01 10:00:00', track_location: 'SEOUL, KOREA', track_description: 'Departed', track_code: 'D1' },
  ],
});

describe('TC-357-1: (a) success!==1 → logger.warn (함수·method·원문 message·식별자)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createorder 실패 → warn 인자 정확 (enmessage 우선)', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'Create failed EN', cnmessage: '创建失败', data: null });
    const r = await createorder({ reference_no: 'REF-1', shipping_method: 'WWE' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('[SHXK] createorder 업무 실패', {
      method: 'createorder', success: 0, message: 'Create failed EN', reference_no: 'REF-1',
    });
    expect(r.success).toBe(0);
  });

  it('gettrackingnumber 실패 → enmessage 없으면 cnmessage(중문) 폴백', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, cnmessage: '追踪失败', data: null });
    await gettrackingnumber('ORD-77');
    expect(logger.warn).toHaveBeenCalledWith('[SHXK] gettrackingnumber 업무 실패', {
      method: 'gettrackingnumber', success: 0, message: '追踪失败', order_id: 'ORD-77',
    });
  });

  it('getnewlabel 실패 → reference_nos 배열로 식별', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'Label failed', data: null });
    await getnewlabel({ appKey: 'K' }, [{ reference_no: 'REF-A' }, { reference_no: 'REF-B' }]);
    expect(logger.warn).toHaveBeenCalledWith('[SHXK] getnewlabel 업무 실패', {
      method: 'getnewlabel', success: 0, message: 'Label failed', reference_nos: ['REF-A', 'REF-B'],
    });
  });

  it('removeorder 실패 → warn', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'Remove failed' });
    await removeorder('REF-9');
    expect(logger.warn).toHaveBeenCalledWith('[SHXK] removeorder 업무 실패', {
      method: 'removeorder', success: 0, message: 'Remove failed', reference_no: 'REF-9',
    });
  });

  it('pollTracking 실패 → gettrack method + tracking_number로 warn', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'Track not found' });
    const r = await pollTracking('1Z999');
    expect(r).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('[SHXK] pollTracking 업무 실패', {
      method: 'gettrack', success: 0, message: 'Track not found', tracking_number: '1Z999',
    });
  });
});

describe('TC-357-2: (b) 빈 데이터/DB 실패/예외 → logger.error (객체 동반)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createorder success:1 인데 data 없음 → error (warn 미호출)', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, enmessage: '', data: null });
    const r = await createorder({ reference_no: 'REF-2', shipping_method: 'WWE' });
    expect(logger.error).toHaveBeenCalledWith('[SHXK] createorder 성공 응답인데 data 없음',
      expect.objectContaining({ method: 'createorder', reference_no: 'REF-2' }));
    expect(logger.warn).not.toHaveBeenCalled();
    expect(r.data).toBeNull();
  });

  it('getnewlabel success:1 인데 라벨 data 없음 → error', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, data: null });
    const r = await getnewlabel({ appKey: 'K' }, [{ reference_no: 'REF-C' }]);
    expect(logger.error).toHaveBeenCalledWith('[SHXK] getnewlabel 성공 응답인데 라벨 data 없음',
      expect.objectContaining({ method: 'getnewlabel', reference_nos: ['REF-C'] }));
    expect(r.data).toBeNull();
  });

  it('pollTracking success:1 이나 빈 배열 → error + null 반환', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, data: [] });
    const r = await pollTracking('1Z888');
    expect(r).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('[SHXK] pollTracking 성공 응답인데 빈 데이터',
      expect.objectContaining({ method: 'gettrack', tracking_number: '1Z888' }));
  });

  it('assertData: 비객체 data → Error 객체와 함께 logger.error 후 기존 message로 throw (동작 불변)', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, data: 'not-an-object' });
    await expect(createorder({ reference_no: 'REF-3', shipping_method: 'WWE' }))
      .rejects.toThrow('shxk API returned empty data');
    expect(logger.error).toHaveBeenCalledWith('[SHXK] 응답 data 형식 오류',
      expect.objectContaining({ message: 'shxk API returned empty data' }));
  });

  it('storeTrackingEvents select 실패 → error 로그 후에도 예외 없이 진행 (동작 불변)', async () => {
    mockCreateAdminClient.mockResolvedValue(makeTrackingDb({ selectError: { message: 'SELECT_FAIL', code: 'PGRST' } }));
    await expect(
      storeTrackingEvents('1Z777', 'order-1', null, trackData())
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith('[SHXK] storeTrackingEvents 기존 이벤트 조회 실패',
      expect.objectContaining({
        tracking_number: '1Z777',
        order_id: 'order-1',
        err: expect.objectContaining({ message: 'SELECT_FAIL' }),
      }));
  });

  it('storeTrackingEvents insert 실패 → error 로그 (count 포함)', async () => {
    mockCreateAdminClient.mockResolvedValue(makeTrackingDb({ insertError: { message: 'INSERT_FAIL' } }));
    await storeTrackingEvents('1Z666', 'order-2', null, trackData());
    expect(logger.error).toHaveBeenCalledWith('[SHXK] storeTrackingEvents 이벤트 insert 실패',
      expect.objectContaining({
        tracking_number: '1Z666', order_id: 'order-2', count: 1,
        err: expect.objectContaining({ message: 'INSERT_FAIL' }),
      }));
  });

  it('storeTrackingEvents 상태 갱신 실패 → error 로그', async () => {
    mockCreateAdminClient.mockResolvedValue(makeTrackingDb({ updateError: { message: 'UPDATE_FAIL' } }));
    await storeTrackingEvents('1Z555', 'order-3', null, trackData());
    expect(logger.error).toHaveBeenCalledWith('[SHXK] storeTrackingEvents 상태 갱신 실패',
      expect.objectContaining({
        tracking_number: '1Z555',
        err: expect.objectContaining({ message: 'UPDATE_FAIL' }),
      }));
  });
});

describe('TC-357-3: (c) 반환값 불변 (동작 불변 증명)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createorder 성공 → {success, data, message} 형태 그대로 (toEqual)', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, enmessage: 'OK', data: { order_id: 'O-1', refrence_no: 'REF-1' } });
    const r = await createorder({ reference_no: 'REF-1', shipping_method: 'WWE' });
    expect(r).toEqual({ success: 1, data: { order_id: 'O-1', refrence_no: 'REF-1' }, message: 'OK' });
  });

  it('createorder 실패 → {success:0, data:null, message} (원문 메시지 반환 불변)', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'Fail EN', data: null });
    const r = await createorder({ reference_no: 'REF-1', shipping_method: 'WWE' });
    expect(r).toEqual({ success: 0, data: null, message: 'Fail EN' });
  });

  it('getnewlabel 성공 → lable_* 매핑 형태 불변 (toEqual)', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, data: { lable_file: 'base64data', lable_file_type: 'PDF' } });
    const r = await getnewlabel({ appKey: 'K' }, [{ reference_no: 'REF-D' }]);
    expect(r).toEqual({
      success: 1,
      data: [{ lable_file: 'base64data', lable_file_type: 'PDF', lable_content_type: undefined }],
      message: '',
    });
  });

  it('removeorder → {success, message} — data 키 자체가 없음 (not.toHaveProperty)', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, enmessage: 'done' });
    const r = await removeorder('REF-1');
    expect(r).toEqual({ success: 1, message: 'done' });
    expect(r).not.toHaveProperty('data');
  });

  it('pollTracking 성공 → list[0] 그대로 / 실패·빈데이터 → null', async () => {
    const data = trackData('DL');
    mockCallShxk.mockResolvedValue({ success: 1, data: [data] });
    expect(await pollTracking('1Z111')).toEqual(data);

    mockCallShxk.mockResolvedValue({ success: 0 });
    expect(await pollTracking('1Z111')).toBeNull();

    mockCallShxk.mockResolvedValue({ success: 1, data: [] });
    expect(await pollTracking('1Z111')).toBeNull();
  });

  it('gettrackingnumber 성공 → {success, data, message} 불변', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, enmessage: 'ok', data: { tracking_number: 'TRK-1' } });
    const r = await gettrackingnumber('ORD-1');
    expect(r).toEqual({ success: 1, data: { tracking_number: 'TRK-1' }, message: 'ok' });
  });
});

describe('TC-357-4: (d) 성공 경로에서는 logger.warn/error 미호출', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createorder 성공(data 있음) → warn·error 0회', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, enmessage: 'OK', data: { order_id: 'O-9', refrence_no: 'R' } });
    await createorder({ reference_no: 'R', shipping_method: 'WWE' });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('pollTracking 성공(데이터 있음) → warn·error 0회', async () => {
    mockCallShxk.mockResolvedValue({ success: 1, data: [trackData()] });
    await pollTracking('1Z000');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('storeTrackingEvents 성공 → warn·error 0회', async () => {
    mockCreateAdminClient.mockResolvedValue(makeTrackingDb());
    await storeTrackingEvents('1Z001', 'order-ok', null, trackData());
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('TC-357-5: (e) 로그 인자에 인증키·개인정보 미포함', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createorder 실패 시 로그에 params 전체(consignee·shipper 개인정보)가 새지 않는다', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'fail', data: null });
    await createorder({
      reference_no: 'REF-SENSITIVE',
      shipping_method: 'WWE',
      shipper: { shipper_name: '홍길동PRIVATE', shipper_telephone: '01099991111' },
      consignee: { consignee_name: '수취인PRIVATE', consignee_telephone: '01022223333', consignee_address: '서울 강남구 비밀주소123' },
    });

    const allLogged = [...logger.warn.mock.calls, ...logger.error.mock.calls]
      .map((c) => JSON.stringify(c)).join(' ');
    expect(allLogged).not.toContain('홍길동PRIVATE');
    expect(allLogged).not.toContain('수취인PRIVATE');
    expect(allLogged).not.toContain('01099991111');
    expect(allLogged).not.toContain('01022223333');
    expect(allLogged).not.toContain('비밀주소123');
    expect(allLogged).not.toContain('APP_KEY');
    expect(allLogged).not.toContain('APP_TOKEN');
    // 식별자(reference_no)는 진단에 필요하므로 로그에 남는 것이 정상
    expect(allLogged).toContain('REF-SENSITIVE');
  });

  it('getnewlabel 실패 시 configInfo(인증정보 후보)가 로그에 새지 않는다', async () => {
    mockCallShxk.mockResolvedValue({ success: 0, enmessage: 'fail', data: null });
    await getnewlabel({ appKey: 'SECRET_APP_KEY_XYZ', appToken: 'SECRET_TOKEN_XYZ' }, [{ reference_no: 'REF-L' }]);
    const allLogged = JSON.stringify([...logger.warn.mock.calls, ...logger.error.mock.calls]);
    expect(allLogged).not.toContain('SECRET_APP_KEY_XYZ');
    expect(allLogged).not.toContain('SECRET_TOKEN_XYZ');
    expect(allLogged).toContain('REF-L');
  });
});
