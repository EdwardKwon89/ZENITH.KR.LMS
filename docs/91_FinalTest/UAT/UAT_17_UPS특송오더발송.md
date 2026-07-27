# UAT_17 — UPS 특송 오더 발송

> **문서번호**: UAT-17
> **작성일**: 2026-07-15
> **작성자**: Riley (Gemini)
> **버전**: v2.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-185 — [Team A] UPS 급증 긴급 수수료 반영 — UAT-17/19 시나리오 갱신 (Issue #496)

> [!IMPORTANT]
> **v2.0 개정 사항 (2026-07-15, Riley)**
> - **급증 긴급 수수료(Surge Emergency Fee) 반영**: 도착국별 kg당 단가로 부과되는 급증 긴급 수수료 요금 계산 로직이 추가됨에 따라, UAT-17-03 시나리오 내에 Admin의 급증 수수료 사전 등록 절차(0c) 및 실시간 예상 운임 검증 시 수수료 합산 여부를 확인하는 세부 로직 및 기대 결과값(기본운임 할인 + 유류할증료 + 급증 수수료)을 추가/갱신함.

---

## [UAT-17-01] 직접배송(DIRECT) 선택 오더 등록 및 픽업 입력 차단 검증

| 항목 | 내용 |
|:----|:----|
|역할 | SHIPPER (화주) 또는 ADMIN |
| 화면 URL | /ko/orders/new |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 화주 또는 어드민 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/new | 사이드바 > 오더 관리 > [오더 등록] 메뉴 클릭 | — | 신규 오더 생성 마법사 진입 | ☑ |
| 2 | /ko/orders/new | 운송 수단에서 `UPS Express` 선택 | — | UPS 전용 입력 서식 활성화 및 발송 유형 라디오 버튼 노출 | ☑ |
| 3 | /ko/orders/new | 발송 유형에서 [직접 배송 (DIRECT)] 선택 | — | 픽업지 주소, 픽업 연락처 등의 입력 폼이 비활성화되거나 숨김 처리됨 | ☑ |
| 4 | /ko/orders/new | 나머지 오더 필수 정보 입력 후 [등록] 클릭 | 목적지: `US` / 수취인명: `John Doe` / 중량: `5.0 kg` 등 | 오더가 오류 없이 정상 생성됨 | ☑ |
| 5 | Supabase Studio | `SELECT delivery_method, pickup_location FROM zen_orders WHERE order_no = '[생성된오더번호]'` | — | `delivery_method = 'DIRECT'`, `pickup_location`를 포함한 픽업 관련 컬럼들이 전부 `NULL`로 적재됨 확인 | ☑ |

### 합격 기준
- [x] 전 단계 ☑ 완료
- [x] 직접 배송(DIRECT) 선택 시 UI에서 픽업지 입력 서식이 제어됨
- [x] DB 저장 시 픽업지 정보가 안전하게 null로 초기화됨
- [x] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-17-02] 픽업배송(PICKUP) 선택 오더 등록 및 픽업 필수값 유효성 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (화주) 또는 ADMIN |
| 화면 URL | /ko/orders/new |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 화주 또는 어드민 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/new | 오더 등록 페이지 진입 및 `UPS Express` 운송 선택 | — | UPS 전용 폼 노출 | ☑ |
| 2 | /ko/orders/new | 발송 유형에서 [픽업 요청 (PICKUP)] 선택 | — | 픽업지 주소, 픽업 연락처, 담당자명 등의 입력 폼 활성화 확인 | ☑ |
| 3 | /ko/orders/new | 픽업 필수 입력란을 비워둔 상태로 [등록] 버튼 클릭 | — | "픽업지 주소는 필수입니다." 및 "연락처는 필수입니다." 등의 검증 오류가 노출되며 등록이 차단됨 | ☑ |
| 4 | /ko/orders/new | 픽업 필수 입력 정보를 정상 입력 후 [등록] 클릭 | 픽업지 주소: `인천 서구 경서동 123` / 픽업 연락처: `032-111-2222` / 담당자: `김픽업` | 오더가 정상 생성됨 | ☑ |
| 5 | Supabase Studio | `SELECT delivery_method, pickup_location, pickup_contact_name, pickup_contact_tel FROM public.zen_orders WHERE order_no = '[생성된오더번호]'` | — | `delivery_method = 'PICKUP'` 및 입력한 픽업 정보들이 정상 적재됨을 확인 | ☑ |

