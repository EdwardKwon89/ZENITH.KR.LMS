# TASK-B-280: Issue #1060 / DEF-B-052 (High) — UPS등록취소 시 intl_ref_locked 미해제 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1060](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1060) |
| **DEF** | [DEF-B-052](../defects/DEF-B-052_UPS등록취소_시_패키지_intl_ref_locked_미해제.md) |
| **배경** | JSJung 실사용 중 UPS등록취소 후 결과 확인 요청 → Jaison이 DB 상태 검증 중 발견 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P1 (High) |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료)

MASTER AIR가 `ZEN-2026-000008`(자가화주 UPS 오더)에서 실제로: 등록(`registerUpsOrder`) → 라벨발급(`fetchAndIssueUpsLabel`, getnewlabel 2회 성공) → **"UPS등록취소"**(`undoUpsRegistration()`, PACKED→WAREHOUSED, 내부적으로 `cancelUpsRegistration()` 호출) 순으로 실행.

취소 자체는 SHXK 측 정상 성공(`removeorder` `"订单移除成功"`), `zen_ups_labels`/`zen_ups_label_documents`/스토리지 파일 삭제, `zen_tracking_configs.tracking_no` NULL 초기화까지 정상 수행됨을 Jaison이 직접 확인.

**단, `zen_order_packages.intl_ref_locked`가 취소 후에도 `true`로 남아있음.**

`src/app/actions/operations/ups-labels.ts:447-529`의 `cancelUpsRegistration()`은 라벨/트래킹 정리는 하지만 **`unlockAllPackagesIntlRef()` 호출이 없음** — 같은 파일 `voidUpsLabel()`(`ups-labels.ts:608-647`, RELEASED→PACKED "출고취소" 경로)에는 이 호출이 있는데(`line 628`), `cancelUpsRegistration()`(PACKED→WAREHOUSED "UPS등록취소" 경로)에는 처음부터 대응 로직이 누락되어 있었다.

## 영향 범위

`src/components/warehouse/OutboundProcessForm.tsx`가 출고확정 처리 시 `intl_ref_locked`로 "라벨 재발급 필요 여부"를 판단:
```ts
const packagesNeedingLabels = selectedOrders.flatMap((o) =>
  (o.order_packages || []).filter((p) => !p.intl_ref_locked)
);
```
취소된 오더의 패키지가 계속 "이미 라벨 있음"으로 오판되어 `issueUpsLabel()` 재호출 없이 출고확정이 그대로 진행될 위험 — 실제로는 SHXK 등록이 취소되어 유효한 UPS 라벨/트래킹이 전혀 없는 상태.

## 수정 방향 (설계 확정 — 착수 승인)

`cancelUpsRegistration()`(`ups-labels.ts:447-529`)에 `unlockAllPackagesIntlRef(supabase, orderId)` 호출 추가 — `voidUpsLabel()`과 동일 패턴. `zen_ups_labels` DELETE 이후, `zen_tracking_configs.tracking_no` 초기화 전후 아무 지점(다른 두 정리 작업과 동일하게 "실패해도 warn만 남기고 계속 진행" 방식으로 구현할지, 실패 시 즉시 return할지는 기존 `voidUpsLabel()`의 처리 방식—`unlockErr`이면 즉시 error return—을 그대로 따를 것).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-280-cancel-ups-registration-unlock` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-280 확인
- [ ] `cancelUpsRegistration()`에 `unlockAllPackagesIntlRef()` 호출 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `cancelUpsRegistration()`(또는 `undoUpsRegistration()` 경유) 실행 후 `zen_order_packages.intl_ref_locked`가 `false`로, `intl_ref_no`가 초기화되는지 실 DB 기반 검증
  - **되돌리기 검증 필수** — unlock 호출 제거 시 `intl_ref_locked`가 `true`로 남는 회귀 재현
  - 기존 `voidUpsLabel()` 관련 테스트가 있다면 회귀 없는지 함께 확인
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UPS등록 → 라벨발급 → UPS등록취소 → 패키지 `intl_ref_locked=false`/`intl_ref_no=null` 확인 → 출고확정 화면에서 "라벨 재발급 필요" 배지가 정상 표시되는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-280 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1060 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1060`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 이번 건은 단일 함수에 함수 호출 한 줄 추가하는 작은 수정이지만, 그럴수록 "간단하니 테스트 생략" 판단을 하지 말 것 — R-09는 규모와 무관하게 예외 없음.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `cb5d555d` | `[Dave] fix: TASK-B-280 UPS등록취소 시 패키지 intl_ref_locked 미해제 수정 (Issue #1060 / DEF-B-052)` |

