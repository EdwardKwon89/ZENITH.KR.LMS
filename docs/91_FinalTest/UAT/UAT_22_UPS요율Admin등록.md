# UAT_22 — UPS 요율 Admin 등록

> **문서번호**: UAT-22
> **작성일**: 2026-07-13
> **작성자**: Riley (Gemini)
> **버전**: v2.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-183 — UPS 특송 UAT 문서 5건 종합 검토·갱신 (UAT-15·18·19·20·22)

> [!IMPORTANT]
> **v2.0 개정 사항 (2026-07-13, Riley)**
> - **탭 개수 현행화 (6개 -> 8개)**: Phase 7.2 (IMP-146)에서 신규 추가된 "20kg 초과 티어 요율" 및 "Freight 최소운임" 관리 탭을 포함하여 총 8개 탭으로 목록 검증 항목을 갱신.
> - **신규 요율 시나리오 추가**: 
>   - `UAT-22-04` (20kg 초과 티어 요율 등록 및 수정) 신설.
>   - `UAT-22-05` (Freight 최소운임 등록 및 수정) 신설.

---

## [UAT-22-01] Zone 등록 및 국가 매핑

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 또는 MANAGER 계정 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | 사이드바 > 기본 정보 > UPS 요율 관리 메뉴 클릭 | — | UPS 요율 관리 페이지 진입, **8개 탭** 표시 (Zone 관리, 제품 관리, 기준요금, 유류할증, 부가요금, Agency 할인율 정책, 20kg 초과 티어 요율, Freight 최소운임) | ☐ |
| 2 | /ko/admin/ups-rates | "Zone 관리" 탭이 선택된 상태 확인 | — | Zone 목록 테이블에 Z1~Z10 등 기존 Zone 정보 표시 | ☐ |
| 3 | /ko/admin/ups-rates | [Zone 등록] 버튼 클릭 | — | 모달 폼 오픈 | ☐ |
| 4 | /ko/admin/ups-rates | 신규 Zone 정보 입력 후 등록 | Zone 코드: `Z99`, 명칭: `Test Zone`, Sort Order: `99` | Zone이 정상 등록되고 목록에 Z99 표시 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_ups_zones WHERE zone_code = 'Z99'` | — | `is_active = true`, `updated_at` 정상 기록 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 8개 탭 정상 렌더링
- [ ] Zone CRUD 정상 동작
- [ ] 500 에러 없음

---

## [UAT-22-02] 기준요금 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 7분 |
| 사전 조건 | ADMIN 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "기준요금" 탭 클릭 | — | 기준요금 목록 및 Matrix 표출 확인 | ☐ |
| 2 | /ko/admin/ups-rates | 기준요금 테이블 또는 셀 수정 모달 확인 | — | 제품·Zone·중량·판매가·원가·유효기간 컬럼 및 데이터 표시 | ☐ |
| 3 | Supabase Studio | `SELECT COUNT(*) FROM zen_ups_base_rates WHERE is_active = true` | — | 시드 데이터 및 등록 건수 조회 확인 | ☐ |

### 합격 기준
- [ ] 기준요금 목록 및 매트릭스 정상 조회
- [ ] 판매가/원가 컬럼 정상 표시
- [ ] 유효기간 정보 정상 표시

---

## [UAT-22-03] 유류할증 및 부가요금 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "유류할증" 탭 클릭 | — | 유류할증료 목록 표시 (제품별 할증률) | ☐ |
| 2 | /ko/admin/ups-rates | "부가요금" 탭 클릭 | — | 부가요금 목록 표시 (DDU/DDP/OVERSIZE 등 12종) | ☐ |
| 3 | /ko/admin/ups-rates | 부가요금 목록에 신규 4종 확인 | — | DUTY_AMOUNT, TARIFF_LINES_FEE, INTL_PROCESSING_FEE, DISBURSEMENT_FEE 존재 확인 | ☐ |

### 합격 기준
- [ ] 유류할증 탭 정상 표시
- [ ] 부가요금 12종(기존 8종 + 신규 4종) 정상 표시
- [ ] 유류할증 부과 대상 여부 컬럼 정상 표시
- [ ] 500 에러 없음

---

## [UAT-22-04] 20kg 초과 티어 요율 등록 및 수정

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 7분 |
| 사전 조건 | ADMIN 로그인 상태, 적용 대상 제품 및 Zone이 최소 1개 이상 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "20kg 초과 티어 요율" 탭 클릭 | — | 20kg 초과 티어 요율 목록 테이블 노출 | ☐ |
| 2 | /ko/admin/ups-rates | [티어 요율 등록] 버튼 클릭 | — | 티어 요율 등록 입력 모달 오픈 | ☐ |
| 3 | /ko/admin/ups-rates | 요율 정보 입력 후 [저장] 클릭 | **제품**: `WW_EXPRESS` (선택)<br>**Zone**: `Z1` (선택)<br>**최소 중량**: `21` (kg)<br>**최대 중량**: `70` (kg)<br>**판매가 / kg**: `6500` (원)<br>**원가 / kg**: `4000` (원)<br>**유효 시작일**: 오늘 날짜<br>**활성 체크박스**: 체크함 | 요율 정보 저장 완료 및 테이블 목록 최상단에 추가된 데이터 표시됨 | ☐ |
| 4 | /ko/admin/ups-rates | 등록한 티어 요율의 [수정] (연필 아이콘) 클릭 | — | 모달에 기존 정보 로딩 확인 | ☐ |
| 5 | /ko/admin/ups-rates | 판매가 수정 후 [저장] 클릭 | **판매가 / kg**: `7000` (원) | 판매가가 `7,000원`으로 변경되어 테이블에 표시됨 | ☐ |
| 6 | Supabase Studio | `SELECT price_per_kg_selling, price_per_kg_cost, tier_min_kg FROM zen_ups_weight_tier_rates WHERE tier_min_kg = 21` | — | `price_per_kg_selling = 7000`, `price_per_kg_cost = 4000` 정상 적재 확인 | ☐ |

### 합격 기준
- [ ] 20kg 초과 티어 요율의 추가/수정 모달이 정상 동작함
- [ ] 입력한 판매가 및 원가가 테이블과 DB에 정상적으로 반영됨
- [ ] 500 에러 없음

---

## [UAT-22-05] Freight 최소운임 등록 및 수정

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 7분 |
| 사전 조건 | ADMIN 로그인 상태, 적용 대상 제품 및 Zone이 최소 1개 이상 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "Freight 최소운임" 탭 클릭 | — | Freight 최소운임 목록 테이블 노출 | ☐ |
| 2 | /ko/admin/ups-rates | [최소운임 등록] 버튼 클릭 | — | 최소운임 등록 입력 모달 오픈 | ☐ |
| 3 | /ko/admin/ups-rates | 운임 정보 입력 후 [저장] 클릭 | **제품**: `WW_EXPRESS` (선택)<br>**Zone**: `Z2` (선택)<br>**최소 판매가**: `120000` (원)<br>**최소 원가**: `80000` (원)<br>**활성 체크박스**: 체크함 | 최소운임 정보 저장 완료 및 테이블 목록 최상단에 추가된 데이터 표시됨 | ☐ |
| 4 | /ko/admin/ups-rates | 등록한 최소운임의 [수정] (연필 아이콘) 클릭 | — | 모달에 기존 정보 로딩 확인 | ☐ |
| 5 | /ko/admin/ups-rates | 최소 판매가 수정 후 [저장] 클릭 | **최소 판매가**: `130000` (원) | 최소 판매가가 `130,000원`으로 변경되어 테이블에 표시됨 | ☐ |
| 6 | Supabase Studio | `SELECT min_charge_selling, min_charge_cost FROM zen_ups_freight_minimums WHERE min_charge_cost = 80000` | — | `min_charge_selling = 130000`, `min_charge_cost = 80000` 정상 적재 확인 | ☐ |

### 합격 기준
- [ ] Freight 최소운임 추가/수정 모달이 정상 동작함
- [ ] 입력한 최소 판매가 및 최소 원가가 테이블과 DB에 정상적으로 반영됨
- [ ] 500 에러 없음
