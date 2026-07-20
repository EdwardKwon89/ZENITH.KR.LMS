# TASK-192 — [Team A] SNTL(SUB_ADMIN) 전용 UPS 원가(cost_price) Matrix 편집 기능 — Issue #618 (D_Kai)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-192 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | TASK-191 권장(병행 가능 — 파일 겹침 없음) |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-192-sntl-cost-matrix-dkai` |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🔔 |

---

## [배경]

**필독**: 착수 전 GitHub Issue #618 본문 전체(설계 결정 근거 포함)를 먼저 읽을 것.

`zen_ups_base_rates`(상품×Zone×중량별 UPS 공식 판매가·SNTL 실제 원가)는 이미 `selling_price`·`cost_price`가 별도 필드로 분리되어 있다. 지금까지 SNTL 실측 원가(원가표.xlsx)는 Aiden이 SQL 마이그레이션으로 수동 입력해왔음 — SNTL(SUB_ADMIN)이 직접 자기 원가를 입력할 방법이 없어, UPS 요율 갱신 시마다 반복하기 어려운 상태.

---

## [핵심 원칙 — 범위 제한]

- **테이블/스키마 변경 없음** — 신규 테이블·마이그레이션 불필요. `zen_ups_base_rates` 그대로 사용.
- **기존 `upsertUpsBaseRate`(ADMIN/MANAGER 전용, selling_price+cost_price 모두 수정)는 무수정** — 신규 함수를 추가하는 것이지 기존 함수를 확장하는 게 아님.
- **영향도 사전 확인 완료(Aiden-Edward, 2026-07-20)**: `cost_price`는 Sub-Agency 원가(`computeAgencyFreight`)·화주 판매가(`computeShipperFreight`) 계산 어디에도 쓰이지 않음(둘 다 `selling_price` × 각자 할인율만 사용). `cost_price`는 오직 SNTL 자신의 수익금 집계(TASK-187, `getOrderRevenueCost`/`getSubAgencyProfitSummary`)에서만 소비됨 — 즉 이번 변경은 하부 Agency·화주의 실제 청구 금액에 전혀 영향 없는 낮은 리스크 변경으로 이미 검증됨. 이 전제가 깨지는 코드 변경(예: agency/shipper 계산 로직에 cost_price를 새로 끌어오는 것)은 이번 Task 범위 밖.

---

## [작업 범위]

### 1. 신규 서버 액션 — `upsertAgencyCostRate` (`src/app/actions/ups/rates-mutation.ts`)

- **`selling_price` 파라미터를 아예 받지 않음**
- 가드: `requireAdminManagerOrSubAdmin`
- `createAdminClient()`로 RLS 우회, 기존 행 조회 후 `cost_price`만 UPDATE
- 행 미존재 시 에러

### 2. 화면 — 기존 `UpsBaseRateMatrix.tsx` 재사용

- `canEditCostOnly` + `onCostCellClick` prop 추가
- SUB_ADMIN 접근 시: `selling_price` 읽기 전용, `cost_price`만 클릭·편집 가능
- ADMIN/MANAGER: 기존 그대로

### 3. 페이지 접근 (`ups-rates-client.tsx`)

- `canEditCostOnly` 변수 추가 (SUB_ADMIN)
- `handleCostCellClick` → `CostOnlyForm` 모달 → `upsertAgencyCostRate` 호출
- 다른 탭(Zone·상품·유류할증 등)은 여전히 편집 불가 (기존 `canEdit`=false 유지)

---

## [DoD]

- [x] `upsertAgencyCostRate` 구현 — `selling_price` 입력 자체를 받지 않는 시그니처
- [x] `UpsBaseRateMatrix` SUB_ADMIN 모드(selling_price 읽기전용, cost_price만 편집)
- [x] 기본요율 탭 외 다른 탭은 SUB_ADMIN에게 편집 불가 유지
- [x] 기존 `upsertUpsBaseRate`·ADMIN 화면 동작 무수정 확인
- [x] 단위 테스트 4종 (TC-UPS-ADMIN-12~12d):
  - 12: SUB_ADMIN 성공 / 12b: GUEST 차단 / 12c: 미존재 에러 / 12d: upsertUpsBaseRate 차단
- [x] 전체 회귀 테스트 PASS (653/653)

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[D_Kai] feat: TASK-192 SNTL 원가 전용 Matrix 편집 기능 — Issue #618`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 618 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[D_Kai] docs: TASK-192 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-192-sntl-cost-matrix-dkai → develop`, `Closes #618`
8. **재제출 전 필수**: 로컬 `npm run build` 직접 실행하여 성공을 눈으로 확인 후 커밋
9. **착수 전 필수**: `./scripts/next-task-number.sh A`로 채번 확인 후 착수

---

## [발견 이슈]

없음

---

## [작업 결과]

**코드 커밋**: `ce0a3ade`
**문서 커밋**: `(HEAD of feature/teama-task-192-sntl-cost-matrix-dkai)`
**PR**: [#620](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/620)
