# DEF-087 — 오더 상세 화면 [인보이스 PDF 출력] 버튼 미구현

> **발견일**: 2026-06-30
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-038 (TASK-B-033 §5), UAT-19-01
> **우선순위**: P3 — UAT-19-01 UI 검증 불가
> **상태**: ⬜

## 증상

UAT-19-01 시나리오에서 [인보이스 PDF 출력] 버튼이 오더 상세 화면에 노출되지 않음. Playwright `page.getByText('인보이스 PDF 출력')` 쿼리로 버튼 탐색 실패.

## 발견 경위

TASK-B-038 §C UAT-19-01 Playwright 테스트 실행 중, 오더 상세 화면 진입 후 인보이스 PDF 출력 버튼 탐색 시도 → `locator` 미발견. 스크린샷(`docs/99_Manual/UAT_19_Result/01_order_detail.png`) 육안 확인 결과 해당 버튼 없음.

## 원인

인보이스 PDF 출력 기능(Server Action + UI 버튼)이 아직 구현되지 않음. `zen_invoice_files` 테이블이 DB에 없는 것과 동일한 맥락 — 인보이스 PDF 모듈 자체가 Phase 7+ 범위로 예정.

## 영향

- UAT-19-01: UI 검증 단계(PDF 버튼 클릭 → 브라우저 PDF 뷰어 확인) 실행 불가
- UAT-19 전체: 기능 미구현 상태로 UAT 통과 가능 여부 판단 불가

## 권장 조치

1. 인보이스 PDF 출력 기능 구현 범위 결정 (Phase 8 후반 또는 Post-Launch)
2. 기능 구현 후: Server Action(`generateInvoicePdf`), Download/View 버튼 UI, `zen_invoice_files` 연동 저장
3. UAT-19-01 재실행

## 참조

- `tests/e2e/uat-19-invoice-pdf.spec.ts` — Playwright 테스트 (버튼 미발견으로 ASSERT 생략)
- `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` — UAT-19-01 시나리오
- DEF-086 — `zen_invoice_files` 테이블 미존재 (동일 근본 원인)
- TASK-B-038 — 발견 경위
