# DEF-B-158 — `cost_settled_by` FK `ON DELETE SET NULL`와 `SETTLED ⇒ settled_by NOT NULL` CHECK의 상호 모순

| 항목 | 내용 |
|:-----|:-----|
| 발견일 | 2026-11-18 |
| 발견자 | Mike (Team B) |
| 발견 경위 | TASK-B-365(Issue #1375) 마이그레이션 fixture 테스트(TC-365-4)에서 정산자 프로필 삭제 시도 중 FK·CHECK 충돌 실측 |
| 대상 | `zen_orders.cost_settled_by` (신규 컬럼, `supabase/migrations/20261118090000_task_b365_cost_settlement_columns.sql`) |
| 긴급도 | **Medium** |
| 상태 | OPEN (설계 확인 필요 — 명세 그대로 구현됨) |

## 현상

마이그레이션이 정의한 두 제약이 서로 모순됩니다.

1. **FK**: `cost_settled_by uuid REFERENCES zen_profiles(id) ON DELETE SET NULL`
   → 정산자 프로필 삭제 시 `cost_settled_by`를 NULL로 자동 변경
2. **CHECK**: `cost_settlement_status <> 'SETTLED' OR (cost_settled_at IS NOT NULL AND cost_settled_by IS NOT NULL)`
   → `SETTLED` 행의 `cost_settled_by`는 NOT NULL

**재현** (로컬 Supabase 실측, 2026-11-18):

```sql
-- SETTLED 오더 존재 상태에서 정산자 프로필 삭제:
DELETE FROM public.zen_profiles WHERE id='<정산자id>';
-- ERROR: new row for relation "zen_orders" violates check constraint "zen_orders_cost_settled_complete_check"
-- CONTEXT: UPDATE ONLY "public"."zen_orders" SET "cost_settled_by" = NULL WHERE ... "cost_settled_by"
```

`ON DELETE SET NULL`이 CHECK를 위반하므로, **정산 이력이 있는 프로필은 영구 삭제 불가**(에러로 DELETE 전체가 실패).

## 영향 범위

- 현재 `cost_settled_by`를 쓰는 코드는 없음(이 PR은 컬럼 추가만, 서버 액션은 PR-3/B-367에서 구현) → **운영 영향 0 (사전 발견)**.
- PR-3(`markOrderCostSettled`) 병합 후에는 정산자 프로필 삭제(회원관리 DELETE)가 이 오류로 실패할 수 있음.
- 원인은 설계 문서(`TASK-B-358` §3-1)와 이슈 #1375 본문에 두 제약이 함께 확정 기재된 것(2026-11-18 Jaison 승인) — 구현자가 임의 변경할 수 없는 명세 충돌.

## 긴급도 판정 근거

- **Medium**: 현재 동작 영향 0(컬럼 미사용), but PR-3 병합 시점에 실제 장애(회원 삭제 실패)로 전환됨. 조기 설계 정정 비용이 작을 시점.

## 권장 조치 (설계 선택 필요 — Aiden/Jaison 결정)

| 안 | 내용 | 장단점 |
|:--|:--|:--|
| **(A) FK를 `ON DELETE RESTRICT`로 변경 (권장)** | 정산자 삭제 차단 = 데이터 무결성 보호 | CHECK와 모순 해소. "정산 이력 있는 관리자는 삭제 불가"가 명시적 정책이 됨. `cost_settled_by`는 감사 필수값이라 보존이 타당 |
| (B) CHECK에서 `cost_settled_by` NOT NULL 제거 | `SETTLED ⇒ settled_at NOT NULL`만 유지, deleted_by는 NULL 허용 | FK SET NULL 살림. 단, "누가 정산했는지" 감사 정보 유실 |
| (C) 프로필 삭제를 `Soft Delete`(status 전환)로 제한 | 두 제약 모두 유지 + 삭제 자체를 금지 | 앱 레벨 변경 필요 — 범위가 큼 |

- (A)은 마이그레이션 1줄 변경(`ON DELETE SET NULL` → `ON DELETE RESTRICT`)으로 해소 가능.
- **테스트**: 현재 TC-365-4b가 두 제약의 정의를 각각 고정(충돌 미묘용). 정정 시 TC-365-4b를 "프로필 삭제 거부" 동작 단언으로 교체 예정.

## 관련

- Issue #1375 (TASK-B-365) `[발견 이슈]` 섹션에 요약 기재
- 설계 기준문서: `.agent/tasks/TASK-B-358_261118_Issue1363_BillingCostSettlementDesign.md` §3-1
