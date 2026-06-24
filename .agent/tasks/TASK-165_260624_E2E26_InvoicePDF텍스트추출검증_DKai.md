# TASK-165 — [SPR-09] E2E-26: Invoice PDF 텍스트 추출 검증 자동화 (UAT-19)

> **TASK-ID**: TASK-165
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #87)
> **담당 Agent**: D_Kai (DeepSeek)
> **우선순위**: P2
> **관련 Issue**: [#87](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/87)
> **전제조건**: TASK-161 ✅ (UAT-19 시나리오 존재)
> **브랜치**: `feature/teama-task-165-e2e26-invoice-pdf`
> **상태**: ⬜

---

## [업무 개요]

UAT-19 (Invoice PDF 미리보기/다운로드) 수동 시나리오 2종을 Playwright E2E 자동화로 전환합니다.
PDF 검증 전략: **텍스트 추출(내용 검증)** — 스냅샷 방식 배제 (Edward 확정, Issue #87).

---

## [구현 명세]

### 대상 시나리오 (UAT-19)

| 시나리오 | 내용 |
|:--------|:----|
| UAT-19-01 | UPS 오더 Invoice PDF 미리보기 렌더링 확인 |
| UAT-19-02 | Invoice PDF 다운로드 + 핵심 필드 텍스트 검증 |

### 출력 파일

- `playwright/e2e/e2e-26-invoice-pdf.spec.ts`
- `docs/99_Manual/E2E_26_Result/` (실행 결과 저장)

### PDF 텍스트 추출 구현 기준

- `pdf-parse` 또는 Playwright `page.pdf()` + 텍스트 레이어 추출 방식
- 검증 항목: 오더번호, 화주명, 수하인명, 총 운임, 날짜 필드 포함 여부
- 렌더링 환경 차이에 영향받지 않는 텍스트 내용 기반 assert
- R-14: 로컬 Supabase 환경에서 실행

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하
- spec 파일 1,000줄 이하 (Advisory 기준)
- PDF 파싱 유틸리티 별도 헬퍼 함수로 분리 권장

---

## [DoD 체크리스트]

- [ ] `playwright/e2e/e2e-26-invoice-pdf.spec.ts` 생성 완료
- [ ] PDF 텍스트 추출 헬퍼 구현 (라이브러리 선택 및 적용)
- [ ] UAT-19-01 (미리보기 렌더링) Playwright 전환 PASS
- [ ] UAT-19-02 (다운로드 + 텍스트 검증) Playwright 전환 PASS
- [ ] 핵심 필드 텍스트 assert 항목 명세서에 기재
- [ ] 로컬 실행 전 케이스 PASS
- [ ] 회귀 테스트 전체 PASS (`npm run test:regression`)
- [ ] R-17 완료 보고 절차 준수 (코드→task file 🔔→문서→PR `Closes #87`)

---

## [설계 의견]

_(없음 — PDF 텍스트 추출 방식 Edward 확정)_

---

## [작업 결과]

_(미착수)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #87 Edward 승인, SPR-09 E2E-26, PDF 텍스트 추출 방식 확정 |
