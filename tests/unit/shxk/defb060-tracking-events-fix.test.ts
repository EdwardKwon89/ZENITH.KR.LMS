import { describe, it, expect, vi, beforeEach } from 'vitest';

// TASK-B-290 (Issue #1085 / DEF-B-060): storeTrackingEvents() 4건 결함 회귀 테스트.
//
// 실제 storeTrackingEvents() 함수를 import해 mock supabase를 주입하고,
// ① dedup(재폴링 시 중복 삽입 방지) ② event_code/location_country 이벤트별 값(헤더값 미오염)
// ③ zen_tracking_configs last_track_status 갱신 ④ event_desc_ko/en 번역 저장을 검증한다.

vi.mock('server-only', () => ({}));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/utils/supabase/server';
import { storeTrackingEvents, extractCountryCode } from '@/lib/shxk/tracking';

const mockCreateAdminClient = createAdminClient as any;

function makeDb() {
  const inserted: any[] = [];
  const updated: { table: string; data: any; eqKey: string; eqVal: string }[] = [];
  let existingResult: any = { data: [], error: null };

  // select 경로: from().select().eq() → thenable
  const selectChain = {
    select: vi.fn(() => selectChain),
    eq: vi.fn(() => selectChain),
    then: (resolve: any) => Promise.resolve(existingResult).then(resolve),
  };

  // update 경로: from().update(data).eq() → thenable
  const makeUpdateChain = (table: string, data: any) => ({
    update: (d: any) => makeUpdateChain(table, d),
    eq: (key: string, val: string) => {
      updated.push({ table, data, eqKey: key, eqVal: val });
      return { then: (resolve: any) => Promise.resolve({ error: null }).then(resolve) };
    },
    then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
  });

  // insert 경로: from().insert(rows) → thenable
  const makeInsertChain = () => ({
    insert: (rows: any) => {
      inserted.push(...(Array.isArray(rows) ? rows : [rows]));
      return { then: (resolve: any) => Promise.resolve({ error: null }).then(resolve) };
    },
  });

  const db = {
    from: vi.fn((table: string) => {
      // update는 update()로 시작, insert는 insert()로 시작 — select는 select()로 시작
      const updateChain = makeUpdateChain(table, undefined as any);
      const insertChain = makeInsertChain();
      // 첫 메서드 호출을 판별하기 위해 update/insert/select 전부 노출
      return {
        ...selectChain,
        ...updateChain,
        ...insertChain,
      };
    }),
  };
  db.setExisting = (r: any) => { existingResult = r; };

  return { db, inserted, updated };
}

const sampleData = {
  server_hawbcode: '1Z123',
  destination_country: 'CN',
  track_status: 'ND',
  track_status_name: 'In Transit',
  signatory_name: '',
  details: [
    { track_occur_date: '2026-08-11 15:24:27', track_location: 'Incheon,KR', track_description: '离开设施', track_code: '', track_status: '' },
    { track_occur_date: '2026-08-11 15:54:29', track_location: 'SEOUL KOREA', track_description: '抵达设施', track_code: 'AF', track_status: 'AF' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TASK-B-290: storeTrackingEvents 결함 수정 (Issue #1085 / DEF-B-060)', () => {
  it('TC-290-01: dedup — 동일 이벤트(event_date+event_time)가 이미 있으면 재폴링 시 삽입 안 됨', async () => {
    const { db, inserted } = makeDb();
    // 기존에 event_date=2026-08-11, event_time=15:24:27 저장돼 있음
    db.setExisting({ data: [
      { event_date: '2026-08-11', event_time: '15:24:27' },
    ], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    // 15:24:27 이벤트는 dedup → 15:54:29 이벤트만 삽입
    expect(inserted).toHaveLength(1);
    expect(inserted[0].event_time).toBe('2026-08-11 15:54:29');
  });

  it('TC-290-02: dedup — 기존 이벤트 없으면 전부 삽입', async () => {
    const { db, inserted } = makeDb();
    db.setExisting({ data: [], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    expect(inserted).toHaveLength(2);
  });

  it('TC-290-03: event_code는 이벤트별 track_code 값 사용 (헤더 track_status=ND 아님)', async () => {
    const { db, inserted } = makeDb();
    db.setExisting({ data: [], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    // 첫 이벤트: track_code가 '' → event_code ''
    // 두 번째 이벤트: track_code='AF' → event_code='AF'
    expect(inserted[0].event_code).toBe('');
    expect(inserted[1].event_code).toBe('AF');
    // 헤더 track_status('ND')가 전 행에 복사되지 않아야 함
    expect(inserted.every((e) => e.event_code === 'ND')).toBe(false);
  });

  it('TC-290-04: location_country는 track_location에서 파싱 (헤더 destination_country=CN 아님)', async () => {
    const { db, inserted } = makeDb();
    db.setExisting({ data: [], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    // "Incheon,KR" → 'KR'
    expect(inserted[0].location_country).toBe('KR');
    // "SEOUL KOREA" → 콤마 없어 파싱 실패 → null (CN으로 오염 금지)
    expect(inserted[1].location_country).toBeNull();
    // 헤더 destination_country('CN')가 복사되지 않아야 함
    expect(inserted.every((e) => e.location_country === 'CN')).toBe(false);
  });

  it('TC-290-05: zen_tracking_configs last_track_status/last_tracked_at 매 폴링마다 갱신', async () => {
    const { db, updated } = makeDb();
    db.setExisting({ data: [], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    const configUpdate = updated.find((u) => u.table === 'zen_tracking_configs' && u.data.last_track_status);
    expect(configUpdate).toBeDefined();
    expect(configUpdate!.data.last_track_status).toBe('ND');
    expect(configUpdate!.data.last_track_status_name).toBe('In Transit');
    expect(configUpdate!.data.last_tracked_at).toBeTruthy();
    expect(configUpdate!.eqKey).toBe('tracking_no');
    expect(configUpdate!.eqVal).toBe('1Z123');
  });

  it('TC-290-06: event_desc_ko/en 번역 저장 (사전 문구)', async () => {
    const { db, inserted } = makeDb();
    db.setExisting({ data: [], error: null });
    mockCreateAdminClient.mockResolvedValue(db);

    await storeTrackingEvents('1Z123', 'order-1', null, sampleData);

    expect(inserted[0].event_desc_ko).toBe('시설을 출발했습니다'); // 离开设施
    expect(inserted[0].event_desc_en).toBe('Departed from facility');
    expect(inserted[1].event_desc_ko).toBe('시설에 도착했습니다'); // 抵达设施
  });

  it('TC-290-07: extractCountryCode — 콤마 마지막 토큰 2자리 대문자만 채택', () => {
    expect(extractCountryCode('Incheon,KR')).toBe('KR');
    expect(extractCountryCode('Goyang Si,KR')).toBe('KR');
    expect(extractCountryCode('SEOUL KOREA')).toBeNull();
    expect(extractCountryCode(null)).toBeNull();
    expect(extractCountryCode(undefined)).toBeNull();
    expect(extractCountryCode('')).toBeNull();
  });
});
