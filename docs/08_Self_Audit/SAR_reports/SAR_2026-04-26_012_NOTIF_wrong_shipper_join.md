# SAR-2026-04-26-012: 알림 송하인 조회 잘못된 JOIN — org_id → user_id 혼용

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-04-26 |
| **발견자** | Claude (PH4-UAT-01 TC-UAT-TRK.3 검증 중) |
| **심각도** | HIGH |
| **상태** | CLOSED (수정 완료) |

## 1. 문제 요약

`triggerStatusChangeNotification()`이 `profiles!shipper_id` PostgREST 조인을 사용해 송하인을 조회했으나, `zen_orders.shipper_id`는 `zen_organizations.id`(org_id)를 참조하는 FK임. 결과적으로 `profiles.id = org_id`로 잘못 조인되어 항상 `null`이 반환되어 알림이 발송되지 않음.

## 2. 근본 원인

- 데이터 모델: `zen_orders.shipper_id` → `zen_organizations.id` (FK)
- 잘못된 가정: `zen_orders.shipper_id`가 `profiles.id`(user_id)를 직접 참조한다고 가정
- 올바른 관계: `profiles.org_id = zen_orders.shipper_id`를 통해 해당 조직 소속 사용자를 조회해야 함

## 3. 영향 범위

- 모든 상태 변경 시 송하인 IN_APP 알림 미생성
- 모든 상태 변경 시 송하인 이메일 미발송
- `zen_notifications.user_id`에 org_id가 삽입될 경우 무결성 오류 가능

## 4. 수정 내역

**파일:** `src/app/actions/notifications.ts`

**Before (broken):**
```typescript
const { data: order } = await supabase
  .from("zen_orders")
  .select("order_no, shipper_id, recipient_email, shipper:profiles!shipper_id(full_name, email)")
  .eq("id", orderId)
  .single<OrderNotificationData>();

// shipper_id(org_id)를 user_id로 잘못 사용
targets.push({ userId: order.shipper_id, email: order.shipper?.email });
```

**After (fixed):**
```typescript
// 1. 오더 기본 정보만 조회 (org_id)
const { data: order } = await supabase
  .from("zen_orders")
  .select("order_no, shipper_id, recipient_email")
  .eq("id", orderId)
  .single<OrderBasicData>();

// 2. org_id로 실제 사용자 조회
const { data: shipperUsers } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("org_id", order.shipper_id);

for (const u of shipperUsers ?? []) {
  targets.push({ userId: u.id, email: u.email ?? undefined });
}
```

## 5. 테스트 업데이트

- `tests/integration/notifications.test.ts` TC-N.2 mock 및 assertion 업데이트 (org_id → profiles 조회 패턴 반영)
- 109/109 회귀 테스트 통과 확인

## 6. 재발 방지

- [ ] 데이터 모델 관계 문서화: `zen_orders.shipper_id` = org_id, 사용자 조회는 `profiles.org_id`로
- [ ] 알림 시스템 E2E 통합 테스트 추가 권장
