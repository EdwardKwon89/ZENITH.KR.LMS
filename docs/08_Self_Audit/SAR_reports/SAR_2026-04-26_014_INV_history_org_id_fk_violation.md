# SAR_2026-04-26_014 — INV-HIST-01: 재고 이력 INSERT FK 위반 (org_id)

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| 버그 ID | BUG-INV-HIST-01 |
| 발견일 | 2026-04-26 |
| 영향 범위 | TC-UAT-INV.4 (이력 조회) — 이력 항목 생성 실패 |
| 심각도 | High |
| 발견 경위 | UAT 브라우저 테스트 (Playwright) + 서버 로그 분석 |

## 2. 문제 설명

`adjustInventory()` 에서 재고 이력 INSERT 시 `org_id` 컬럼에 잘못된 UUID 사용.  
`profile.org_id ?? inventory.org_id` 표현식에서 PLATFORM 관리자(governance_master)의 `profile.org_id`가 `zen_organizations`에 존재하지 않는 UUID였음.

## 3. 에러 메시지

```
Failed to record inventory history: {}
-- 실제 에러 (verbose 로깅 추가 후):
[INV-HIST] Insert failed - code: "23503"
msg: "insert or update on table "zen_inventory_history" violates foreign key constraint "zen_inventory_history_org_id_fkey""
details: "Key is not present in table "zen_organizations"."
```

## 4. 근본 원인

```typescript
// 버그 코드
org_id: profile.org_id ?? inventory.org_id,
```

- `governance_master` (ZENITH_SUPER_ADMIN): `profile.org_id` = 잘못된 UUID (zen_organizations에 없음)
- `??` 연산자는 null/undefined만 우회하므로, 잘못된-but-존재하는 UUID를 그대로 사용
- 결과: FK 제약 위반 (23503), INSERT 실패, 에러 무시됨

## 5. 동반 버그

`getInventoryHistory()`에서 불필요한 `profiles!created_by` join 사용:
```typescript
// 버그
created_by_profile:profiles!created_by(full_name)
```
`zen_inventory_history.created_by` → `auth.users` 참조이므로 PostgREST 관계 인식 불가.  
에러: "Could not find a relationship between 'zen_inventory_history' and 'profiles' in the schema cache"

## 6. 수정 내용

**`src/app/actions/inventory.ts`**:

```typescript
// 수정: 항상 inventory.org_id 사용 (이력은 재고 아이템 소속 org)
org_id: inventory.org_id,

// 수정: profiles join 제거
const { data, error } = await supabase
  .from("zen_inventory_history")
  .select("*")  // profiles join 제거
  .eq("inventory_id", inventoryId)
  .order("created_at", { ascending: false });
```

## 7. 검증 결과

- +10 조정 후 이력 항목 생성 ✅ ("UAT Test - TC-UAT-INV.4 history verification")
- View History 시트 정상 로드 ✅
- 회귀 테스트: 109/109 ✅

## 8. 재발 방지

이력/로그 테이블 INSERT 시 `org_id`는 반드시 대상 리소스(inventory, order 등)의 `org_id`를 사용.  
acting user의 `profile.org_id`는 PLATFORM 관리자에게 유효하지 않을 수 있음.
