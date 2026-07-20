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
| **상태** | 🔄 |

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

```ts
// 시그니처 예시 — 정확한 필드명은 zen_ups_base_rates 스키마 확인 후 결정
{ product_id: string; zone_id: string; weight_kg: number; valid_from: string; cost_price: number }
```

- **`selling_price` 파라미터를 아예 받지 않음**(입력 자체가 없으므로 실수로든 고의로든 판매가를 바꿀 방법이 없어야 함)
- 가드: `requireAdminManagerOrSubAdmin`(Issue #605에서 이미 구현된 함수 — `src/app/actions/ups/rates-mutation.ts` 기존 import 재사용)
- `zen_ups_base_rates`의 기존 행(product_id+zone_id+weight_kg+valid_from 매칭)에 대해 `cost_price` 컬럼만 UPDATE. 행이 없으면 에러(base rate 자체가 없는 조합에 원가만 등록하는 경우는 없다고 가정 — 필요 시 설계 의견으로 남길 것)

### 2. 화면 — 기존 `UpsBaseRateMatrix.tsx` 재사용

- 신규 컴포넌트 작성 지양. 기존 컴포넌트에 role 기반 분기 추가:
  - SUB_ADMIN 접근 시: `selling_price` 컬럼 읽기 전용(회색 처리 등), `cost_price` 컬럼만 클릭·편집 가능
  - ADMIN/MANAGER: 기존 그대로(둘 다 편집 가능, `upsertUpsBaseRate` 호출)
- 저장 시 호출하는 액션을 role에 따라 분기(`upsertUpsBaseRate` vs `upsertAgencyCostRate`)

### 3. 페이지 접근

`/admin/ups-rates`는 이미 SUB_ADMIN 라우트 권한이 있음(`STATIC_PERMISSIONS`, Issue #605) — 신규 라우트/권한 설정 불요. 기존 `canEdit` 판단 로직(`userRole === ADMIN || MANAGER || ZENITH_SUPER_ADMIN`)에 SUB_ADMIN 분기를 추가하되, "전체 편집 가능(canEdit)"과 "원가만 편집 가능(canEditCostOnly 등)"을 구분할 것 — SUB_ADMIN이 다른 탭(Zone·상품·유류할증 등)까지 편집 가능해지면 안 됨(기본요율 탭에서만, 그것도 cost_price만).

---

## [DoD]

- [ ] `upsertAgencyCostRate` 구현 — `selling_price` 입력 자체를 받지 않는 시그니처 확인
- [ ] `UpsBaseRateMatrix` SUB_ADMIN 모드(selling_price 읽기전용, cost_price만 편집) 구현
- [ ] 기본요율 탭 외 다른 탭(Zone·상품·유류할증·부가요금·급증수수료·Agency Policies)은 SUB_ADMIN에게 여전히 편집 불가 확인
- [ ] 기존 `upsertUpsBaseRate`·ADMIN 화면 동작 무수정 확인(회귀 없음)
- [ ] 단위 테스트: SUB_ADMIN이 `upsertAgencyCostRate` 호출 시 성공 / `upsertUpsBaseRate` 호출 시 거부(기존 가드 그대로 작동) 둘 다 검증
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

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

_(착수 시 작성)_
