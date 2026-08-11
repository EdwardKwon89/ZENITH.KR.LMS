# TASK-B-286: Issue #1075 / DEF-B-056 (Critical) — zen_order_items INSERT RLS 정책 누락으로 오더 수정 저장 시 아이템 전량 소실

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1075](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1075) |
| **DEF** | [DEF-B-056](../defects/DEF-B-056_zen_order_items_INSERT정책_누락으로_오더수정시_아이템_전량_소실.md) |
| **배경** | JSJung — ZEN-2026-000008 아이템 HS코드 설정 요청 → Jaison이 아이템 0건 확인, 원인 추적하여 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | **Critical (P1)** |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료 — DEF-B-056 참조)

`zen_order_items`에 SELECT 정책만 있고 INSERT/UPDATE/DELETE 정책이 전혀 없음(`zen_order_packages`와 비교해 명백한 비대칭). `updateOrder()`가 저장 시마다 패키지+아이템을 delete+reinsert하는데:

1. `deleteItemsByOrderId()` — items DELETE 정책 부재로 항상 0행(no-op, 에러 없음)
2. `deletePackagesByOrderId()` — packages는 정상 DELETE 정책 있어 성공 → `zen_order_items.package_id ON DELETE CASCADE`로 기존 아이템이 함께 삭제됨(캐스케이드는 items 자체 정책 부재와 무관하게 동작함을 직접 재현 확인)
3. 신규 패키지 INSERT 성공(새 id)
4. 신규 아이템 INSERT — items INSERT 정책 부재로 RLS 위반(`new row violates row-level security policy`), 그러나 `orderRepo.insertItems()` 반환값의 error를 `updateOrder()`가 확인하지 않아 **완전히 조용히 실패**

결과: 오더를 수정 저장할 때마다(WAREHOUSED 신규 기능뿐 아니라 기존 REGISTERED 단계 수정 포함, 오더 수정 기능 존재 이래 전체) 아이템이 소실되어 왔을 가능성.

## 수정 방향 (설계 확정 — 착수 승인)

1. **신규 마이그레이션**: `zen_order_items`에 INSERT/UPDATE/DELETE RLS 정책 추가. `zen_order_packages`의 기존 정책 패턴을 그대로 따를 것:
   - Members(화주 조직 소속): `is_org_member(auth.uid(), zen_orders.shipper_id)` join 기준 INSERT/UPDATE/DELETE
   - Admin: `get_my_role() = ANY(ARRAY['ZENITH_SUPER_ADMIN','ADMIN','MANAGER'])` ALL
   - Agency: `zen_orders.agency_org_id = (화주 소속 org_id)` 기준 UPDATE(패키지 정책과 동일 범위로 — INSERT/DELETE도 필요한지 확인 후 결정, 과설계 금지)
2. **`updateOrder()` 방어 코드**: `insertItems()` 반환값의 `error` 확인 후 실패 시 `throw new Error(...)`. 가능하면 `insertPackage`/`deleteItemsByOrderId`/`deletePackagesByOrderId`도 함께 점검(이미 `insertPackage`는 `if (pkgError || !packageData) continue;`로 일부 체크되어 있으나 continue가 아니라 throw가 맞는지도 재검토 — 과설계 금지, 최소 범위로 "조용한 실패" 제거에 집중).
3. **GRANT 확인**: R-08-2/DEF-B-053 패턴 — 신규 정책 추가 시 `service_role`/`authenticated` GRANT도 함께 명시적으로 넣을 것(fresh CI에서 누락 시 동일 패턴 재발 위험).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-286-order-items-rls-insert-missing` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-286 확인
- [ ] 위 "수정 방향" 1~3 반영
- [ ] **회귀 테스트 신설 (필수, R-09)** — 실 DB 기반:
  - `updateOrder()`로 아이템 포함 오더 저장 → 저장 후 실제로 DB에 아이템이 남아있는지 확인(**현재 코드 기준으로는 FAIL해야 정상** — 이 자체가 되돌리기 검증 역할)
  - 정책 추가 후 동일 테스트 PASS 확인
  - `insertItems()` 강제 에러 시뮬레이션 → `updateOrder()`가 throw하는지(방어 코드) 확인
  - 기존 REGISTERED 단계 오더 수정도 동일하게 아이템 보존 확인(회귀 방지 — WAREHOUSED뿐 아니라 전체 수정 경로)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] `supabase db reset --yes` fresh 상태에서 재검증(R-08-2 — GRANT 누락 재발 방지, DEF-B-053/TASK-B-284 v1 반려 사례 참고)
- [ ] (R-10) 실제 오더 수정 후 아이템이 유지되는지 브라우저로 직접 확인 — 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-286 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1075 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1075`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-284는 v1에서 GRANT 누락(service_role) 반려 이력 있음 — **이번 Task는 RLS 정책 자체가 핵심 수정 대상이므로 GRANT 관련 실수 재발에 특히 주의**. 되돌리기 검증은 "현재 코드가 실제로 버그를 재현하는지"부터 확인하는 역방향 구조이니 순서를 헷갈리지 말 것(정책 추가 전 FAIL 확인 → 추가 후 PASS 확인).

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `dccacfde` | `[Dave] fix: TASK-B-286 zen_order_items INSERT RLS 정책 누락으로 오더 수정 시 아이템 전량 소실 (Issue #1075 / DEF-B-056, Critical)` |

