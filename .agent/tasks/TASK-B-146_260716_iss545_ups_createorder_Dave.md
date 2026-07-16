# TASK-B-146: Issue #545 — createorder 오더단위 재구성

**담당**: Dave
**생성일**: 2026-07-16
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260716100000_iss545_ups_labels_package_id_nullable.sql` — package_id nullable
2. `src/app/actions/operations/ups-labels.ts` — issueUpsLabel/voidUpsLabel/placeShxkOrder 오더단위 재구성
3. `src/components/warehouse/OutboundProcessForm.tsx` — UI 호출부 오더단위로 수정
4. `src/lib/shxk/order.ts` — CreateOrderRequest mail_cargo_type/cargovolume 필드 추가
5. `tests/unit/ups/ups-labels-mapping.test.ts` — 핵심 순수 함수 10개 테스트

### CI
Vercel ✅

### 커밋
- `feb4d163` — `[Dave] feat: TASK-B-146 Issue #545 — createorder 오더단위 재구성`
- `6e54546b` — `[Dave] fix: TASK-B-146 반려 수정 — shxkCode 전달 + UI 오더단위 + 테스트 추가`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/549
