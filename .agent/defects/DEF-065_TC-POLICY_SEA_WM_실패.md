# DEF-065 — TC-POLICY SEA/WM 통합 테스트 실패 (db reset 환경)

| 항목 | 내용 |
|:----|:----|
| **DEF-ID** | DEF-065 |
| **발견일** | 2026-06-14 |
| **발견자** | Aiden (Claude) — TASK-138 회귀 테스트 중 |
| **긴급도** | Medium |
| **상태** | ⬜ 미처리 |

---

## 발견 경위

TASK-138 완료 후 `npm run test:regression` 실행 시 `p6-transport-policy.test.ts`에서 4개 TC 실패 확인.
`git stash`로 TASK-138 변경 전 상태에서도 동일하게 실패 → TASK-138 변경과 무관한 기존 결함.

## 현상

```
FAIL tests/integration/p6-transport-policy.test.ts
  × TC-POLICY-03: SEA 오더 중량단가 > 용적단가 시 (중량단가 채택)
  × TC-POLICY-04: SEA 오더 용적단가 > 중량단가 시 (용적단가 채택)
  × TC-POLICY-06: SEA WM max_charge cap 적용 (상한선 발동)
  × TC-POLICY-07: WM 계산 후 zen_order_rate_snapshots slab 이력 + pricing_basis 저장 검증

AssertionError: expected false to be true
  at p6-transport-policy.test.ts:617:31 (TC-POLICY-07 예시)
  → sqlResult.success = false (RPC 호출 실패)
```

## 영향 범위

- `calculate_order_costs` RPC (SEA 모드 / WM 계산 분기)
- `fn_get_best_matching_rate` 4-arg 함수 (weight_slabs/cbm_slabs 매칭)
- `supabase db reset` 후 seed 데이터 없이 실행 시 재현 — 운영 환경 영향 없음

## 추정 원인

`db reset` 환경에서 `seed_rates_realistic.sql` 데이터 미적용으로 RPC 내부에서 요율 조회 실패.
TC가 특정 carrier/route seed 데이터에 의존하지만 vitest는 seed 없이 실행.

## 권장 조치

1. TC-POLICY-03/04/06/07를 mock 기반으로 전환하거나
2. `vitest globalSetup`에서 seed 실행 보장하거나
3. TC가 실제 DB 데이터 없이도 동작하도록 픽스처 인라인화

## 관련 파일

- `tests/integration/p6-transport-policy.test.ts` (TC-POLICY-03/04/06/07)
- `supabase/migrations/20260609200000_imp107_rate_snapshot_enhance.sql`
- `supabase/seed/seed_rates_realistic.sql`
