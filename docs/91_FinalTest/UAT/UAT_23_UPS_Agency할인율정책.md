# UAT_23 — UPS Agency 할인율 정책 설정

> **문서번호**: UAT-23
> **작성일**: 2026-07-05
> **작성자**: D_Kai (DeepSeek)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-175·176 — UPS 요율 Admin UI + Agency UI (IMP-145)

---

## [UAT-23-01] Admin 대리점 할인율 정책 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 7분 |
| 사전 조건 | AGENCY type 조직(`UAT Agency Corp`)이 등록되어 있을 것, ADMIN 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "Agency 할인율 정책" 탭 클릭 | — | 할인율 정책 목록 표시 (현재 빈 상태) | ☐ |
| 2 | /ko/admin/ups-rates | [할인율 정책 등록] 버튼 클릭 | — | 모달 폼 오픈 (대리점 선택 + 할인율 입력) | ☐ |
| 3 | /ko/admin/ups-rates | 대리점 선택 및 할인율 입력 후 등록 | 대리점: `UAT Agency Corp`, 할인율: `15%` | 정책이 정상 등록되고 목록에 표시 | ☐ |
| 4 | /ko/admin/ups-rates | 등록된 정책 확인 | — | 할인율 15.00%, 활성 상태 표시 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_agency_pricing_policies WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e'` | — | `discount_rate = 0.15`, `is_active = true` 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] ADMIN이 대리점 할인율 정책 등록 가능
- [ ] DB에 정확한 할인율 저장 확인
- [ ] 500 에러 없음

---

## [UAT-23-02] AGENCY 계정에서 할인율 정책 읽기전용 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY |
| 화면 URL | /ko/agency/rate-overrides/new |
| 예상 소요 시간 | 5분 |
| 사전 조건 | UAT-21-01 완료 (할인율 정책 등록), `agency@zenith.kr` 로그인 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/rate-overrides/new | 대리점 계정(`agency@zenith.kr`)으로 로그인 후 요율 오버라이드 신규 등록 페이지 진입 | — | 신규 요율 등록 폼 표시 | ☐ |
| 2 | /ko/agency/rate-overrides/new | 폼에서 원가(cost_price) 필드 확인 | — | 원가 입력란이 **읽기전용**으로 표시되고 "Admin이 설정한 할인율에 따라 자동 계산됩니다" 문구 표시 | ☐ |
| 3 | /ko/agency/rate-overrides/new | 기준요율 선택 및 판매가 입력 후 등록 | 기준요율: 첫 번째 항목, 판매가: `85000` | 요율이 정상 등록됨 | ☐ |
| 4 | Supabase Studio | `SELECT selling_price, cost_price FROM zen_agency_rate_overrides WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e'` | — | `selling_price = 85000`, `cost_price`는 `기준요금 selling_price × (1-0.15)`로 자동 계산되어 저장됨 확인 | ☐ |

### 합격 기준
- [ ] cost_price 필드 읽기전용 확인
- [ ] cost_price 자동 계산 확인 (할인율 15% 반영)
- [ ] 500 에러 없음

---

## [UAT-23-03] 할인율 정책 미등록 시 에러 메시지 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (정책 미등록 대리점) |
| 화면 URL | /ko/agency/rate-overrides/new |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 할인율 정책이 등록되지 않은 AGENCY 계정 필요 (테스트 전용 추가 계정) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/rate-overrides/new | 정책 미등록 대리점 계정으로 로그인 후 요율 등록 페이지 진입 | — | 신규 요율 등록 폼 표시 | ☐ |
| 2 | /ko/agency/rate-overrides/new | 기준요율 및 판매가 입력 후 등록 버튼 클릭 | 기준요율: 첫 번째 항목, 판매가: `50000` | "담당 관리자에게 할인율 정책 등록을 요청하세요. 할인율이 설정되지 않은 대리점은 요율을 등록할 수 없습니다." 에러 메시지 표시 | ☐ |
| 3 | /ko/agency/rate-overrides/new | 등록 차단 확인 | — | 요율이 등록되지 않았음을 Supabase Studio로 확인 | ☐ |

### 합격 기준
- [ ] 정책 미등록 시 사용자 친화적 에러 메시지 표시
- [ ] 요율 등록 차단 확인
- [ ] 500 에러 없음 (비즈니스 로직 에러 메시지)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