### 수정 내용

`src/app/actions/operations/ups-labels.ts`의 `cancelUpsRegistration()`(`ups-labels.ts:447`)에 `unlockAllPackagesIntlRef(supabase, orderId)` 호출 추가(`ups-labels.ts:513`) — `voidUpsLabel()`(`ups-labels.ts:631`)과 **완전 동일 패턴**: 라벨 DELETE 직후 → `unlockErr`면 즉시 error return → tracking_no 초기화.

- 취소 전: `markAllPackagesIssued()`가 `intl_ref_locked=true`, `intl_ref_no` 설정
- 취소 후: `intl_ref_locked=false`로 해제되어 `OutboundProcessForm.tsx`의 `filter(!p.intl_ref_locked)`가 정상적으로 "라벨 재발급 필요"로 판단
- `intl_ref_no`는 voidUpsLabel 명세와 동일하게 유지(`unlockAllPackagesIntlRef`는 locked만 해제 — 재등록 시 `markAllPackagesIssued`가 덮어씀)

### 회귀 테스트 (`tests/integration/defb052-cancel-ups-registration-unlock.test.ts`, 3건)

실 로컬 DB(docker `supabase_db_ZENITH_LMS_001`)에 fixture(PACKED 오더 + `intl_ref_locked=true` 패키지 2개 + 라벨 + 트래킹)를 세팅하고, 실제 서버 액션을 실행한 뒤 DB 상태를 직접 조회해 검증 (auth만 서비스롤 mock, SHXK removeorder만 mock).

| TC | 검증 내용 | 결과 |
|:---|:---------|:-----|
| TC-280-01 | `cancelUpsRegistration()` 직접 호출 → `intl_ref_locked=false` 반영 (실 DB) | PASS |
| TC-280-02 | 라벨 없음 → 실패 시 `intl_ref_locked` 유지 (회귀 방지) | PASS |
| TC-280-03 | `undoUpsRegistration()`(PACKED→WAREHOUSED wrapper) 경유 → `intl_ref_locked=false` + 오더 상태 WAREHOUSED (통합) | PASS |

### 되돌리기 검증

`unlockAllPackagesIntlRef()` 호출을 일시 제거 후 재실행 → **TC-280-01/TC-280-03이 `intl_ref_locked='t'`로 정확히 FAIL 재현**(원래 DEF-B-052 버그 상태) → 복원 후 3/3 ALL PASS 확인.

### 검증

- `npm run test:regression`: **1173/1173 PASS** (165파일, 신규 +3)
- `npm run build`: SUCCESS
- `npx tsc --noEmit`: 신규 테스트 파일 오류 없음

## [발견 이슈]

없음

## [Jaison 최종 검토]

코드 수정(voidUpsLabel과 동일 패턴으로 unlockAllPackagesIntlRef 호출 추가)이 설계와 정확히 일치, 신규 회귀 테스트 3건(TC-280-01~03)도 실 DB 기반으로 적절함을 확인. CI Regression Tests가 "fail"로 표시됐으나 JSJung이 직접 중단시킨 것으로 확인(실제 코드 결함 아님) — PR#1061 승인·머지, Issue #1060 종결.
