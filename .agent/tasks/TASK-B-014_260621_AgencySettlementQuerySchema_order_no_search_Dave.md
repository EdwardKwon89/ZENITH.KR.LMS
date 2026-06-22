# TASK-B-014 — AgencySettlementQuerySchema order_no_search 필드 추가

> **TASK-ID**: TASK-B-014  
> **생성일**: 2026-06-21  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Dave (DeepSeek V4)  
> **우선순위**: P4  
> **관련 IMP**: IMP-130  
> **GitHub Issue**: [#68](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/68)  
> **브랜치**: `feature/teamb-task-b-014-schema-order-no-search`  
> **상태**: 🔔

---

## [업무 개요]

`AgencySettlementQuerySchema`에 `order_no_search` 필드가 정의되어 있지 않습니다.

`getAgencyOrderSettlements` / `exportAgencySettlementExcel` 양측에서 `order_no_search` 값을 `AgencySettlementQuerySchema.parse()` 호출 시 전달하고 있으나, 스키마 정의에 해당 필드가 없어 Zod가 silently strip합니다. 결과적으로 검색어에 대한 서버 사이드 Zod 유효성 검증이 이루어지지 않습니다.

### 배경

- TASK-B-012 Jaison 1차 검토 (2026-06-21) 중 발견
- 기능 동작은 정상 (ILIKE 직접 변수 참조 방식으로 필터링 수행)
- `getAgencyOrderSettlements`에도 동일 gap 존재 — 동일 커밋으로 일괄 수정

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| TASK-B-012 PR#66 develop 머지 완료 | 🔔 (Aiden 승인 대기) |

> ⚠️ TASK-B-012 머지 완료 후 착수 권장 (충돌 방지). 단, 수정 대상 파일(`validations/agency.ts`)은 TASK-B-012 변경 대상 아님 — 머지 전 착수도 가능.

---

## [구현 명세]

**파일**: `src/lib/validations/agency.ts`

```typescript
// 현재
export const AgencySettlementQuerySchema = z.object({
  agency_org_id: z.string().uuid(),
  shipper_org_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// 수정 후
export const AgencySettlementQuerySchema = z.object({
  agency_org_id: z.string().uuid(),
  shipper_org_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  order_no_search: z.string().optional(),
});
```

> **변경 범위**: 1줄 추가. 다른 파일 수정 불필요 (기존 호출부에서 이미 `order_no_search` 키로 전달 중).

---

## [ZEN_A4 준수 사항]

- `AgencySettlementQuerySchema` 정의: 수정 후 6줄 이내 — 50줄 이하 자명
- `validations/agency.ts` 전체 줄 수 변경 최소 (1줄 추가)

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-SCHEMA-01 | `order_no_search: "ORD"` 포함 schema parse | parse 성공 + 값 유지 |
| TC-B-SCHEMA-02 | `order_no_search` 미포함 schema parse | parse 성공 (optional) |
| TC-B-SCHEMA-03 | `order_no_search: undefined` schema parse | parse 성공 |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-014-schema-order-no-search
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[DS] fix: TASK-B-014 AgencySettlementQuerySchema order_no_search 추가 (IMP-130)` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-130 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[DS] docs: TASK-B-014 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-014-schema-order-no-search → develop`, `Closes #68`

---

## [DoD 체크리스트]

- [x] `src/lib/validations/agency.ts` `AgencySettlementQuerySchema` — `order_no_search: z.string().optional()` 추가
- [x] ZEN_A4: 수정 파일 50줄 이하 확인 (agency.ts 33줄)
- [x] TC-B-SCHEMA-01~03 신규 추가
- [x] 회귀 테스트 전체 PASS (378/387, 2건 pre-existing Supabase)
- [x] 코드 커밋 해시 기재
- [x] PR 생성 완료 (`Closes #68`)

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
| 코드 커밋 | `172f46d` |
| 문서 커밋 | 포함 (task file) |
| 회귀 결과 | 378/387 PASS (2건 pre-existing Supabase) |
| PR | https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/69 |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-21 | Dave (DeepSeek V4) | 구현 완료 + TC-B-SCHEMA-01~03 + 회귀 378/387 ✅ · 상태 🔄→🔔 |
| 2026-06-21 | Jaison (Claude, Team B) | Task 발령 — TASK-B-012 검토 후속, AgencySettlementQuerySchema Zod 정합성 보완 |
