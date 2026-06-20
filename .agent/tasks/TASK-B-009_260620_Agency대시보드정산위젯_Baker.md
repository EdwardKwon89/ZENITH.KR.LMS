# TASK-B-009 — Agency 대시보드 정산 요약 위젯

> **TASK-ID**: TASK-B-009  
> **생성일**: 2026-06-20  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Baker (Big Pickle)  
> **우선순위**: P2  
> **관련 IMP**: IMP-125  
> **GitHub Issue**: [#53](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/53)  
> **브랜치**: `feature/teamb-task-b-009-agency-dashboard-widget`  
> **상태**: 🔔 검토 요청  

---

## [업무 개요]

Agency 대시보드(`/agency`, Dave의 TASK-B-003)에 이번 달 정산 요약 위젯을 추가합니다.

### 배경

- 현재 Agency 대시보드는 화주수(shipperCount)와 퀵링크만 표시
- `ordersCount=0` 하드코딩으로 실데이터 없음
- Riley(TASK-153)의 `getAgencySettlementSummary` Server Action이 이미 존재 — 이번 달 매출/원가/마진 조회 가능
- Agency 사용자가 대시보드에서 즉시 정산 현황을 파악할 수 있어야 함

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| IMP-122 Agency 정산 조회 완료 (TASK-153 Riley ✅) | ✅ |
| `getAgencySettlementSummary` Server Action 구현 완료 | ✅ |
| Agency 대시보드 기본 구조 완료 (TASK-B-003 Dave ✅) | ✅ |

---

## [구현 명세]

### 1. 신규 컴포넌트 — `AgencySettlementWidget.tsx`

**파일**: `src/app/[locale]/(dashboard)/agency/AgencySettlementWidget.tsx`

**표시 항목 (이번 달 기준 — 월 1일 ~ 오늘)**:
| 항목 | 데이터 |
|:----|:------|
| 오더수 | `orderCount` |
| 총 매출 | `totalRevenue` (USD, 소수점 2자리) |
| 총 원가 | `totalCost` (USD) |
| 마진율 | `marginRate` (%, 소수점 1자리) |

**컴포넌트 제약**:
- 50줄 이하 엄격 준수
- Server Component로 구현 (page.tsx에서 데이터 fetch 후 props 주입 권장)
- 로딩 중 skeleton 없어도 무방 (Suspense 선택)

### 2. Agency 대시보드 page.tsx 수정

**파일**: `src/app/[locale]/(dashboard)/agency/page.tsx`

```typescript
// 현재: const shipperCount = shippers?.length || 0;
// 추가: 이번 달 정산 요약 조회
import { getAgencySettlementSummary } from '@/lib/actions/agency-settlement';

// 이번 달 from/to 계산 (월 1일 ~ 오늘)
const today = new Date();
const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const to = today.toISOString().split('T')[0];

const settlementResult = await getAgencySettlementSummary(profile.org_id, from, to);
const settlement = settlementResult.data ?? { orderCount: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0, marginRate: 0 };
```

### 3. i18n 키 추가

**기존 패턴 준수** — 4개국어(ko/en/zh/ja) 동시 추가

```
agency_settlement_widget_title: "이번 달 정산 현황" / "Monthly Settlement" / ...
agency_settlement_orders: "오더수" / "Orders" / ...
agency_settlement_revenue: "매출" / "Revenue" / ...
agency_settlement_cost: "원가" / "Cost" / ...
agency_settlement_margin_rate: "마진율" / "Margin Rate" / ...
```

---

## [ZEN_A4 준수 사항]

- `AgencySettlementWidget.tsx` 50줄 이하 필수
- page.tsx 수정 후 전체 함수 줄 수 확인
- 인라인 스타일 대신 기존 Tailwind 클래스 패턴 준수

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-DASH-01 | Agency 로그인 → 대시보드 접속 | 이번 달 정산 요약 위젯 표시 (오더수·매출·원가·마진율) |
| TC-B-DASH-02 | 오더 없는 Agency 로그인 → 대시보드 | 위젯 숫자 모두 0 표시 (에러 없음) |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-009-agency-dashboard-widget
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[BP] feat: TASK-B-009 Agency 대시보드 정산 요약 위젯` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 ⬜→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-125 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[BP] docs: TASK-B-009 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-009-agency-dashboard-widget → develop`, `Closes #53`

---

## [DoD 체크리스트]

- [x] `AgencySettlementWidget.tsx` 신규 생성 (50줄 이하)
- [x] Agency 대시보드 page.tsx 연동 완료
- [x] i18n 키 4개국어 추가
- [x] ZEN_A4: 함수 50줄 이하 전량 준수
- [x] TC-B-DASH-01~02 신규 추가 (`LIVE_REGRESSION_TEST_MAP.md` 업데이트)
- [x] 회귀 테스트 전체 PASS (212/214 PASS — tracking-business-qa 2건 pre-existing Supabase 미연결)
- [x] 코드 커밋 해시 기재
- [x] PR 생성 완료 (Closes #53) — [PR #54](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/54)

---

## [설계 의견]

_(복잡도 판단 후 작성 — 단순 Task이면 생략하고 ⬜→🔄 직행 가능)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `d763951` |
| 문서 커밋 | `5fea427` |
| 회귀 결과 | 212/214 PASS (tracking-business-qa 2건 Supabase 미연결로 pre-existing fail — 내 변경사항 무관) |
| PR | [PR #54](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/54) |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-20 | Jaison (Claude, Team B) | Task 발령 |
| 2026-06-20 | Baker (Big Pickle) | TASK-B-009 ✅ 완료 🔔 검토 대기 — `AgencySettlementWidget` 48줄, i18n 4개국어, TC 등재, PR #54 (Closes #53), 회귀 212/214 PASS |
