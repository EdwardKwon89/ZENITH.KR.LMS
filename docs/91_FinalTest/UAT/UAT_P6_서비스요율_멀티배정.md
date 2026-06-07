# UAT_12 — Phase 6 신규 서비스 역할 모델 & 멀티 서비스 배정 구조

> **문서번호**: UAT-12
> **작성일**: 2026-06-07
> **작성자**: Riley (Gemini, PM / Product Owner)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **전제 IMP**: IMP-097 (DB Schema) · IMP-098 (Customs Rates) · IMP-099 (Delivery Rates) · IMP-100 (Service Rates Engine) · IMP-101 (Order UI Steps) · IMP-102 (Order List RLS Isolation) · IMP-103 (Carrier Rate Self-Registration)

---

## [UAT-12-01] Carrier 요율 등록 및 오더 생성 (운송 서비스 선택)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / CARRIER / SHIPPER |
| 화면 URL | /ko/admin/rates (요율 관리) → /ko/orders/new (신규 오더) |
| 예상 소요 시간 | 8분 |
| 사전 조건 | CARRIER (`test_carrier_e2e20@zenith.kr`) 및 SHIPPER (`test_shipper_e2e20@zenith.kr`) 로그인 계정 존재. |
| 관련 IMP | IMP-101 · IMP-103 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 계정으로 운송 서비스 요율 관리 페이지 진입 | `admin@zenith.kr` / `password1234` | 요율 목록 및 새 요율 등록 버튼 표시 | ☐ |
| 2 | /ko/admin/rates | 새 요율 등록 modal 오픈 및 데이터 입력 | Carrier: `E2E20 Carrier Corp`, Mode: `AIR`, Origin: `ICN`, Dest: `SIN`, Cost: `2.0`, Tiers: `[{ weight_min: 0, unit_price: 3.5 }]` | 요율 카드가 정상 저장 및 테이블에 리스트로 표출됨 | ☐ |
| 3 | /ko/orders/new | SHIPPER 계정으로 로그인 후 신규 오더 양식 진입 (Step 1) | `test_shipper_e2e20@zenith.kr` / `password1234` | 오더 기본 정보 폼 노출 | ☐ |
| 4 | /ko/orders/new | Step 1 입력 후 다음 단계 클릭 | Mode: `AIR`, Origin: `ICN`, Dest: `SIN`, Recipient Info, Weight: `100`, Item details | Step 2 (서비스 선택)으로 정상 전환 | ☐ |
| 5 | /ko/orders/new | Step 2에서 서비스 조합 "항공 운송만" 선택 후 다음 단계 클릭 | 선택: `항공 운송만` | Step 3 (요율 확인)으로 정상 전환 | ☐ |
| 6 | /ko/orders/new | Step 3에서 요율 정보 확인 후 제출 | 요율 선택: `E2E20 Carrier Corp` | 오더가 성공적으로 생성되고 오더 상세 화면(`/orders/[id]`)으로 리다이렉트됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 신규 운송 요율 카드 등록 및 조회 가능
- [ ] Step 1~3 위자드 폼이 순차적으로 정상 동작
- [ ] 오더 성공 제출 및 상세 리다이렉트 완료

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-02] Customs Broker 요율 등록 및 오더 생성 (항공 + 통관 서비스 선택)

