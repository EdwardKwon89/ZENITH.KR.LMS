# TASK-199 — 정산/재무 화면 디자인 시스템(ZenUI) 미적용 5건 정정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-199 |
| **GitHub Issue** | [#685](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/685) |
| **생성일** | 2026-07-22 |
| **할당 Agent** | D_Kai |
| **우선순위** | P3 |
| **전제조건** | 없음 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Aiden이 Team A 최근 개발 화면(정산/재무 관련)의 디자인 시스템(ZenUI, `src/components/ui/`) 적용 여부를 점검한 결과, 5건 전면 미적용 + 2건 부분 미적용 확인. raw HTML(`<table>`/`<input>`/`<select>`/`<button>`/순정 div)과 ad-hoc Tailwind로 앱 전체 시각적 일관성이 깨진 상태.

## [범위]

### 전면 정정 필요

| 파일 | 원 Task | 문제 |
|:---|:---|:---|
| `src/app/[locale]/(dashboard)/finance/order-revenue-cost/order-revenue-cost-client.tsx` | TASK-187 | raw `<table>`·`<input>`·`<select>`·`<button>`·KPI 카드 전부 순정 div |
| `src/app/[locale]/(dashboard)/admin/sub-agency-profit/sub-agency-profit-client.tsx` | TASK-187 | 동일 패턴 |
| `src/app/[locale]/(dashboard)/admin/ups-actual-charges/ups-actual-charges-client.tsx` | TASK-186 | raw input/button/카드 |
| `src/components/orders/UpsActualAdjustmentForm.tsx` | TASK-186(+194-A/D) | table·input·select·button 전부 raw, 요약 카드도 순정 div |
| `src/components/ups/UpsOrderBreakdownCard.tsx` | TASK-189 | ZenUI 컴포넌트 전혀 없이 커스텀 그라데이션 div — 가장 이질적 |

### 부분 정정

| 파일 | 원 Task | 문제 |
|:---|:---|:---|
| `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` | TASK-189 | 자체 레이아웃 섹션 래핑·상태 뱃지만 raw div/span → `ZenCard`/`ZenBadge` |
| `src/components/admin/InvoiceTable.tsx` | TASK-194-B | "정산 마감" 확인 모달만 raw div/textarea → `ZenTextarea` 등 |

## [요구사항]

- 화면별 실제 렌더링 결과(레이아웃·정보)가 시각적으로 크게 달라지지 않도록 컴포넌트만 ZenUI로 치환 — `ZenButton`/`ZenCard`/`ZenInput`/`ZenSelect`/`ZenTextarea`/`ZenBadge`/`ZenDataGrid` 활용
- 참고할 정상 사례: `src/components/ups/UpsBaseRateMatrix.tsx`, `ups-rates-client.tsx`(TASK-192)
- 기존 회귀 테스트 전체 PASS 유지, UI 셀렉터 의존 테스트가 있으면 함께 업데이트
- R-10: 파일별 교체 전/후 스크린샷 첨부
- 절차: `agent-worktree-init.sh d_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리
- 스코프가 크면 전면/부분 정정을 나눠 배치 처리 후 잔여분 후속 Task 제안 가능

## [발견 이슈]

없음

---

## DoD

- [ ] 전면 미적용 5개 파일 ZenUI 컴포넌트로 치환 완료
- [ ] 부분 미적용 2개 파일 잔여 요소 치환 완료
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] R-10 스크린샷(파일별 전/후) 첨부
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_
