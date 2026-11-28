# DEF-149 | `agency/shippers.ts` 서비스롤(`createAdminClient`) 조회·수정 시 대리점 소속(`agency_org_id`) 소유권 검증 누락 외 요율 액션 인가 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1159 (Issue #1345, R-12 Ds-11 미반영 1차 20개 함수 문서화) 수행 중, `src/app/actions/agency/*` 및 `src/app/actions/admin/{customs-rates,delivery-rates,surcharges}.ts` 20개 함수의 권한 가드를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: 타 대리점 소속 화주 조회·생성·수정 가능한 교차 테넌트 IDOR) / **Medium** (2·3번 항목: 요율 수정 시 `org_id` 변경값 미검증 및 조회 액션 역할 가드 부재) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1345 (TASK-1159) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · R-12 · R-18 |
| **조치 상태** | **해소됨** (코드 해소: PR #1473 / 커밋 `b58696d3`, 2026-11-23 `develop` 역병합; 1.3 조회 가드 세부 정합성 별도 확인) |

> **공개 저장소 기준 (R-18 / IS #1489)**: 우회 시나리오 및 함수별 상세 취약 서술은 제거하고 목표 상태·조치 결과 요약만 유지합니다.

---

## 1. 요약 (목표 상태 기준)

- `src/app/actions/agency/shippers.ts`: `AGENCY` 권한 호출 시 본인 소속 대리점(`profile.org_id === agency_org_id`) 소유권 검증 적용 완료 (PR #1473).
- `src/app/actions/admin/{customs-rates,delivery-rates}.ts`: 파트너 역할(`CUSTOMS_BROKER`, `DELIVERY_AGENT`) 수정 시 `org_id` 고정 및 `is_active` 필터 화이트리스트 정합화.
- `src/app/actions/agency/shipper-link.ts`, `admin/surcharges.ts`: 조회 액션 역할·소유권 가드 정합성 정렬.

---

## 3. 권장 조치

1. **`src/app/actions/agency/shippers.ts` (즉시/High 권장)**:
   - `ZENITH_SUPER_ADMIN`(및 필요 시 플랫폼 `ADMIN`)이 아닌 경우:
     - `getAgencyShippers`, `createAgencyShipper`: 진입부에서 `if (agencyOrgId !== profile.org_id)` 즉시 차단.
     - `getAgencyShipperById`, `updateAgencyShipper`, `updateAgencyShipperGrade`: 대상 `zen_agency_shippers` 행 조회 시 `.eq('agency_org_id', profile.org_id)` 조건을 강제하거나 조회된 `agency_org_id !== profile.org_id` 시 즉시 차단.
2. **`src/app/actions/admin/customs-rates.ts` · `delivery-rates.ts` (Medium)**:
   - `updateCustomsRate` / `updateDeliveryRate`에서 호출자가 `CUSTOMS_BROKER` / `DELIVERY_AGENT`일 때는 `updateData.org_id = profile.org_id`(또는 `data.org_id !== profile.org_id` 거부)로 고정.
   - `getCustomsRates` / `getDeliveryRates`의 `is_active = true` 필터를 블랙리스트 방식 대신 "`ADMIN`·`MANAGER`·본인 조직 파트너 외에는 모두 `is_active = true`만 조회"하는 화이트리스트 방식으로 전환.
3. **`src/app/actions/admin/surcharges.ts` (Low/Medium)**:
   - `MANAGER` 역할 허용 여부를 다른 요율 모듈(`customs-rates`, `delivery-rates`, `rates`)과 정합화하고, 비관리자 호출 시 `is_active = true` 필터 적용 검토.
