# TASK-167 (D_Kai) — DEF-065 TC-POLICY 픽스 + DEF-068 RLS 확인

> **Task-ID**: TASK-167 (D_Kai 전용)
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — Edward 지시
> **담당 Agent**: D_Kai (DeepSeek)
> **우선순위**: P2
> **상태**: 🔔
> **GitHub Issue**: [#115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/115)
> **부모 Task**: [TASK-167](TASK-167_260626_DEF061~068_사이드바메뉴+TC픽스+RLS수정_BKai_DKai.md)

---

## 업무 개요

| DEF# | 제목 | 긴급도 |
|:----:|:-----|:------:|
| DEF-065 | TC-POLICY-03/04/06/07 db reset 환경 실패 (SEA/WM seed 의존) | Medium |
| DEF-068 | `order_status_history` SELECT RLS policy 누락 — 일마감 전체 비활성화 | High |

---

## [설계 확정]

- **DEF-065**: TC-POLICY-04에 SEA WM 정책 설정 UPDATE 추가 (방향 Aiden 승인)
- **DEF-068**: migration `20260619000000` 기존 적용 완료 — 일마감 UI 스크린샷 증거 첨부로 갈음

---

## [작업 결과]

### DEF-065: TC-POLICY-04 SEA WM 정책 설정 추가
- `tests/integration/p6-transport-policy.test.ts` TC-POLICY-04 (L380)
- `.update({ pricing_method: 'WM' }).eq('transport_mode', 'SEA')` 추가
- db reset 환경에서도 독립 실행 가능하도록 자체 내성 확보
- TC-POLICY 7/7 PASS · 회귀 387/387 PASS

### DEF-068: order_status_history RLS 확인
- migration `20260619000000_def068_order_status_history_rls.sql` 기존 존재
- `Allow authenticated read for history` 정책 DB 적용 확인
- 일마감 페이지 정상 조회 확인 (기존 E2E-22 스크린샷 `docs/99_Manual/E2E_22_Result/02_daily_close_page.png`)

---

## DoD 체크리스트

- [x] DEF-065: TC-POLICY-03/04/06/07 `npm run test:regression` PASS (7/7)
- [x] DEF-068: 일마감 페이지 정상 조회 확인 (기존 E2E-22 결과 스크린샷)
- [x] `npm run test:regression` 전체 387/387 PASS
- [x] 코드 커밋 해시: `6b06407`
- [x] R-17 완료 보고 (코드→task file 🔔→문서→PR Closes #115)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | D_Kai (DeepSeek) | 전용 task file 생성 — 착수 선언 🔄 |