### 합격 기준
- [x] 전 단계 ☑ 완료
- [x] 픽업 요청 시 픽업지 주소, 연락처, 담당자명의 Zod 유효성 검증이 올바르게 차단 기능을 수행함
- [x] DB에 입력한 픽업 데이터가 누락 없이 적재됨
- [x] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-17-03] 대리점 화주 Zone 할인율 및 급증 긴급 수수료가 적용된 UPS 요금 계산 검증

> **⚠️ 2026-07-13 Aiden 재수정**: 2026-07-10 Issue #310(JSJung 설계 확정, TASK-B-089)에서 요금 모델이 **다시 한번 전면 개편**되었습니다. 2026-07-05 버전이 전제한 "Agency가 `selling_price`를 직접 설정하고 `cost_price`가 자동 역산되는" 오버라이드 모델(`zen_agency_rate_overrides`)은 **테이블·트리거·함수·UI 전부 삭제**되었습니다. 신모델은 **Zone별 할인율 직접 설정** 방식입니다: **① Admin이 대리점별·Zone별 `zen_agency_pricing_policies.discount_rate`를 설정(대리점 자체 원가 마진 통제용) → ② Agency가 화주별·Zone별 `zen_agency_shipper_zone_discounts.discount_rate`를 직접 설정(Admin 판매가에 바로 적용, Agency 원가 경유 안 함) → ③ 두 할인율 모두 `getMaxAllowedZoneDiscount`(원가/판매가 마진 기반 상한) 가드를 통과해야 저장됨**. "판매가 직접 입력 + 원가 자동 역산" 개념은 더 이상 존재하지 않습니다.
> 
> **⚠️ 2026-07-15 Riley 급증 수수료 추가**: TASK-184(Issue #491)로 급증 긴급 수수료(Surge Emergency Fee) 계산 모델이 추가됨에 따라, 오더 예상 운임 계산 시 도착국별/기간별 급증 수수료가 최종 운송비에 정상적으로 반영 및 합산되는지 함께 검증합니다.

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (대리점에 소속된 화주) |
| 화면 URL | /ko/orders/new |
| 예상 소요 시간 | 10분 |
| 사전 조건 | ① **Admin**이 해당 대리점(`zen_organizations`, type=AGENCY)의 대상 Zone에 `zen_agency_pricing_policies.discount_rate` 정책을 등록(예: Zone `Z8` = `0.15` = 15%) — 원가 마진 상한 초과 시 저장 자체가 차단됨(`upsertAgencyPricingPolicy` 가드) ② **Agency**가 해당 화주(`zen_agency_shippers`로 연결된 SHIPPER 조직)의 대상 Zone에 `zen_agency_shipper_zone_discounts.discount_rate`를 직접 등록(예: Zone `Z8` = `0.10` = 10%, Admin 판매가에 직접 적용) ③ **Admin**이 해당 도착국(예: US, Zone `Z8`)에 대한 **급증 긴급 수수료**를 등록(예: kg당 판매단가 `2,000원`, 원가단가 `1,500원`, 유류할증 상시 적용) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 0a | /ko/admin/ups-rates ("Agency 할인율 정책" 탭) | Admin 계정으로 대리점·Zone별 할인율 정책 등록 | 대리점: `UAT Agency Corp` / Zone: `Z8` / `discount_rate`: `15%` | 정책 저장 성공 | ☐ |
| 0b | /ko/agency/ups-rates ("화주 할인율 관리" 탭) | Agency 계정으로 화주 선택 후 Zone 할인율 등록 | 화주: `UAT Agency Shipper Corp` / Zone: `Z8` / 할인율: `10%` | 저장 성공(원가 마진 상한 이내이므로 차단 없음) | ☐ |
| 0c | /ko/admin/ups-rates ("급증 수수료 설정" 탭) | Admin 계정으로 US 도착국 급증 긴급 수수료 구간 등록 | 도착국: `US` / 판매단가: `2,000` KRW / 원가단가: `1,500` KRW / 적용 시작일: 오늘 | 수수료 저장 성공 | ☐ |
| 1 | /ko/orders/new | 대리점 소속 화주 계정(`agency_shipper@zenith.kr`)으로 로그인 후 오더 등록 페이지 진입 | — | 오더 등록 폼 표시 | ☐ |
| 2 | /ko/orders/new | 운송 조건 설정 후 실시간 예상 운임 확인 | 목적지: `US`(Zone Z8) / 중량: `5.0 kg` / 운송모드: `UPS Express` | 실시간 예상 운임 계산 영역에 운임 표시 | ☐ |
| 3 | /ko/orders/new | 할인율 및 급증 긴급 수수료 적용 여부 계산 검증 | — | 화면의 예상 운임 상세 및 합계에 [기본운임 × (1 - 10%) + 유류할증료]에 추가로 [급증 긴급 수수료](2,000원 × 5.0kg)가 누락 없이 올바르게 합산된 금액인지 확인 | ☐ |
| 4 | /ko/orders/new | 오더 등록 실행 및 저장 | — | 오더가 정상적으로 등록됨 | ☐ |
| 5 | Supabase Studio | `SELECT applied_unit_price, metadata FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | — | 요율 스냅샷 테이블에 할인 및 급증 긴급 수수료가 적용된 최종 운송비 단가가 저장되고 metadata 내 세부 내역이 기록됨 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] Zone 할인율 정책이 없는 대리점·화주 조합은 0% 취급되거나(구현에 따라 다름, 실행 시 확인) UI 안내 표시
- [ ] 원가 마진 상한을 초과하는 할인율 입력 시 0a/0b 모두 저장 자체가 차단됨(`할인율이 원가 마진을 초과합니다` 에러)
- [ ] 대리점 하위 화주 오더 등록 시, Agency가 설정한 Zone 할인율과 Admin이 지정한 도착국 급증 긴급 수수료가 실시간 UI 및 요율 스냅샷(DB)에 정확히 반영됨
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 대리점 Zone 할인율 정책 등록 확인 | `SELECT discount_rate FROM zen_agency_pricing_policies WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | `discount_rate` = 0.15 |
| 화주 Zone 할인율 등록 확인 | `SELECT discount_rate FROM zen_agency_shipper_zone_discounts WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | `discount_rate` = 0.10 |
| 급증 수수료 단가 스냅샷 메타데이터 반영 | `SELECT metadata->'shipper'->>'surgeFeeSellingAmount' FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `10000.00` (또는 유류할증료가 적용된 경우 유류할증료 포함 계산값) |
| 요율 스냅샷 최종 합산 단가 반영 | `SELECT applied_unit_price, applied_currency FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `[기본운임 × (1 - 0.10)] + [유류할증료] + [급증 긴급 수수료]` 최종 합산 금액, `applied_currency` = `'KRW'` |
| 오더 최종 금액 정합성 | `SELECT o.id, o.total_freight FROM zen_orders o JOIN zen_order_rate_snapshots rs ON rs.order_id = o.id WHERE o.order_no = '[생성된오더번호]'` | `o.total_freight` = `applied_unit_price`와 일치 |
| 대리점별 격리 | `SELECT COUNT(*) FROM zen_agency_shipper_zone_discounts WHERE agency_org_id != '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND shipper_org_id = (SELECT id FROM zen_organizations WHERE name = 'UAT Agency Shipper Corp')` | 0 (타 대리점 소속 화주 할인율 미존재) |

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
