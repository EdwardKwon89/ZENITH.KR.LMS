# GH#204: Admin UI — 20kg 초과 티어 요율 + Freight 최소운임 관리 탭 신규

## Meta 정보

| 항목 | 상세 내용 |
| :--- | :--- |
| **태스크 ID** | GH#204 |
| **발행일** | 2026-07-05 |
| **담당 Agent** | Riley (Gemini) |
| **관련 IMP** | IMP-146 |
| **브랜치** | `feature/teama-task-204-admin-ui-tier-dwb-riley` |
| **커밋 태그** | `[Riley]` |
| **상태** | 🔔 |

---

## 요구사항 및 분석

- **목적**: `zen_ups_weight_tier_rates` 및 `zen_ups_freight_minimums` 데이터를 웹 UI에서 직접 CRUD로 조작할 수 있도록 탭과 기능을 구현.
- **범위**:
  - `/admin/ups-rates` 내 "20kg 초과 티어 요율" 및 "Freight 최소운임" 탭 추가.
  - CRUD Server Actions 구현 (rates-mutation.ts 패턴).
  - UI 컴포넌트 목록 그리드(`ZenDataGrid`) 및 모달 폼 구현.
  - CRUD 단위 테스트 추가 및 전체 회귀 테스트 통과.

---

## [DoD]

- [x] `rates.ts`에 20kg 초과 티어 요율 및 최소운임 조회 Server Action 추가
- [x] `rates-mutation.ts`에 CRUD Server Action 추가 (upsert, delete)
- [x] `page.tsx`에서 새로운 데이터 패치 및 프롭 전파
- [x] `ups-rates-client.tsx` 탭 추가 및 데이터 바인딩
- [x] `WeightTierRateTable`, `FreightMinimumTable` 목록 뷰 구현
- [x] `WeightTierRateForm`, `FreightMinimumForm` 등록/수정 폼 구현
- [x] `handleSubmit`, `handleDelete` 이벤트 바인딩 완성
- [x] `tests/unit/ups/rates-admin-actions.test.ts` 신규 CRUD 테스트 추가
- [x] `npm run test:regression` 전체 PASS
- [x] `npx tsc --noEmit` 신규 오류 0건
- [x] `LIVE_REGRESSION_TEST_MAP.md` 및 `scratch/IMP_PROGRESS.md` 문서 갱신
- [x] `check-R17-DoD` 완료 및 최종 커밋 분리

---

## [작업 결과]

- **Server Actions**: `getUpsWeightTierRates`, `getUpsFreightMinimums` 및 CRUD mutations(`upsertUpsWeightTierRate`, `deleteUpsWeightTierRate`, `upsertUpsFreightMinimum`, `deleteUpsFreightMinimum`) 구현 완료
- **Admin UI**: `/admin/ups-rates` 화면에 2개 탭("20kg 초과 티어 요율", "Freight 최소운임") 신규 구현 완료
- **Unit Tests**: `tests/unit/ups/rates-admin-actions.test.ts`에 4종 테스트(`TC-UPS-ADMIN-08~11`) 추가 완료
- **Verification**: `npm run test:regression` (454/454 PASS) 및 `npx tsc --noEmit` (신규 에러 0건) 검증 완료