| 항목 | 내용 |
|:----|:----|
| 역할 | CUSTOMS_BROKER / SHIPPER |
| 화면 URL | /ko/admin/customs-rates (통관 요율) → /ko/orders/new (신규 오더) |
| 예상 소요 시간 | 8분 |
| 사전 조건 | CUSTOMS_BROKER (`test_broker_e2e20@zenith.kr`) 및 SHIPPER 계정 존재 |
| 관련 IMP | IMP-098 · IMP-101 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/customs-rates | CUSTOMS_BROKER 계정으로 통관 요율 관리 페이지 진입 | `test_broker_e2e20@zenith.kr` / `password1234` | 통관 요율 목록 및 본인 조직 정보 기본 셋팅 확인 | ☐ |
| 2 | /ko/admin/customs-rates | "새 요율 등록" 클릭하여 통관 요율 등록 | Country Code: `SG`, weight/kg: `1.5`, cbm: `15.0`, fixed: `25.0`, transit: `1` | 통관 요율 카드가 정상 등록 및 활성화 표시됨 | ☐ |
| 3 | /ko/orders/new | SHIPPER 계정으로 로그인 후 신규 오더 위자드 진입 (Step 1) | `test_shipper_e2e20@zenith.kr` | 오더 기본 정보 폼 노출 | ☐ |
| 4 | /ko/orders/new | Step 1 입력 후 다음 단계 클릭 | Mode: `AIR`, Origin: `ICN`, Dest: `SIN`, Recipient Info, Weight: `50` | Step 2 (서비스 선택)으로 정상 전환 | ☐ |
| 5 | /ko/orders/new | Step 2에서 서비스 조합 "항공 + 통관" 선택 후 다음 단계 클릭 | 선택: `항공 + 통관` | Step 3 (요율 확인)으로 정상 전환 | ☐ |
| 6 | /ko/orders/new | Step 3에서 운임 요율과 통관 요율이 모두 출력되는지 확인 후 제출 | 요율 선택: `E2E20 Carrier Corp` & `E2E20 Customs Broker` | 두 서비스가 모두 바인딩된 오더가 성공적으로 생성 및 리다이렉트됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 관세사가 본인 조직 요율 카드를 직접 성공적으로 등록
- [ ] Step 2에서 "항공 + 통관" 서비스 조합 선택 시 운송/통관 복수 서비스 바인딩 검증
- [ ] Step 3에서 개별 서비스별 요율 카드 선택 및 최종 오더 생성 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-03] Delivery Agent 요율 등록(LOCAL+TOTAL) 및 오더 생성 (배송 서비스 선택)

