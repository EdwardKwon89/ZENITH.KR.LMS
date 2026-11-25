// TASK-B-385 (Issue #1513) — L2 재유입 점검 단위 테스트 (설계 PR #1515 §4 단위 테스트 ②)
//  · 대상 범위(..._Result 폴더류 + screenshots) × 원본 증적 확장자 필터가 의도대로 동작함을 확인
//  · git status 파싱이 인용 이스케이프·이름 바꿈을 처리함을 확인 (명령 형태·건수 한정 보고의 근거)
import { describe, it, expect } from 'vitest';
import { filterEvidencePaths, parsePorcelainLine, changedFiles } from '../../scripts/check-evidence-escape.mjs';

describe('check-evidence-escape (L2) 필터', () => {
  it('대상 범위 + 원본 증적 확장자만 통과', () => {
    const hits = filterEvidencePaths([
      'docs/99_Manual/E2E_B371_Result/shot.png', // 대상+확장자 → 통과
      'docs/99_Manual/UAT_17_Result/log.json', // 통과
      'docs/99_Manual/TASK-170_Result/report.xlsx', // 통과
      'docs/99_Manual/AUDIT_S1_Result/finding.txt', // 통과
      'docs/99_Manual/FEAT_RATES_Result/demo.webm', // 통과
      'tests/e2e/screenshots/probe.png', // 편입 범위 → 통과
      'docs/99_Manual/E2E_B371_Result/README.md', // 요약 .md → 제외
      'docs/99_Manual/assets/probe.png', // _Result 폴더류 밖(기타 폴더) → 제외
      'tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts', // 대상 밖 코드 → 제외
      'docs/08_Self_Audit/Regression_Results/x.json', // R-13 허용 범위 → 제외
    ]);
    expect(hits).toEqual([
      'docs/99_Manual/E2E_B371_Result/shot.png',
      'docs/99_Manual/UAT_17_Result/log.json',
      'docs/99_Manual/TASK-170_Result/report.xlsx',
      'docs/99_Manual/AUDIT_S1_Result/finding.txt',
      'docs/99_Manual/FEAT_RATES_Result/demo.webm',
      'tests/e2e/screenshots/probe.png',
    ]);
  });

  it('하위 디렉토리(날짜 폴더 등)도 대상으로 잡는다', () => {
    const hits = filterEvidencePaths([
      'docs/99_Manual/E2E_01_Result/RERUN_2026-05-22/step.png',
    ]);
    expect(hits).toHaveLength(1);
  });

  it('porcelain 파싱 — 미추적·수정·이름 바꿈·한글 인용', () => {
    expect(parsePorcelainLine('?? docs/99_Manual/E2E_B380_Result/new.json')).toBe(
      'docs/99_Manual/E2E_B380_Result/new.json',
    );
    expect(parsePorcelainLine(' M tests/e2e/screenshots/old.png')).toBe(
      'tests/e2e/screenshots/old.png',
    );
    expect(parsePorcelainLine('R  a.png -> b.png')).toBe('b.png');
    // 한글 파일명 인용(quotepath) 해제
    expect(parsePorcelainLine('?? "docs/99_Manual/E2E_B380_Result/한글.json"')).toBe(
      'docs/99_Manual/E2E_B380_Result/한글.json',
    );
  });

  it('실제 작업트리 기준 changedFiles — 현재 PR 변경(비증적 .ts·스크립트)은 경고 대상 0건', () => {
    const files = changedFiles({});
    expect(Array.isArray(files)).toBe(true);
    expect(filterEvidencePaths(files)).toEqual([]);
  });
});
