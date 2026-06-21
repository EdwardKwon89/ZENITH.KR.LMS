# TASK-B-012 — Agency 정산 orderNoSearch 연동 완성

> **TASK-ID**: TASK-B-012  
> **생성일**: 2026-06-21  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Dave (DeepSeek V4)  
> **우선순위**: P2  
> **관련 IMP**: IMP-128  
> **GitHub Issue**: [#65](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/65)  
> **브랜치**: `feature/teamb-task-b-012-orderno-search-sync`  
> **상태**: ⬜

---

## [업무 개요]

TASK-B-010 구현 후 2가지 연동 누락이 잔존합니다.

1. **`AgencySettlementClient.tsx`에서 `orderNoSearch` 미전달**: `fetchData` 내 `getAgencyOrderSettlements` 호출 시 `orderNoSearch` 상태값이 5번째 인자로 전달되지 않아 검색 입력이 실제 쿼리에 반영되지 않음
2. **`exportAgencySettlementExcel` + `_fetchOrders` ILIKE 미연동**: 엑셀 다운로드 시 현재 검색 조건(오더번호)이 반영되지 않음

### 배경
- TASK-B-010 DoD에서 `exportAgencySettlementExcel` / `_fetchOrders` 검색 조건 동기화가 **DEF-061 보류**로 미처리됨
- DEF-061 해소(2026-06-21) 후 본 Task 발령

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| TASK-B-010 PR#62 develop 머지 완료 | ✅ |
| DEF-061 ✅ 해소 (exportAgencySettlementExcel develop 반영 확인) | ✅ |

---

## [구현 명세]

### 1. `AgencySettlementClient.tsx` — orderNoSearch 전달 (2곳)

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/AgencySettlementClient.tsx`

#### 수정 1: `fetchData` 내 `getAgencyOrderSettlements` 호출

```typescript
// 현재 (line ~67)
getAgencyOrderSettlements(agencyOrgId, selectedShipperId || undefined, from, to),

// 수정 후
getAgencyOrderSettlements(agencyOrgId, selectedShipperId || undefined, from, to, orderNoSearch || undefined),
```

#### 수정 2: `handleExcelExport` 내 `exportAgencySettlementExcel` 호출

```typescript
// 현재 (line ~99)
const res = await exportAgencySettlementExcel(agencyOrgId, selectedShipperId || undefined, from, to);

// 수정 후
const res = await exportAgencySettlementExcel(agencyOrgId, selectedShipperId || undefined, from, to, orderNoSearch || undefined);
```

### 2. `agency-settlement.ts` — `_fetchOrders` ILIKE 파라미터 추가

**파일**: `src/lib/actions/agency-settlement.ts`

```typescript
// 현재 (line 301)
async function _fetchOrders(supabase: any, shipperIds: string[], from: string, to: string) {
  return supabase
    .from('zen_orders')
    .select(...)
    .in('shipper_id', shipperIds)
    .gte('created_at', ...)
    .lte('created_at', ...);
}

// 수정 후
async function _fetchOrders(supabase: any, shipperIds: string[], from: string, to: string, orderNoSearch?: string) {
  let query = supabase
    .from('zen_orders')
    .select(...)
    .in('shipper_id', shipperIds)
    .gte('created_at', ...)
    .lte('created_at', ...);
  if (orderNoSearch) query = query.ilike('order_no', `%${orderNoSearch}%`);
  return query;
}
```

> **ZEN_A4**: `_fetchOrders` 수정 후 12→15줄 이내 예상 — 50줄 이하 준수

### 3. `agency-settlement.ts` — `exportAgencySettlementExcel` 파라미터 확장

**파일**: `src/lib/actions/agency-settlement.ts`

```typescript
// 현재 (line 332)
export const exportAgencySettlementExcel = withAction(async function (
  agencyOrgId: string,
  shipperId: string | undefined,
  from: string,
  to: string
) {

// 수정 후
export const exportAgencySettlementExcel = withAction(async function (
  agencyOrgId: string,
  shipperId: string | undefined,
  from: string,
  to: string,
  orderNoSearch?: string
) {
```

`_fetchOrders` 호출부:
```typescript
// 현재 (line ~360)
_fetchOrders(supabase, shipperIds, from, to),

// 수정 후
_fetchOrders(supabase, shipperIds, from, to, orderNoSearch),
```

---

## [ZEN_A4 준수 사항]

- `_fetchOrders`: 현재 12줄 → 수정 후 약 16줄 (50줄 이하)
- `exportAgencySettlementExcel`: 시그니처 1줄 추가 — 현재 43줄 → 44줄 이하
- `AgencySettlementClient.tsx`: 229줄 → 수정 후 동일 (파라미터 전달만)

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-SEARCH-03 | 오더번호 검색 후 엑셀 다운로드 | 다운로드된 Excel에 검색 조건 반영된 오더만 포함 |
| TC-B-SEARCH-04 | 오더번호 검색 → "조회" 클릭 | 테이블에 검색 조건 반영된 오더만 표시 |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-012-orderno-search-sync
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[DS] fix: TASK-B-012 Agency 정산 orderNoSearch 연동 완성 (IMP-128)` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-128 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[DS] docs: TASK-B-012 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-012-orderno-search-sync → develop`, `Closes #65`

---

## [DoD 체크리스트]

- [ ] `AgencySettlementClient.tsx` `fetchData` — `getAgencyOrderSettlements` 5번째 인자 `orderNoSearch || undefined` 추가
- [ ] `AgencySettlementClient.tsx` `handleExcelExport` — `exportAgencySettlementExcel` 5번째 인자 `orderNoSearch || undefined` 추가
- [ ] `agency-settlement.ts` `_fetchOrders` — `orderNoSearch?: string` 파라미터 추가 및 ILIKE 적용
- [ ] `agency-settlement.ts` `exportAgencySettlementExcel` — `orderNoSearch?: string` 파라미터 추가 및 `_fetchOrders` 전달
- [ ] ZEN_A4: 수정 함수 전량 50줄 이하 확인
- [ ] 회귀 테스트 전체 PASS (`rtk npm run test:regression`)
- [ ] 코드 커밋 해시 기재
- [ ] PR 생성 완료 (`Closes #65`)

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
| 코드 커밋 | — |
| 문서 커밋 | — |
| 회귀 결과 | — |
| PR | — |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-21 | Jaison (Claude, Team B) | Task 발령 — DEF-061 해소 후속 처리 + AgencySettlementClient orderNoSearch 연동 누락 수정 |
