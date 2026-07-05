# TASK-B-060: Issue #181 — UPS 요금 견적 UI 연동 (오더 등록 화면 estimateUpsFreight 표시)

> **태스크 ID**: TASK-B-060
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: ⬜
> **선행 Task**: TASK-B-059 완료 권장 (createOrder snapshotData 파라미터 수신 측). JSJung 선행 착수 허가 시 develop 기반 선착수 가능 — B-059 머지 후 rebase 필수
> **연관 이슈**: [Issue #181](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/181)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-060-iss181-ups-estimate-ui-baker
```

> **B-059 머지 후**: `git rebase origin/develop` 실행하여 createOrder 변경분 반영.

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상, `Closes #181` 또는 `References #181`)

---

## 배경

Issue #181 프론트엔드 파트. Team A가 TASK-174에서 `estimateUpsFreight` 액션(`src/app/actions/ups/freight.ts`)을 노출 완료했으며, Dave(TASK-B-059)는 `zen_orders.agency_org_id` 주입 + `zen_order_rate_snapshots` 저장 백엔드를 구현 중이다.

Baker(B-060)는 오더 등록 화면에서 AGENCY_SHIPPER 역할 사용자가 **패키지 정보 입력 후 UPS 예상 요금을 확인하고, 오더 제출 시 견적 결과가 스냅샷으로 저장되도록** UI를 연동한다.

---

## 구현 범위

### §1 — `UpsFreightEstimatePanel` 신규 컴포넌트

파일: `src/components/orders/UpsFreightEstimatePanel.tsx`

```typescript
interface UpsFreightEstimatePanelProps {
  estimate: UpsFreightEstimate | null;  // src/app/actions/ups/freight.ts의 반환타입
  loading: boolean;
  error?: string | null;
}
```

표시 항목:
- `shipper.shipperSellingPrice` — 화주 납부금액 (주 표시)
- `agency.agencySellingPrice` — 대리점 판매가 (Agency 관리자용 보조 표시, AGENCY_SHIPPER에게는 숨김)
- `platform.totalSellingPrice` — 플랫폼 원가 (숨김 또는 Admin 전용)
- `estimate.platform.currency` — 통화 단위 표시

> ZEN_A4 준수: 50줄 이하 단일 책임 컴포넌트로 작성

### §2 — `OrderRegistrationForm` 연동

파일: `src/components/orders/OrderRegistrationForm.tsx` (기존 수정)

**연동 조건**: 현재 로그인 사용자의 `profile.role === 'AGENCY_SHIPPER'` 인 경우에만 활성화  
(`getCurrentUserAffiliation()` 이미 호출 중 → `affiliation.role` 활용)

**필요 입력값 — `estimateUpsFreight` 파라미터 매핑**:

| 파라미터 | 출처 |
|:--------|:-----|
| `productId` | UPS 제품 선택 드롭다운 신규 추가 (§2-1 참조) |
| `destCountryCode` | 수하인 국가 코드 (기존 폼 필드) |
| `actualWeightKg` | 패키지 합산 실중량 |
| `dimL/W/H` | 첫 번째 패키지 치수 (있는 경우) |
| `agencyOrgId` | `affiliation.orgId` (AGENCY_SHIPPER의 소속 대리점 org_id) |
| `shipperOrgId` | `affiliation.orgId` |

**§2-1 — UPS 제품 선택 드롭다운 추가**

`zen_ups_products` 조회 Server Action 또는 직접 fetch → 드롭다운 표시  
기존 `getAvailableServiceRates` 패턴 참조. transport_mode가 필요한 경우 'AIR' 고정 가정 (B-059 완료 후 조정 가능)

**§2-2 — 견적 호출 시점**

`productId` 선택 + `destCountryCode` 입력 + `actualWeightKg > 0` 조건 충족 시 자동 호출  
또는 "견적 확인" 버튼 방식 (구현 편의에 따라 Baker 결정)

**§2-3 — createOrder 호출 시 snapshotData 전달**

```typescript
// 오더 제출 시 estimate 결과를 createOrder에 전달 (B-059에서 처리)
const result = await createOrder({
  ...orderData,
  snapshotData: estimateResult ?? null,  // B-059 구현 전까지는 무시됨 (선택적 파라미터)
});
```

> B-059의 createOrder 수정 이전에는 TypeScript 호환을 위해 타입 단언(as any) 또는 선택적 처리 사용 가능 — B-059 머지 후 정리

### §3 — TC 추가 (R-09)

| TC ID | 항목 | 목적 | 파일 |
|:------|:-----|:-----|:-----|
| TC-P7-UI-ESTIMATE-01 | AGENCY_SHIPPER 역할 + 필수 입력 완료 시 UPS 견적 패널 표시 | UI 조건 분기 검증 | `tests/unit/orders/ups-estimate-panel.test.ts` |
| TC-P7-UI-ESTIMATE-02 | AGENCY_SHIPPER 아닌 역할에서 패널 미표시 | 역할 기반 표시 격리 | `tests/unit/orders/ups-estimate-panel.test.ts` |

---

## DoD (완료 기준)

- [ ] `UpsFreightEstimatePanel` 컴포넌트 작성 (50줄 이하, ZEN_A4 준수)
- [ ] AGENCY_SHIPPER 조건 분기 — 해당 역할에서만 견적 섹션 표시
- [ ] UPS 제품 선택 드롭다운 추가 (`zen_ups_products` 기반)
- [ ] `estimateUpsFreight` 호출 연동 (productId + destCountryCode + 중량 조건 충족 시)
- [ ] 견적 결과 UI 표시 — shipper_price 중심
- [ ] `createOrder` 호출 시 `snapshotData` 파라미터 전달 (선택적 — B-059 연동 준비)
- [ ] TC-P7-UI-ESTIMATE-01 / ESTIMATE-02 신규 작성 및 PASS
- [ ] `LIVE_REGRESSION_TEST_MAP.md` § 44 추가
- [ ] 전체 회귀 PASS (`rtk npm run test:regression`)
- [ ] `OrderRegistrationForm.tsx` Hard Limit (1,500줄) 초과 금지 — 신규 코드는 별도 컴포넌트로 분리
- [ ] R-17 커밋 분리 (코드 커밋 / 문서 커밋)
- [ ] PR 생성 (`References #181`, develop 대상)

---

## [설계 의견]

_(해당 없음 — Jaison 착수 승인 포함하여 발령)_

## [설계 확정]

_(Jaison 착수 승인: 2026-07-05 발령 시 포함)_

## [작업 결과]

_(완료 후 기재)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-05 | Jaison | TASK-B-060 발령 — Issue #181 UPS 견적 UI 연동 (Baker 담당) · estimateUpsFreight + UpsFreightEstimatePanel + createOrder snapshotData 전달 |
