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
| **상태** | ⬜ |

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

없음

---

## DoD

- [ ] `npx tsc --noEmit` tests/ 오류 건수 확인(처리 전/후 비교)
- [ ] 상위 7개 파일(전체의 73%) 최소 처리 완료
- [ ] 잔여분 있을 경우 후속 Task 필요 여부 명시
- [ ] `npm run test:regression` 전체 PASS 확인
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_
