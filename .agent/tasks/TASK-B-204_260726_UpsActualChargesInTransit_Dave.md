# TASK-B-204: IN_TRANSIT 오더 부가요금 등록 기능 (recordUpsActualCharges 확장)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#830](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/830) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

사용자 요청 및 확정 사항:
1. `recordUpsActualCharges()`의 상태 게이트를 `DELIVERED`뿐 아니라 `IN_TRANSIT`도 허용
2. 실행 권한은 **admin 또는 agency만**(shipper는 실행 불가)
3. 부가요금은 "부가요금명 - 부가요금(금액) - 화폐단위" 3개 필드로 등록
4. **추가되는 부가요금은 `zen_order_costs`(예상운임)에만 반영** — 등록 시점에 즉시 인보이스를 발행하지 않음. 실제 청구서(invoice)는 이후 admin/agency가 "운임확정"(기존 `/finance/daily-billing` → `finalizeDailyShipperInvoices`, TASK-204/Riley) 처리할 때 비로소 발행됨.

## 조사 결과 (Jaison 완료)

`recordUpsActualCharges()`(`src/app/actions/finance/ups-actual-charges.ts:16-203`)의 기존 동작이 이미 요구사항 4번과 정확히 일치함을 확인:
- 인보이스가 아직 없으면(`!existingInvoice`) `zen_order_costs`에 `UPS_ACTUAL_ADJUSTMENT` upsert만 하고 끝남(104-154행) — **인보이스 즉시 발행 로직 추가 불필요**
- 인보이스가 이미 있고 마감 전이면 그 인보이스 `total_amount`만 재계산(156-192행)
- 인보이스가 마감된 상태면 마감 후 조정 인보이스 발행(TASK-194-C 경로, 98-102행) — 이건 DELIVERED 이후 시나리오라 그대로 둠

즉 **이 함수 자체의 인보이스 처리 로직은 변경 불필요**. 바꿔야 할 것은 딱 2가지:

### 1. 상태 게이트 확장

`src/app/actions/finance/ups-actual-charges.ts:37-39`
```ts
if (order.status !== 'DELIVERED') {
  return { success: false, error: '오더가 배송 완료(DELIVERED) 상태일 때만 실제 청구 요금을 입력할 수 있습니다.' };
}
```
→
```ts
if (order.status !== 'DELIVERED' && order.status !== 'IN_TRANSIT') {
  return { success: false, error: '오더가 IN_TRANSIT 또는 DELIVERED 상태일 때만 실제 청구 요금을 입력할 수 있습니다.' };
}
```

### 2. 권한 게이트 변경 — admin 또는 agency만

현재 `validateAdminAction()`(16행 근처, `validateAdminAction`)을 쓰고 있는데 이건 RBAC `/admin` 권한 체크라 AGENCY가 통과하는지 불확실함(대부분 admin 전용 경로). `finalizeDailyShipperInvoices()`(`daily-billing.ts:383-419`)가 이미 쓰고 있는 패턴을 그대로 재사용:
```ts
const { supabase, user, profile } = await validateUserAction(); // validateAdminAction 대신
const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
const isAdmin = adminRoles.includes(profile.role);
if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
  throw new Error('부가요금 등록 권한이 없습니다.');
}
```
(주의: `validateUserAction()`은 `user`가 아니라 `profile`을 반환하는 구조인지 `src/lib/auth/guards.ts` 실제 반환 형태를 먼저 확인하고 맞출 것 — `daily-billing.ts:388`의 `const { profile } = await validateUserAction();` 패턴 그대로 참고)

`searchDeliveredUpsOrders()`(275행)도 같은 이유로 함께 수정 필요:
- `.eq('status', 'DELIVERED')`(295행) → `.in('status', ['IN_TRANSIT', 'DELIVERED'])`
- 함수명이 "Delivered"인데 이제 IN_TRANSIT도 포함하므로 이름 변경 고려(`searchChargeableUpsOrders` 등) — 호출부(`admin/ups-actual-charges` 페이지) 함께 업데이트
- 권한도 위와 동일하게 admin/agency 허용으로 변경

### 3. UI 접근 권한 확장

`src/app/[locale]/(dashboard)/admin/ups-actual-charges/`가 현재 `/admin/` 하위 경로라 AGENCY 역할이 라우트 자체에 접근 못 할 가능성 높음(RBAC `/admin` 체크). 페이지 자체의 역할 체크 로직을 확인해 AGENCY도 접근 가능하도록 확장하고(단, 화면 내에서 agency는 본인 소속 화주 오더만 보이도록 스코프 제한 필요 — `getAgencyShipperIds` 패턴 재사용), 안내 문구("배송 완료된 UPS 오더만 가능")도 "IN_TRANSIT 또는 배송 완료된 UPS 오더"로 수정.

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조(task file/ACTIVE_TASK 미생성 13회, 배정 파일 미사용 후 미래날짜 파일 생성 1회, 회귀 테스트 미추가 2회, 그림자 컴포넌트 테스트 2회 — 전부 최근 발생. 이 Task는 재무 로직이라 특히 정확한 검증 필요).
- 재무/정산 영역은 이번 세션 중 Team A 쪽에서도 여러 차례 결함(DEF-119 등)이 발견된 민감한 영역 — 권한 체크·상태 게이트 변경이 기존 DELIVERED 전용 시나리오(TASK-194-C 마감 후 조정 흐름 등)를 깨뜨리지 않는지 특히 주의.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `recordUpsActualCharges()` 상태 게이트 확장 + 권한 게이트 변경(admin/agency)
- [ ] `searchDeliveredUpsOrders()` 상태 필터 확장 + 권한 게이트 변경
- [ ] `/admin/ups-actual-charges` 페이지 AGENCY 접근 허용 + agency는 본인 화주만 필터링 + 안내 문구 수정
- [ ] 실제 함수 호출 기반 회귀 테스트 추가: (1) IN_TRANSIT 오더에 부가요금 등록 성공 케이스, (2) SHIPPER 역할로 호출 시 거부되는 케이스, (3) AGENCY가 타 화주 오더 접근 시 거부되는 케이스, (4) 기존 DELIVERED+마감 조정 시나리오(TASK-194-C 경로) 회귀 안 됐는지 확인
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 IN_TRANSIT UPS 오더에 부가요금 등록 → `zen_order_costs`에 반영되는지, 인보이스는 즉시 생성 안 되는지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-204-... → TeamB_Dev`, `Closes #830`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