| 항목 | 내용 |
|:----|:----|
| 역할 | DELIVERY_AGENT / SHIPPER |
| 화면 URL | /ko/admin/delivery-rates (배송 요율) → /ko/orders/new (신규 오더) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | DELIVERY_AGENT (`test_delivery_e2e20@zenith.kr`) 및 SHIPPER 계정 존재 |
| 관련 IMP | IMP-099 · IMP-101 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/delivery-rates | DELIVERY_AGENT 계정으로 배송 요율 관리 페이지 진입 | `test_delivery_e2e20@zenith.kr` / `password1234` | 배송 요율 목록 및 Local / Total 탭 인터페이스 표시 | ☐ |
| 2 | /ko/admin/delivery-rates | Local 탭에서 새 요율 등록 수행 | Country Code: `SG`, weight/kg: `0.8`, cbm: `8.0`, transit: `1` | Local 배송 요율 카드가 정상 등록 및 활성화됨 | ☐ |
| 3 | /ko/admin/delivery-rates | Total 탭으로 전환 후 새 요율 등록 수행 | Mode: `AIR`, Origin: `ICN`, Dest: `SIN`, weight/kg: `5.0`, cbm: `20.0`, transit: `2` | Total 배송 요율 카드가 정상 등록 및 활성화됨 | ☐ |
| 4 | /ko/orders/new | SHIPPER 계정으로 로그인 후 신규 오더 위자드 진입 (Step 1) | `test_shipper_e2e20@zenith.kr` | 오더 기본 정보 폼 노출 | ☐ |
| 5 | /ko/orders/new | Step 1 입력 후 다음 단계 클릭 | Mode: `AIR`, Origin: `ICN`, Dest: `SIN`, Recipient Info, Weight: `20` | Step 2 (서비스 선택)으로 정상 전환 | ☐ |
| 6 | /ko/orders/new | Step 2에서 서비스 조합 "배송(Total) — All-in" 선택 후 다음 단계 클릭 | 선택: `배송(Total) — All-in` | Step 3 (요율 확인)으로 전환되며, Total 배송 요율만 단독 매핑됨 | ☐ |
| 7 | /ko/orders/new | Step 3에서 요율 선택 후 오더 제출 | 요율 선택: `E2E20 Delivery Agent` (Total) | 오더가 성공적으로 생성 및 상세 화면 리다이렉트 완료 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 배송사가 본인 조직 요율 카드(Local 및 Total)를 직접 성공적으로 등록 및 조회 가능
- [ ] All-in (Total Delivery) 조합 선택 시 전구간 단일 요율 카드 매핑 및 최종 오더 생성 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-04] 역할별 오더 목록 조회 격리 (RLS 검증)

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER / CARRIER / CUSTOMS_BROKER / DELIVERY_AGENT / ADMIN |
| 화면 URL | /ko/orders (화주/ADMIN) 또는 /ko/orders/assigned (파트너) |
| 예상 소요 시간 | 8분 |
| 사전 조건 | E2E-P6-04 시나리오처럼 복수 서비스(운송, 통관, 배송)가 배정된 테스트 오더 존재 |
| 관련 IMP | IMP-102 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/assigned | 배정된 관세사 계정으로 로그인 후 목록 진입 | `test_broker_e2e20@zenith.kr` | 해당 오더가 정상 노출됨 | ☐ |
| 2 | /ko/orders/assigned | 배정되지 않은 타 관세사 계정으로 로그인 후 목록 진입 | `another_broker_e2e20@zenith.kr` | 해당 오더가 목록에 나타나지 않음 (RLS 격리) | ☐ |
| 3 | /ko/orders/assigned | 배정된 배송사 계정으로 로그인 후 목록 진입 | `test_delivery_e2e20@zenith.kr` | 해당 오더가 정상 노출됨 | ☐ |
| 4 | /ko/orders | 배정된 화주 계정으로 로그인 후 목록 진입 | `test_shipper_e2e20@zenith.kr` | 본인이 생성한 오더 정상 노출 | ☐ |
| 5 | /ko/orders | 플랫폼 관리자 계정으로 로그인 후 목록 진입 | `admin@zenith.kr` | 전체 오더 목록에 해당 오더 정상 노출 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 본인 서비스가 배정된 오더만 파트너 할당 오더(`/orders/assigned`)에 격리 표출됨
- [ ] 배정되지 않은 타 파트너(Customs Broker 등)에게는 오더 정보가 완전히 숨김 처리됨
- [ ] 화주는 본인 오더, Admin은 전체 오더 목록 조회 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-05] 서비스 미지원 시 오더 등록 차단 및 경고 배너 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER |
| 화면 URL | /ko/orders/new (신규 오더) |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 특정 국가(예: 일본, JP) 또는 특정 노선에 대한 통관/배송 요율 정보가 부재한 상태 |
| 관련 IMP | IMP-101 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/new | SHIPPER 계정으로 로그인 후 신규 오더 위자드 진입 (Step 1) | `test_shipper_e2e20@zenith.kr` | 오더 기본 정보 폼 노출 | ☐ |
| 2 | /ko/orders/new | 요율 부재 노선으로 Step 1 입력 후 다음 단계 클릭 | Mode: `AIR`, Origin: `ICN`, Dest: `NRT` (Japan), Recipient Info, Weight: `10` | Step 2 (서비스 선택)으로 전환 | ☐ |
| 3 | /ko/orders/new | Step 2에서 서비스 조합 "항공 + 통관" 선택 후 다음 단계 클릭 | 선택: `항공 + 통관` | Step 3 (요율 확인)으로 전환 | ☐ |
| 4 | /ko/orders/new | Step 3 진입 시 경고 배너 및 제출 버튼 상태 확인 | — | "이용 불가 서비스 감지" 경고 배너 노출, "오더 등록하기" 제출 버튼이 비활성화(disabled)됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 필수 서비스 요율이 부재할 시 Step 3에서 사용자에게 명확히 "이용 불가 서비스 감지" 배너 표시
- [ ] 제출 버튼이 비활성화되어 요율 없는 오더의 무단 제출이 원천 차단됨

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-06-07 | Riley (Gemini) | v1.0 초안 작성 — UAT-12-01~05 절차 5개, Phase 6 신규 서비스 역할 모델 & 멀티 서비스 배정 구조 검증 범위 정의 |
