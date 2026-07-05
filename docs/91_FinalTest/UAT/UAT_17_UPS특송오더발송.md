# UAT_17 — UPS 특송 오더 발송

> **문서번호**: UAT-17
> **작성일**: 2026-06-19
> **작성자**: Riley (Gemini)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-161 — Phase 7 UPS 특송 UAT 시나리오 작성

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

## [UAT-17-03] 대리점 화주 요율 오버라이드가 적용된 UPS 요금 계산 검증

> **⚠️ 2026-07-05 Aiden 수정**: Phase 7.1(TASK-171, An-14 §3-3) 구현 결과에 맞춰 사전조건·절차·기대값을 정정했습니다. 기존 버전은 "대리점 오버라이드 = 정액 마크업(Markup) 가산" 모델을 전제로 작성됐으나, 실제 구현은 **① Admin이 대리점별 `discount_rate`(할인율) 정책을 먼저 설정 → ② Agency는 그 정책과 무관하게 화주에게 청구할 `selling_price`(판매가)만 직접 설정 → ③ `cost_price`(대리점 원가)는 서버 트리거가 `base_rate.selling_price × (1 - discount_rate)`로 자동 재계산(Agency 입력값 무시)** 하는 2단계 구조입니다. 마크업 가산 개념 자체가 존재하지 않습니다. **본 시나리오는 Team B #181(오더 연동) 완료 전에는 실행 불가**(정정 사유는 [DEF-095 검토 과정에서 파생 발견], 상세는 An-14 §11 참조) — 아래 절차는 #181 착수 시 Team B가 정확한 계약을 참고하도록 미리 정정해 둔 것입니다.

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (대리점에 소속된 화주) |
| 화면 URL | /ko/orders/new |
| 예상 소요 시간 | 7분 |
| 사전 조건 | ① **Admin**이 해당 대리점(`zen_organizations`)에 `zen_agency_pricing_policies.discount_rate` 정책을 등록(예: `0.30` = 30%) — **정책이 없으면 ②번 자체가 DB 트리거에서 예외 발생하여 차단됨** ② **Agency**가 해당 화주가 이용할 `base_rate_id`(제품·Zone·중량 조합)에 대해 `zen_agency_rate_overrides.selling_price`를 직접 등록(예: `74500` KRW) — `cost_price`는 입력해도 무시되고 서버가 자동 계산 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 0a | /ko/admin/ups-rates (Agency 할인율 정책 탭) | Admin 계정으로 대리점 할인율 정책 등록 | 대리점: 테스트 대리점 / `discount_rate`: `0.30` | 정책 저장 성공 | ☐ |
| 0b | /ko/agency/rate-overrides/new | Agency 계정으로 오버라이드 등록 | 기준요금: `WW_EXPRESS_DOC` / Zone `Z8` / `selling_price`: `74500` | 등록 성공, 화면에 표시된 `cost_price`가 `59500`(=85000×0.7)으로 **자동 계산되어 읽기전용 표시**됨 확인 | ☐ |
| 1 | /ko/orders/new | 대리점 소속 화주 계정으로 로그인 후 오더 등록 페이지 진입 | — | 오더 등록 폼 표시 | ☐ |
| 2 | /ko/orders/new | 운송 조건 설정 후 실시간 예상 운임 확인 | 목적지: `US` / 중량: `5.0 kg` / 운송모드: `UPS Express` | 실시간 예상 운임 계산 영역에 운임 표시 | ☐ |
| 3 | /ko/orders/new | 오버라이드 적용 여부 계산 검증 | — | Agency가 0b에서 등록한 `selling_price`(74500)가 그대로 화주 화면에 표시되는지 확인(할인율 계산식이 아니라 Agency가 정한 값 그대로) | ☐ |
| 4 | /ko/orders/new | 오더 등록 실행 및 저장 | — | 오더가 정상적으로 등록됨 | ☐ |
| 5 | Supabase Studio | `SELECT applied_unit_price FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | — | 요율 스냅샷 테이블에 Agency가 등록한 `selling_price`(74500)가 그대로 저장됨 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 할인율 정책 없는 대리점은 오버라이드 등록 자체가 차단됨(0a 생략 시 0b에서 에러 발생 확인)
- [ ] 대리점 하위 화주 오더 등록 시, Agency가 직접 설정한 `selling_price`가 실시간 UI 및 요율 스냅샷(DB)에 정확히 반영됨(할인율 기반 자동계산 아님 — 그건 `cost_price`에만 적용)
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 대리점 할인율 정책 등록 확인 | `SELECT discount_rate FROM zen_agency_pricing_policies WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e'` | `discount_rate` = 0.30 |
| 대리점 override cost_price 자동계산 확인 | `SELECT selling_price, cost_price FROM zen_agency_rate_overrides WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e'` | `selling_price` = 74500(Agency 입력값 그대로) / `cost_price` = 59500(=85000×(1-0.30), **Agency가 무엇을 입력해도 서버가 재계산**) |
| 요율 스냅샷 selling price 반영 | `SELECT applied_unit_price, applied_currency FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `applied_unit_price` = 74500, `applied_currency` = `'KRW'` |
| 오더 최종 금액 정합성 | `SELECT o.id, o.total_freight FROM zen_orders o JOIN zen_order_rate_snapshots rs ON rs.order_id = o.id WHERE o.order_no = '[생성된오더번호]'` | `o.total_freight` = 74500 (KRW) |
| 대리점별 격리 | `SELECT COUNT(*) FROM zen_agency_rate_overrides WHERE agency_org_id != '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND base_rate_id = (SELECT id FROM zen_ups_base_rates WHERE ups_product_code = 'WW_EXPRESS_DOC' LIMIT 1)` | 0 (타 대리점 override 미존재) |

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
