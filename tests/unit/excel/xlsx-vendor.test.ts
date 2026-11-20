import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * TASK-1157 (Issue #1339, DEF-146 P1) — xlsx 0.20.3 벤더링 회귀
 *
 * 배경: xlsx 0.18.5 는 high 2건(프로토타입 오염 <0.19.3, ReDoS <0.20.2)이며 npm 레지스트리에
 * 수정판이 없다. 0.20.3 tarball 을 `vendor/` 에 커밋하고 `file:` 의존성으로 고정했다.
 *
 * 이 파일이 잠그는 것:
 *   ① 설치된 xlsx 버전이 취약점 수정판(0.20.2) 이상일 것 — 0.18.5 로 되돌리면 즉시 실패
 *   ② vendor tarball 이 `.sha256` 과 일치할 것 — npm audit 이 못 보는 사각지대의 무결성
 *   ③ `read` + `sheet_to_json` **기본 옵션** 동작(날짜 serial·숫자 number·빈 셀·미존재 셀)
 *      — 대량등록 모달(`BulkOrderUploadModal`)이 쓰는 경로. 0.20.0~0.20.1 의 UTC 해석 변경이
 *      이 경로에 영향을 주지 않음을 고정한다(task file R-06 실증 비교 참조).
 */
const ROOT = process.cwd();
const VENDOR_TGZ = join(ROOT, 'vendor', 'xlsx-0.20.3.tgz');
const VENDOR_SHA = join(ROOT, 'vendor', 'xlsx-0.20.3.tgz.sha256');

/** 날짜 셀 2개(B2/B3)를 엑셀 serial + 날짜 서식으로 넣은 2행 픽스처. F2/F3 은 의도적으로 미존재. */
function makeFixtureWorkbook(): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet([
    ['오더번호', '접수일', '수량', '단가', '비고', '메모'],
    ['ORD-001', null, 10, 1234.56, '', 'x'],
    ['ORD-002', null, 0, 0.1, '비고없음', 'y'],
  ]);
  ws['B2'] = { t: 'n', v: 46037, z: 'm/d/yy' };
  ws['B3'] = { t: 'n', v: 46082, z: 'm/d/yy' };
  delete (ws as Record<string, unknown>)['F2'];
  delete (ws as Record<string, unknown>)['F3'];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '오더');
  return wb;
}

describe('TASK-1157: xlsx 0.20.3 벤더링', () => {
  it('TC-1157-01: 설치된 xlsx 가 취약점 수정판(0.20.2) 이상이다', () => {
    expect(XLSX.version).toBe('0.20.3');
    const [major, minor, patch] = XLSX.version.split('.').map(Number);
    expect([major, minor, patch].join('.')).toBe('0.20.3');
    expect(major * 10000 + minor * 100 + patch).toBeGreaterThanOrEqual(0 * 10000 + 20 * 100 + 2);
  });

  it('TC-1157-02: vendor tarball 해시가 .sha256·lockfile integrity 와 일치하고 file: 참조다', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies.xlsx).toBe('file:vendor/xlsx-0.20.3.tgz');

    const bytes = readFileSync(VENDOR_TGZ);
    const actual = createHash('sha256').update(bytes).digest('hex');
    const expected = readFileSync(VENDOR_SHA, 'utf8').trim().split(/\s+/)[0];
    expect(actual).toBe(expected);
    // 0.20.3 공식 CDN tarball 의 SHA-256 (vendor/README.md 와 동일해야 한다)
    expect(actual).toBe('8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8');

    // npm ci 가 검증하는 lockfile integrity(SRI)도 같은 바이트를 가리켜야 한다
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
    const entry = lock.packages['node_modules/xlsx'];
    expect(entry.version).toBe('0.20.3');
    expect(entry.resolved).toBe('file:vendor/xlsx-0.20.3.tgz');
    const sri = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
    expect(entry.integrity).toBe(sri);
  });

  it('TC-1157-03: read + sheet_to_json 기본 — 날짜는 serial(number), 숫자는 number, 미존재 셀은 키 생략', () => {
    const wb = makeFixtureWorkbook();
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = XLSX.read(buf, { type: 'buffer' });

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets['오더']);

    expect(rows).toHaveLength(2);
    // 날짜: 0.20.x 의 기본값은 여전히 raw serial(number) — Date 객체/문자열로 바뀌면 대량등록 파싱이 깨진다
    expect(rows[0]['접수일']).toBe(46037);
    expect(typeof rows[0]['접수일']).toBe('number');
    // 숫자: number 유지
    expect(rows[0]['수량']).toBe(10);
    expect(rows[0]['단가']).toBe(1234.56);
    expect(rows[1]['수량']).toBe(0);
    // 명시적 빈 문자열 셀은 '' 로 남는다
    expect(rows[0]['비고']).toBe('');
    // 아예 없는 셀은 기본 옵션에서 키 자체가 생략된다
    expect(Object.hasOwn(rows[0], '메모')).toBe(false);
    expect(Object.hasOwn(rows[1], '메모')).toBe(false);
  });

  it('TC-1157-04: raw:false — 날짜는 포맷 문자열, 숫자는 문자열로 변환된다', () => {
    const wb = makeFixtureWorkbook();
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = XLSX.read(buf, { type: 'buffer' });

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets['오더'], { raw: false });

    // 0.20.1 "sheet_to_json force UTC for formatted strings" 의 영향권 — 값 자체는 0.18.5 와 동일함을 고정
    expect(rows[0]['접수일']).toBe('1/15/26');
    expect(rows[1]['접수일']).toBe('3/1/26');
    expect(rows[0]['수량']).toBe('10');
    expect(rows[0]['단가']).toBe('1234.56');
  });

  it('TC-1157-05: 다중 시트(오더/패키지/아이템) 이름과 순서가 보존된다', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['오더번호'], ['ORD-001']]), '오더');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['패키지번호'], ['PKG-1']]), '패키지');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['품명'], ['의류']]), '아이템');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = XLSX.read(buf, { type: 'buffer' });

    expect(parsed.SheetNames).toEqual(['오더', '패키지', '아이템']);
    expect(XLSX.utils.sheet_to_json(parsed.Sheets['패키지'])).toEqual([{ 패키지번호: 'PKG-1' }]);
  });
});