### 수정 내용 (설계 확정 1~3 반영)

1. **마이그레이션 `20260811080000`** — `zen_order_items`에 INSERT/UPDATE/DELETE RLS 정책 추가 (`zen_order_packages`와 동일 패턴):
   - Admin: `get_my_role() IN (ZENITH_SUPER_ADMIN/ADMIN/MANAGER)` INSERT/UPDATE/DELETE
   - Members(화주 조직 소속): `is_org_member(auth.uid(), shipper_id)` join 기준 INSERT/UPDATE/DELETE
   - Agency: `agency_org_id = 본인 org` UPDATE
   - GRANT는 DEF-B-053(20260811050000)에서 authenticated/service_role 이미 부여 — RLS 정책만 추가
2. **`updateOrder()` 방어 코드** — `insertItems()`·`insertPackage()`·`deleteItemsByOrderId()`·`deletePackagesByOrderId()` 반환 error 확인 후 실패 시 **명시적 throw** (기존 `continue`로 조용히 넘기던 것 제거)
3. **GRANT 확인** — fresh DB에서 authenticated 7건 + `service_role` INSERT=true 확인 (DEF-B-053 패턴 재발 방지)

### 회귀 테스트 (4건, JWT 인증 authenticated 클라이언트로 RLS 실제 평가)

| TC | 내용 |
|:---|:-----|
| TC-286-01 | REGISTERED 오더 수정 저장 후 아이템 보존 (기존 수정 경로) |
| TC-286-02 | WAREHOUSED+UPS 부분 수정 후 아이템 보존 |
| TC-286-03 | 아이템 내용(item_name) 실제 반영 |
| TC-286-04 | **되돌리기 검증** — INSERT 정책 제거 → updateOrder가 "아이템 저장 실패" throw → 정책 복원 → 재저장 성공 + 아이템 보존 |

> 테스트는 service_role 우회 없이 **로컬 Supabase JWT로 서명한 화주 조직 소속 authenticated 클라이언트**를 사용해 RLS 정책을 실제로 통과해야만 성공 — INSERT 정책 부재 시 TC-286-01~03이 FAIL하는 역방향 구조.

### 검증

- `npm run test:regression`: **1220/1220 PASS** (172파일, 신규 +4)
- `npm run build`: SUCCESS
- **fresh `supabase db reset` 재검증**(R-08-2): authenticated 7 GRANT + service_role INSERT=true + 정책 8건 + 통합 테스트 4/4 PASS

## [Jaison 최종 검토]

`/tmp/review-pr1076` 격리 워크트리에서 재검증 — `npx supabase db reset --yes` exit 0 완주, `zen_order_items` 정책 8건(SELECT 1 기존 + INSERT/UPDATE/DELETE 신규 7) 실제 생성 확인, `has_table_privilege`로 service_role/authenticated 양쪽 INSERT GRANT 확인. 신규 통합 테스트 4/4 PASS. **독립 되돌리기 검증**: INSERT 정책 2건 수동 DROP 후 TC-286-01/02/03 재실행 → 정확히 `아이템 저장 실패: new row violates row-level security policy` throw로 FAIL 재현(방어 코드 실동작 확인), `db reset`으로 복원 후 4/4 PASS 재확인. 전체 회귀 172/172·1220/1220 PASS, build SUCCESS. 실제 CI(`gh pr checks 1076`) Regression Tests pass 확인. PR#1076 승인·머지(TeamB_Dev, 커밋 `f5a40764`), Issue #1075 종결.

## [발견 이슈]

없음
