# E2E 재검증 결과 요약 — 2026-05-22

> **작성자**: Aiden (Claude, ZEN_CEO) — Riley 인수 처리
> **작성일**: 2026-05-22
> **대상 TASK**: TASK-055

---

## 재검증 목적

Phase F~H Sprint에서 변경된 3개 구현이 기존 E2E 시나리오에 회귀를 일으키지 않음을 공식 확인.

---

## 결과 요약

| E2E | 시나리오명 | 영향 구현 | 결과 | 비고 |
|:--:|:----------|:---------|:----:|:-----|
| E2E-01 | 법인 회원가입 및 관리자 승인 | IMP-068 (Race Condition 수정) | **PASS** | 스크린샷 4건 증적 |
| E2E-03 | 마스터 오더 편성 및 창고 입/출고 | IMP-052 (dissolve RPC 교체) | **PASS** | 스크린샷 1건 증적 |
| E2E-05 | 서비스 정산, 인보이스 발행 및 세금계산서 | IMP-030 (정산 엔진 SRP 분할) | **PASS** | 스크린샷 1건 증적 |

**전체 결과**: 3/3 PASS — 회귀 없음 확인

---

## 이상 발견 사항

### E2E-05 Export 버그 (수정 완료)

- **발견**: E2E-05 재실행 중 Excel Export 단계 실패
- **근본 원인 1**: `src/middleware.ts` — `isApi` 판별식 배열 인덱스 오류 (`[1] === 'api'` → `[0] === 'api'`로 수정)
  - 영향: `/api/*` 경로 클라이언트 fetch가 모두 `/ko/api/*`로 리다이렉트되어 404 반환
- **근본 원인 2**: Playwright 테스트에서 sticky header(`z-30`)가 export 버튼 클릭을 DOM 히트 테스트 레벨에서 인터셉트
  - 수정: `exportBtn.click({ force: true })` → `exportBtn.evaluate(el => el.click())`
- **수정 커밋**: 본 커밋에 포함
- **재검증 결과**: PASS — Excel 파일 생성 및 응답 헤더 정상 확인

---

## 증적 파일 위치

| E2E | 스크린샷 경로 |
|:--:|:------------|
| E2E-01 | `docs/99_Manual/E2E_01_Result/RERUN_2026-05-22/` |
| E2E-03 | `docs/99_Manual/E2E_03_Result/RERUN_2026-05-22/` |
| E2E-05 | `docs/99_Manual/E2E_05_Result/RERUN_2026-05-22/` |

---

## 회귀 테스트

| 항목 | 결과 |
|:----|:----:|
| 전체 케이스 | 211/211 PASS |
| 로그 위치 | `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-055.log` |
