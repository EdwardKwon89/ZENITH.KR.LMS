# UAT_22 — UPS 요율 Admin 등록

> **문서번호**: UAT-22
> **작성일**: 2026-07-05
> **작성자**: D_Kai (DeepSeek)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-175 — UPS 요율 Admin UI 완성 (IMP-145)

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
| 1 | /ko/admin/ups-rates | 사이드바 > 기본 정보 > UPS 요율 관리 메뉴 클릭 | — | UPS 요율 관리 페이지 진입, 6개 탭 표시 | ☐ |
| 2 | /ko/admin/ups-rates | "Zone 관리" 탭이 선택된 상태 확인 | — | Zone 목록 테이블에 Z1~Z10 10개 Zone 표시 | ☐ |
| 3 | /ko/admin/ups-rates | [Zone 등록] 버튼 클릭 | — | 모달 폼 오픈 | ☐ |
| 4 | /ko/admin/ups-rates | 신규 Zone 정보 입력 후 등록 | Zone 코드: `Z99`, 명칭: `Test Zone`, Sort Order: `99` | Zone이 정상 등록되고 목록에 Z99 표시 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_ups_zones WHERE zone_code = 'Z99'` | — | `is_active = true`, `updated_at` 정상 기록 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
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
| 1 | /ko/admin/ups-rates | "기준요금" 탭 클릭 | — | 기준요금 목록(864건 시드 데이터) 표시 | ☐ |
| 2 | /ko/admin/ups-rates | 기준요금 테이블 컬럼 확인 | — | 제품·Zone·중량·판매가·원가·유효기간 컬럼 표시 | ☐ |
| 3 | Supabase Studio | `SELECT COUNT(*) FROM zen_ups_base_rates WHERE is_active = true` | — | 864건 이상 조회 확인 | ☐ |

### 합격 기준
- [ ] 기준요금 목록 정상 조회
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

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
