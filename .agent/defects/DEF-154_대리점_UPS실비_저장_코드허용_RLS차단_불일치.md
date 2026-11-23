# DEF-154 | 대리점 UPS 실비 저장 — 코드 가드·UI는 허용, RLS INSERT는 403 차단

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **Medium** |
| **발견일 / 발견자** | 2026-11-18 / B_Kai (TASK-1156 §5.3·§8.1 #2) — Aiden 등록 |
| **관련** | Issue #1338 · PR #1383 · DEF-117/DEF-123 계열(AGENCY RLS 누락 침묵 실패) |

## 현상
`ups-actual-charges.ts:20-25`와 `/admin/ups-actual-charges`(`page.tsx:9-13`, `client:126`)는 `AGENCY`의 실비 입력을 허용하지만 `zen_order_costs` 계열 RLS INSERT가 **403**(실측)으로 차단 → 대리점이 저장하면 실패. 코드·UI 의도와 DB 권한 불일치.

## 소유 팀 근거 (git log)
`ups-actual-charges.ts` 최근 이력 `[Dave]`(`fef7e1f0`, TASK-B-352)·`[Baker]`(`2ee14b07`, #919) — **Team B 소유**. 수정(RLS 보완 vs 코드·UI에서 대리점 입력 제거)은 설계 판단 필요 → [Aiden] Issue로 Team B 요청 대상.

## 권장 조치
의도 확인(대리점 실비 입력 허용 여부) 후 ① RLS INSERT 보완 또는 ② UI·가드에서 AGENCY 제외. 저장 실패가 사용자에게 보이는지(침묵 실패 여부)도 함께 확인.
