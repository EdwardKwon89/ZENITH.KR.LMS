# TASK-B-372 — Issue #1356: DEF-150 PR-1 — finance 대리점 범위 필터(§1.1) + 미인증 helper 이동(§1.2)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150, Aiden 발령) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | Aiden / JSJung |
| **생성일** | 2026-11-23 |
| **우선순위** | P1 (`priority:p1`, `type:fix`, `defect:high`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b372-iss1356-def150-pr1` (base `origin/TeamB_Dev` 4d01f7327) |
| **채번 확인** | Jaison 배정 번호 **TASK-B-372** (스크립트 값 사용 금지 지시). `.agent/tasks` 기존 파일 0건 |
| **PR 정책** | 이슈가 Aiden 발령 건 → PR 본문 **`Refs #1356`** (Close는 Jaison 수동) |

## 범위 (PR-1만)

| § | 대상 | 내용 |
|:--|:--|:--|
| 1.1 High | `src/app/actions/finance/ups-actual-charges.ts` | AGENCY 범위 필터를 `settlement.ts` `resolveAgencyShipperIds()` 패턴으로 통일(소속 화주 + **자가화주 `profile.org_id`**). `searchDeliveredUpsOrders` **2단계(tracking_no) `moreOrders`에도 동일 필터 적용**, `recordUpsActualCharges`도 동일 헬퍼 사용 |
| 1.2 Medium | `src/app/actions/finance/ups-actual-cost.ts` | `'use server'` 파일의 무인증 helper `getOrderReleasedDate` export 제거 → `src/lib/orders/order-released-date.ts`로 이동. 내부 3곳·오더정산 상세 페이지 import 갱신 |

**PR-2(범위 밖)**: §1.3 조회 5종 역할·소유권 가드(설계 의견 후 확정), §1.4 MANAGER `isAdmin`·`{error}` 로깅.

## R-20 영향도 (GitNexus 미연결·인덱스 stale → grep 전수)

| 심볼 | 호출처 (grep) | 건수 |
|:--|:--|:--:|
| `searchDeliveredUpsOrders` | `admin/ups-actual-charges/ups-actual-charges-client.tsx`, `finance/index.ts` 재export | 2 |
| `recordUpsActualCharges` | `components/orders/UpsActualAdjustmentForm.tsx`, `finance/index.ts`, 테스트 2파일 | 4+ |
| `getOrderReleasedDate` | `ups-actual-cost.ts` 내부 3곳, `finance/order-settlement/[orderId]/page.tsx`, `tests/unit/finance/ups-actual-cost.test.ts` | 5 |
| `resolveAgencyShipperIds` | `settlement.ts` private(패턴 참조) | — |

> 한계: GitNexus 도구·인덱스 미제공으로 자동 호출 그래프 분석 불가. `grep -rn` 전수 + 직접 파일 확인으로 대체.

## 구현 방침

- `ups-actual-charges.ts`에 `resolveAgencyScopeShipperIds(supabase, agencyOrgId)` 추가: `zen_agency_shippers`(active) + `agencyOrgId` 자신.
- `recordUpsActualCharges`: 위 헬퍼 결과에 `order.shipper_id` 포함 여부 검사(기존 `shipper_scope_denied` 유지).
- `searchDeliveredUpsOrders`: AGENCY일 때 헬퍼를 1회 계산해 `Set`으로 보관, 1단계 결과와 **2단계 `moreOrders` 모두** 필터. 필터로 제외된 오더는 `orderIds`에 추가하지 않는다.
- `getOrderReleasedDate`: `src/lib/orders/order-released-date.ts`로 이동(동작 동일), `ups-actual-cost.ts`는 import 사용, 페이지·단위 테스트 import 갱신. Ds-11 해당 절을 "lib 내부 헬퍼(서버 액션 아님)"로 정정.
- **마이그레이션·DB 변경 없음**, `scratch` 수정·IMP 번호 부여 금지(R-15).

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/app/actions/finance/ups-actual-charges.ts` | `resolveAgencyScopeShipperIds()` 추가(활성 연결 화주 + 자가화주 `agencyOrgId`). `recordUpsActualCharges`·`searchDeliveredUpsOrders` 1단계/2단계 모두 동일 스코프 적용. 조회 실패 시 자가화주만 허용(안전 축소) + `logger.error` |
| 2 | 〃 | `recordUpsActualCharges`: 소유 검증 통과 후 **AGENCY에 한해** `createAdminClient()`로 쓰기(`zen_ups_actual_charges`·`zen_order_costs`·`zen_invoices`). 기존 AGENCY INSERT/UPDATE RLS 정책 부재로 실비등록이 `CHARGES_INSERT`로 실패하던 문제 해소(DB 변경 없음, DEF-153 패턴) |
| 3 | `src/lib/orders/order-released-date.ts` (신규) | `getOrderReleasedDate` 이동 — `'use server'` 파일의 무인증 export 제거(§1.2) |
| 4 | `src/app/actions/finance/ups-actual-cost.ts` | helper import로 전환(내부 3곳), export 제거 |
| 5 | `src/app/[locale]/(dashboard)/finance/order-settlement/[orderId]/page.tsx` | helper import 경로 갱신 |
| 6 | `tests/integration/task-b372-agency-scope.test.ts` (신규) | 실제 AGENCY 로그인 세션·실DB — 검색 1·2단계 스코프, 실비등록 성공/차단 |
| 7 | `tests/unit/finance/ups-actual-cost.test.ts` | helper import 경로 갱신 |
| 8 | `tests/unit/finance/ups-actual-charges.test.ts` | AGENCY admin client mock 추가 |
| 9 | `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `recordUpsActualCharges`/`searchDeliveredUpsOrders` 권한·스코프, `getOrderReleasedDate`를 lib 내부 헬퍼로 정정 |
| 10 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-372_Issue1356_def150-pr1.md` (신규) | R-09 회귀 항목 |

**마이그레이션·DB 정책 변경 없음.**

## 2. 테스트 (DoD)

| TC | 내용 | 결과 |
|:--|:--|:--|
| TC-372-01 | AGENCY 검색(1단계 order_no): 소속·자가화주 1건, 타 화주/비소속 0건 | PASS |
| TC-372-02 | AGENCY 검색(2단계 tracking_no): 소속·자가화주 1건, 타 화주/비소속 0건 | PASS |
| TC-372-03 | 비소속(읽기 가능) 오더 실비등록 | `shipper_scope_denied` PASS |
| TC-372-04 | 소속·자가화주 오더 실비등록 | 성공 + `zen_ups_actual_charges` 1행 PASS (admin client) |
| TC-372-05 | §1.2 helper 이동 후 기존 단위·페이지 import | 14/14 PASS |
| TC-372-RST-1 | 2단계(tracking_no) 스코프 필터 제거 | **1 failed / 3 passed** → 복구 4/4 |
| TC-372-RST-2 | 헬퍼에서 자가화주(`agencyOrgId`) 제외 | **3 failed / 1 passed** → 복구 4/4 |
| TC-372-RST-3 | AGENCY admin client 쓰기 제거 | **1 failed / 3 passed** (`CHARGES_INSERT`) → 복구 4/4 |

## 3. 검증 (DoD)

- [x] 실제 로그인 세션(`signInWithPassword`)·실DB 통합 테스트 PASS (서버 액션 mock 없음)
- [x] 2단계(tracking_no) 경로 별도 검증 + 되돌리기 실측
- [x] `npm run test:regression` **294 files / 2,252 tests PASS**, `npm run build` **EXIT=0**
- [x] R-12 Ds-11 갱신, `check:ds11` OK
- [x] `zen_error_logs` 최근 1일 신규 ERROR **0건**
- [x] `git diff --stat origin/TeamB_Dev...HEAD -- scratch` 출력 없음(R-15)
- [x] `git diff --numstat origin/TeamB_Dev...HEAD` (최종):
```text
9	9	docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md
25	0	docs/08_Self_Audit/Checklists/regression-items/TASK-B-372_Issue1356_def150-pr1.md
2	1	src/app/[locale]/(dashboard)/finance/order-settlement/[orderId]/page.tsx
54	29	src/app/actions/finance/ups-actual-charges.ts
1	16	src/app/actions/finance/ups-actual-cost.ts
24	0	src/lib/orders/order-released-date.ts
179	0	tests/integration/task-b372-agency-scope.test.ts
5	0	tests/unit/finance/ups-actual-charges.test.ts
1	1	tests/unit/finance/ups-actual-cost.test.ts
```

## 4. [발견 이슈]

1. **[블로커 해소·승인 요청] AGENCY 실비등록 쓰기 RLS 부재** — `zen_ups_actual_charges`·`zen_order_costs`·`zen_invoices`에 AGENCY INSERT/UPDATE 정책이 없어, 필터만 수정하면 소속/자가화주 오더도 `CHARGES_INSERT`로 실패한다(실측). **DB 마이그레이션 없이** DEF-153 패턴(소유 검증 후 admin client)으로 AGENCY 경로만 쓰기를 전환해 DoD "실비등록 가능"을 충족했다. 이슈 #1356에 질문 코멘트를 남겼으며, Jaison이 마이그레이션 방식을 선호하면 정책 추가 PR로 교체 필요.
2. **[환경] `zen_agency_shippers` JWT 의존** — RLS가 `auth.jwt()->app_metadata.role/org_id`를 보므로 통합 테스트 계정 생성 시 `app_metadata`를 함께 설정해야 한다(테스트 픽스처 보정).
3. **[참고] §1.3/§1.4는 PR-2** — 조회 5종 가드·MANAGER `isAdmin`/`{error}` 로깅은 Jaison 지시대로 설계 의견 후 별도 PR.

## 5. [작업 결과]

- 코드 커밋: `6b8044811` (`[Dave] fix: TASK-B-372 …` — 소스 4·테스트 4·Ds-11·회귀항목)
- 문서 커밋: 본 task file (docs-only)
- PR: `feature/teamb-task-b372-iss1356-def150-pr1` → `TeamB_Dev` (**`Refs #1356`**)
