# DEF-088 — UAT-19-02 Query 3 `zen_order_rate_snapshots` 컬럼 불일치 (`override_type/value` → `applied_rule`)

> **발견일**: 2026-06-30
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-038 (TASK-B-033 §5), UAT-19-02
> **우선순위**: P4 — UAT 문서 수정 필요
> **상태**: ⬜

## 증상

UAT-19-02 Query 3에서 `zen_order_rate_snapshots` 테이블의 `override_type`, `override_value` 컬럼을 참조하지만, 실제 DB에는 `applied_rule` 컬럼만 존재함. `override_type`, `override_value` 컬럼은 이전 스키마에서 제거됨.

## 발견 경위

TASK-B-038 §C UAT-19-02 Playwright 테스트 DB 검증 단계에서 `zen_order_rate_snapshots` 테이블 스키마 확인. `\d zen_order_rate_snapshots` 결과: `pricing_basis` → `applied_currency`, `override_type/value` → `applied_rule` 로 대체됨.

## 영향

- UAT-19-02 Query 3: 실행 가능하나 `override_type`, `override_value` 컬럼 미존재로 결과 불완전
- UAT-19 문서 예상값: `applied_rule` 기반으로 수정 필요
- UAT-17-03 유사 케이스(이전 수정 완료)와 동일 패턴

## 권장 조치

1. `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` UAT-19-02 Query 3 수정:
   - `override_type, override_value` → `applied_rule`
   - 예상값: `'AGENCY_RATE_OVERRIDE'` (또는 실제 적용 규칙)
2. `docs/91_FinalTest/UAT/UAT_17_UPS특송오더발송.md` Query 3도 동일 패턴 확인 (TASK-B-038 §A에서 `pricing_basis`/`override_type` 수정 완료, `applied_rule` 일관성 확인)

## 참조

- `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` — §4 예상 결과값
- TASK-B-038 §A — UAT-17-03 동일 유형 수정 내역
- TASK-B-038 — 발견 경위
