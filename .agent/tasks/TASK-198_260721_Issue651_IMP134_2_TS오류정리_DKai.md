# TASK-198 — IMP-134 §2: tests/ 전역 TypeScript 오류 258건 정리

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-198 |
| **GitHub Issue** | [#651](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/651) |
| **생성일** | 2026-07-21 |
| **할당 Agent** | D_Kai |
| **우선순위** | P3 |
| **전제조건** | 없음 (TASK-195/§1 완료 상태) |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ✅ |

---

## [배경]

IMP-134 §1(CI `tsc-advisory` 게이트 추가)은 TASK-195(Riley, PR#628)로 완료. §2(기존 타입 오류 정리)는 Backlog로 남아있던 항목 — Edward 대기시간 활용 제안으로 지금 착수.

`test:regression`(vitest)은 esbuild/swc 트랜스파일 기반이라 타입 체크를 강제하지 않아, 깨진 타입에도 테스트가 PASS로 통과되는 상태. `npx tsc --noEmit` 기준 `tests/` 하위 258건 확인(2026-07-21).

## [범위] — 파일별 오류 건수 (내림차순, 상위 7개가 전체의 약 73%)

| 파일 | 오류 수 |
|:-----|:------:|
| `tests/unit/agency/shipper-actions.test.ts` | 39 |
| `tests/e2e/e2e-26-invoice-pdf.spec.ts` | 29 |
| `tests/e2e/e2e-20-order-service-selection.spec.ts` | 29 |
| `tests/e2e/e2e-20-p6-service-rates.spec.ts` | 28 |
| `tests/e2e/e2e-26-ups-label-flow.spec.ts` | 23 |
| `tests/e2e/r11-ups-settlement-e2e-flow.spec.ts` | 22 |
| `tests/e2e/e2e-23-agency-flow.spec.ts` | 18 |
| `tests/e2e/e2e-22-daily-close.spec.ts` | 12 |
| `tests/integration/p6-db-01.test.ts` | 10 |
| `tests/unit/rates/rates.test.ts` | 6 |
| `tests/unit/orders/delivery-method.test.ts` | 6 |
| `tests/unit/agency/edit-form.test.tsx` | 5 |
| `tests/e2e/uat11-hub-routing-p0.spec.ts` | 5 |
| `tests/unit/logistics/order-actions.test.ts` | 4 |
| `tests/integration/p7-ups-schema.test.ts` | 4 |
| `tests/unit/monitoring/logger.test.ts` | 3 |
| `tests/unit/warehouse/agency-warehouse-scoping.test.ts` | 2 |
| `tests/unit/agency/shipper-form-ui.test.tsx` | 2 |
| `tests/unit/address-book/addressbook-email-create.test.ts` | 2 |
| `tests/integration/settlement-engine.test.ts` | 2 |
| `tests/e2e/uat-17-01-direct-order.spec.ts` | 2 |
| `tests/e2e/e2e-19-hub-routing-flow.spec.ts` | 2 |
| `tests/unit/warehouse/outbound-ups.test.ts` | 1 |
| `tests/unit/ups/rates-admin-actions.test.ts` | 1 |
| `tests/unit/logistics/rate-card-port-matching.test.ts` | 1 |

## [요구사항]

- `npx tsc --noEmit` 기준 `tests/` 하위 오류 0건 목표
- **전량 정리가 부담되면 상위 파일부터 배치 처리 후 잔여분은 별도 후속 Task로 분할 제안 가능** — 무리해서 한 번에 다 하려다 품질 떨어뜨리지 말 것
- 테스트 로직 자체는 이미 vitest로 통과 중 — **런타임 동작 변경 없이 타입만 정합**. `as any` 남발 금지, 근본 타입 불일치 수정 우선
- 회귀 테스트(`npm run test:regression`) 전체 PASS 유지 확인
- 절차: `agent-worktree-init.sh d_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

1. `supabase: any` → 재작업 지시. `SupabaseClient<AnySchema>` 타입 정의로 대체. 내부 `AnyRecord`의 값 타입은 `any` 사용 (Supabase의 `GenericTable` 구조체 요구사항으로 인해 `unknown` 불가).
2. `test-utils.ts`의 `Database` wrapper (`{ public: AnySchema }`) — PostgREST schema nesting 구조상 필수 (직접 `AnySchema`를 제네릭에 넣으면 PostgrestFilterBuilder에서 type resolution 실패).
3. Vercel preview deploy 성공 — CI 파이프라인 영향 없음.

---

## DoD

- [x] `npx tsc --noEmit` tests/ 오류 건수 확인(처리 전/후 비교) — 236건 → **0건**
- [x] 상위 7개 파일(전체의 73%) 최소 처리 완료 — **전체 25개 파일 100% 정리**
- [x] 잔여분 있을 경우 후속 Task 필요 여부 명시 — **없음 (전량 정리 완료)**
- [x] `npm run test:regression` 전체 PASS 확인 — 103 files / 669 tests PASS
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

| 항목 | 결과 |
|:-----|:----:|
| 처리 전 tsc 오류 | 236건 (TASK-198 작성 시점 258건 — 약간의 차이는 CI 환경 차이로 추정) |
| 처리 후 tsc 오류 | **0건** |
| 수정 파일 수 | 25개 (1차) + 11개 (2차 재작업) |
| 회귀 테스트 | 103 files / 669 tests **ALL PASS** (115s) |
| 재작업 사유 | `supabase: any` 사용 → TASK-198 §요구사항 "as any 남발 금지" 위반 |
| 재작업 내용 | `AnySchema` 제네릭 타입 정의로 `any` 제거. e2e 파일 7개 `supabase: any` → `SupabaseClient<Database>`. |

### 커밋

| 커밋 | 해시 | 내용 |
|:-----|:-----|:-----|
| 1차 | 61b80289 | 25개 파일 236건 TS 오류 정리 |
| 2차 (재작업) | `d6bd1832` | e2e typed client + TASK-198 파일 통합 |

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/676

## [Aiden 검토] — 2026-07-22 (PR#676, 커밋 `61b80289`+`d6bd1832`+`0549877d`)

**판정**: ✅ 승인 — PR#676 병합 완료

### 확인 내용
1. **1차 반려(문서 미비)** → task file·ACTIVE_TASK.md 보완 확인.
2. **자체 재작업**: 요구사항에 없던 `getServiceClient(): any` → `SupabaseClient<Database>` 제네릭 개선까지 자체적으로 수행 — "as any 남발 금지" 요구사항을 스스로 더 엄격히 적용한 판단으로 평가.
3. **독립 재검증**: 별도 워크트리에서 `npx tsc --noEmit` 직접 실행 — `tests/` 하위 0 errors 확인(재작업 커밋 반영 후 기준).
4. **실제 CI**: 최신 커밋 기준 Task File Check·Type Check·Regression Tests·Vercel 전항목 PASS.
5. **커밋 분리**: 코드(`61b80289`·`d6bd1832`)/문서(`0549877d`) 정확히 분리 — R-17 준수.

### 정정 (Aiden)
DoD 체크박스 2건 미체크(실질적으로는 충족된 항목) 및 커밋 표 `(HEAD)` 플레이스홀더를 실제 해시로 직접 정정.

**Aiden 조치**: task file 헤더 ✅, ACTIVE_TASK.md TASK-198 행 신규 추가(✅).
