# DEF-086 — `zen_invoice_files` 테이블 미존재 → UAT-19 인보이스 PDF 검증 불가

> **발견일**: 2026-06-30
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-038 (TASK-B-033 §5), UAT-19
> **우선순위**: P3 — UAT-19 사전 조건 미충족
> **상태**: ⬜

## 증상

UAT-19(UPS 인보이스 PDF) 실행을 위한 전제 테이블 `zen_invoice_files`가 Supabase DB에 존재하지 않음. 해당 테이블을 참조하는 SQL Query 2개(UAT-19-01 Query 2, UAT-19-02 Query 1) 실행 불가.

## 발견 경위

TASK-B-038 §C UAT-19-01/02 Playwright 자동화 테스트 실행 중, `zen_invoice_files` 테이블 조회 시 "relation does not exist" 에러 확인. Supabase Studio(`localhost:54321`)에서 `SELECT * FROM zen_invoice_files LIMIT 1` 실행 결과 테이블 미존재 확인.

## 영향

- UAT-19-01 Query 2(파일 이력 조회): 실행 불가 → 해당 단계 테스트 불완전
- UAT-19-02 Query 1(파일명 확인): 실행 불가 → 해당 단계 테스트 불완전
- 인보이스 PDF 출력 기능 자체 미구현 상태 확인 (화면 [인보이스 PDF 출력] 버튼 없음)
- UAT-19 전체 검증 신뢰도 하락 (DB 레이어 검증 2/9건 SKIP)

## 권장 조치

1. `zen_invoice_files` 테이블 생성 마이그레이션 작성 (`supabase/migrations/`)
   - 스키마: `id, invoice_id, file_name, file_url, file_size, content_type, created_at`
   - RLS: `org_id` 기반 접근 제어
2. 인보이스 PDF 출력 기능 구현 (Server Action + UI 버튼)
3. UAT-19 재실행 (DB 검증 포함)

## 참조

- `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` — UAT-19 시나리오
- `tests/e2e/uat-19-invoice-pdf.spec.ts` — Playwright 테스트 (2/2 PASS, DB 검증 제한적)
- TASK-B-038 — 발견 경위
