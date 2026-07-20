# TASK-191 — [Team A] 요금 계산 엔진이 화주 세션으로 Agency 원가 정책을 조회 — RLS로 조용히 0% 할인 처리됨 — Issue #617 (D_Kai)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-191 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-191-freight-rls-fix-dkai` |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🔄 |

---

## [배경]

**필독**: 착수 전 GitHub Issue #617 본문 전체를 먼저 읽을 것.

`estimateUpsFreight()`(`src/app/actions/ups/freight.ts`)가 Agency 원가 할인율(`zen_agency_pricing_policies`)을 조회할 때 **요청자(화주)의 RLS 스코프 Supabase 클라이언트**(`validateUserAction()`이 만든 것)를 그대로 사용한다. 이 테이블의 RLS는 ADMIN/MANAGER/ZENITH_SUPER_ADMIN, 해당 Agency 본인, SUB_ADMIN(관리 대상)에게만 SELECT를 허용 — 일반 화주(AGENCY_SHIPPER/SHIPPER/CORPORATE)는 이 테이블을 볼 권한이 전혀 없다.

화주가 UPS 오더를 직접 등록하는 것이 실제 운영에서 가장 흔한 경로인데, 이 경우 쿼리가 RLS에 의해 조용히 빈 결과를 반환하고 `discountRate`가 **0으로 기본 처리**된다 — 에러 없이 "할인 없음"으로 계산됨.

**재현 확인 완료**(Aiden, 2026-07-20): Seed 데이터로 SNTL Sub-Agency Test에 Zone 5 20% 원가 할인 등록 후, `test_shipper@zenith.kr`(AGENCY_SHIPPER)로 실제 UPS 오더 등록(ZEN-2026-000002) → `zen_order_rate_snapshots.metadata`에서 `agency.discountRate: 0`, `agency.agencyCostPrice === platform.totalSellingPrice`(할인 전혀 미반영) 확인. 반면 `shipper.shipperDiscountRate: 0.12`는 정상 반영됨(화주 본인 조회를 허용하는 별도 RLS 정책 `shipper_zone_discounts_shipper_select`이 있기 때문).

---

## [작업 범위]

### 1. 수정 대상: `estimateUpsFreight()`(`src/app/actions/ups/freight.ts`)

`zen_agency_pricing_policies`·`zen_agency_other_charges` 조회는 **내부 원가 계산 목적**(화주에게 직접 노출하는 게 아니라 platform/agency 계층 금액 산출용)이므로, 호출자의 RLS 스코프 클라이언트가 아니라 **서비스 롤(관리자) 클라이언트**로 조회해야 한다. `createAdminClient()`(이미 다른 서버 액션에서 쓰이는 패턴, `src/utils/supabase/server.ts` 참조)로 이 두 쿼리만 교체.

### 2. 응답 필드 마스킹 검토

`agency` 필드(Agency의 내부 원가/마진)를 화주 응답에 그대로 반환할지 검토 필요 — 화주는 Agency의 원가/마진을 알 필요가 없는 정보다. 호출자 역할이 화주(AGENCY_SHIPPER/SHIPPER/CORPORATE/INDIVIDUAL)인 경우 `agency` 필드를 `null`로 마스킹하는 방안을 검토하고, 적용 여부와 근거를 `[작업 결과]`에 기재할 것(마스킹 안 하기로 결정해도 무방 — 판단 근거만 명시).

### 3. 회귀 확인

기존 ADMIN/AGENCY 세션에서의 `estimateUpsFreight` 동작(할인 정상 반영)이 이번 수정으로 깨지지 않는지 확인.

---

## [DoD]

- [ ] `estimateUpsFreight`의 `zen_agency_pricing_policies`·`zen_agency_other_charges` 조회를 서비스 롤 클라이언트로 교체
- [ ] `agency` 필드 마스킹 여부 검토 및 결정 근거 기재
- [ ] 화주 세션으로 재현 테스트 — Issue #617에 기록된 재현 시나리오(ZEN-2026-000002와 동일 조건)로 `agency.discountRate`가 실제 등록된 값(0.20)으로 정상 반영되는지 확인
- [ ] 신규 단위 테스트 추가(화주 세션에서도 agency discount가 정상 조회됨을 검증)
- [ ] ADMIN/AGENCY 세션 기존 동작 회귀 없음 확인
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[D_Kai] fix: TASK-191 요금 계산 엔진 RLS 버그 수정 — Issue #617`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 617 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[D_Kai] docs: TASK-191 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-191-freight-rls-fix-dkai → develop`, `Closes #617`
8. **재제출 전 필수**: 로컬 `npm run build` 직접 실행하여 성공을 눈으로 확인 후 커밋
9. **착수 전 필수**: `./scripts/next-task-number.sh A`로 채번 확인 후 착수(직전 TASK-190에서 번호 충돌 발생 이력 있음 — 반복 시 R-17 위반 누적)

---

## [발견 이슈]

없음

---

## [작업 결과]

_(착수 시 작성)_
