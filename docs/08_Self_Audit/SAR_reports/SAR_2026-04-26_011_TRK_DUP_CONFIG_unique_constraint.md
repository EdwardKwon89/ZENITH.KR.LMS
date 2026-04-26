# SAR-2026-04-26-011: zen_tracking_configs 중복 레코드 — UNIQUE 제약 누락

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-04-26 |
| **발견자** | Claude (PH4-UAT-01 브라우저 UAT 중) |
| **심각도** | HIGH |
| **상태** | CLOSED (수정 완료) |

## 1. 문제 요약

`zen_tracking_configs` 테이블에 `order_id` UNIQUE 제약이 없어, `syncExternalTracking()` 동시 호출 시 동일 `order_id`에 대한 중복 레코드가 생성됨. 이로 인해 `getTrackingEvents()`의 `.single()` 호출이 실패하고 트래킹 타임라인이 미표시됨.

## 2. 근본 원인

- `syncExternalTracking()`이 쿼리 시 INSERT OR UPSERT 없이 INSERT만 사용
- `zen_tracking_configs.order_id`에 UNIQUE 제약이 없어 동시 호출 시 중복 허용
- `.single()` 메서드는 정확히 1개 행을 요구하며, 2개 이상이면 PostgREST 오류 반환

## 3. 재현 경로

1. 트래킹 대시보드에서 "Sync All API" 버튼 2회 연속 클릭 (또는 두 세션 동시 실행)
2. `zen_tracking_configs`에 동일 `order_id`로 2개 레코드 생성
3. 오더 상세 페이지 접근 → `getTrackingEvents()` → `.single()` 실패
4. 콘솔: `[TRACKING] No config found for order: {orderId}`

## 4. 수정 내역

**파일:** `supabase/migrations/20260426020000_fix_tracking_config_unique_order_id.sql`

```sql
-- 기존 중복 제거 (오래된 레코드 보존)
DELETE FROM public.zen_tracking_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (order_id) id
  FROM public.zen_tracking_configs
  ORDER BY order_id, created_at ASC
);

-- UNIQUE 제약 추가
ALTER TABLE public.zen_tracking_configs
  ADD CONSTRAINT zen_tracking_configs_order_id_unique UNIQUE (order_id);
```

## 5. 재발 방지

- [ ] `LIVE_REGRESSION_TEST_MAP.md`에 중복 config 방지 항목 추가
- [ ] `syncExternalTracking()`에 UPSERT 패턴 적용 권장 (추후 개선)
