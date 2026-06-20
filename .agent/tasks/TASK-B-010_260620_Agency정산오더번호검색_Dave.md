# TASK-B-010 — Agency 정산 오더번호 검색 기능

> **TASK-ID**: TASK-B-010  
> **생성일**: 2026-06-20  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Dave (DeepSeek V4)  
> **우선순위**: P2  
> **관련 IMP**: IMP-126  
> **GitHub Issue**: [#56](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/56)  
> **브랜치**: `feature/teamb-task-b-010-settlement-order-search`  
> **상태**: ⬜ 착수 대기

---

## [업무 개요]

Agency 정산 조회 화면(`/agency/settlements`)에 오더번호 직접 검색 기능을 추가합니다.

### 배경

- 현재 필터: 날짜 범위 + 화주 드롭다운
- Agency 담당자가 특정 오더번호를 빠르게 찾을 수 없음
- `zen_orders.order_no`에 인덱스 존재 → ILIKE 부분 검색 가능

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| TASK-B-008 PR #55 develop 머지 완료 | 🔔 |

> ⚠️ PR #55가 머지된 후 `develop`을 rebase하고 착수할 것. `AgencySettlementClient.tsx`·`agency-settlement.ts`를 동시 수정하므로 충돌 방지 필수.

---

## [구현 명세]

### 1. Validation Schema 확장

**파일**: `src/lib/validations/agency.ts`

```typescript
export const AgencySettlementQuerySchema = z.object({
  agency_org_id:   z.string().uuid(),
  shipper_org_id:  z.string().uuid().optional(),
  from:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  order_no_search: z.string().max(50).optional(),  // 추가
});
```

### 2. Server Action 수정 — `getAgencyOrderSettlements`

**파일**: `src/lib/actions/agency-settlement.ts`

- 파라미터 `orderNoSearch?: string` 추가
- 쿼리에 `.ilike('order_no', \`%${orderNoSearch}%\`)` 조건 추가 (값이 있을 때만)

### 3. Server Action 수정 — `exportAgencySettlementExcel`

**파일**: `src/lib/actions/agency-settlement.ts`

- 동일하게 `orderNoSearch?: string` 추가 → `_fetchOrders` 헬퍼에 전달
- `_fetchOrders` 파라미터 확장 + ILIKE 조건 반영

### 4. UI — 오더번호 검색 입력

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/AgencySettlementClient.tsx`

- 날짜 필터 영역에 오더번호 input 추가
- `[selectedShipperId]` 의존성 배열에 `orderNoSearch` 추가 (옵션)
- 엑셀 다운로드 시 `orderNoSearch` 전달

---

## [ZEN_A4 준수 사항]

- `getAgencyOrderSettlements` 함수: 현재 약 35줄 → 파라미터 추가 후 40줄 이하 유지
- `_fetchOrders` 헬퍼: 조건 추가 후 20줄 이하 유지
- `AgencySettlementClient.tsx`: 현재 202줄 → UI 추가 후 220줄 이하 예상 (Advisory 미만 ✅)

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-SEARCH-01 | 오더번호 일부 입력("ZEN") 후 조회 | 해당 문자열 포함 오더만 표시 |
| TC-B-SEARCH-02 | 존재하지 않는 오더번호 입력 후 조회 | 빈 목록 표시 (에러 없음) |
| TC-B-SEARCH-03 | 오더번호 검색 + 화주 필터 동시 적용 | 두 조건 AND 결합 결과 표시 |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop   # PR #55 머지 후 진행
git checkout -b feature/teamb-task-b-010-settlement-order-search
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[DS] feat: TASK-B-010 Agency 정산 오더번호 검색 기능 (IMP-126)` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-126 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[DS] docs: TASK-B-010 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-010-settlement-order-search → develop`, `Closes #56`

---

## [DoD 체크리스트]

- [ ] `AgencySettlementQuerySchema` `order_no_search` 파라미터 추가
- [ ] `getAgencyOrderSettlements` ILIKE 검색 조건 구현
- [ ] `exportAgencySettlementExcel` / `_fetchOrders` 검색 조건 동기화
- [ ] `AgencySettlementClient.tsx` 오더번호 검색 UI 추가
- [ ] ZEN_A4: 수정된 함수 전량 50줄 이하 확인
- [ ] TC-B-SEARCH-01~03 신규 추가 (`LIVE_REGRESSION_TEST_MAP.md` 업데이트)
- [ ] 회귀 테스트 전체 PASS (`rtk npm run test:regression`)
- [ ] 코드 커밋 해시 기재
- [ ] PR 생성 완료 (`Closes #56`)

---

## [설계 의견]

_(단순 Task — ⬜→🔄 직행)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | TBD |
| 문서 커밋 | TBD |
| 회귀 결과 | TBD |
| PR | TBD |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-20 | Jaison (Claude, Team B) | Task 발령 |
