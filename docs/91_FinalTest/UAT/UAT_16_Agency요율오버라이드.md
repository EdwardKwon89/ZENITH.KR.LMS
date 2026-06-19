# UAT_16 — Agency 요율 오버라이드

> **문서번호**: UAT-16
> **작성일**: 2026-06-19
> **작성자**: Riley (Gemini)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-161 — Phase 7 UPS 특송 UAT 시나리오 작성

---

## [UAT-16-01] 대리점 요율 오버라이드 신규 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/rate-overrides/new |
| 예상 소요 시간 | 5분 |
| 사전 조건 | AGENCY 권한 계정으로 로그인 상태, 하위 화주 및 기존 요율 카드가 등록되어 있을 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/rate-overrides | 사이드바 > 대리점 관리 > [요율 오버라이드] 메뉴 클릭 | — | 요율 오버라이드 목록 페이지 진입 | ☐ |
| 2 | /ko/agency/rate-overrides | [신규 오버라이드 등록] 버튼 클릭 | — | 등록 페이지(/ko/agency/rate-overrides/new) 이동 | ☐ |
| 3 | /ko/agency/rate-overrides/new | 대상 화주 선택, 요율 카드 선택 및 마크업 금액 입력 후 [저장] 클릭 | 화주: `UAT Agency Shipper` / 요율 카드: `UPS Express Zone 1` / 오버라이드 유형: `MARKUP_FLAT` / 오버라이드 값: `15.00` | "요율 오버라이드가 성공적으로 등록되었습니다." 알림 표시 및 목록 페이지로 이동 | ☐ |
| 4 | /ko/agency/rate-overrides | 목록 결과 확인 | — | 목록 테이블에 방금 등록한 `UAT Agency Shipper` 대상 오버라이드가 `15.00 (Flat Markup)` 및 `ACTIVE` 상태로 표시됨 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_agency_rate_overrides WHERE agency_org_id = '[대리점ID]'` | — | `shipper_org_id`, `rate_card_id`, `override_type = 'MARKUP_FLAT'`, `override_value = 15.00` 데이터 정상 생성 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] Zod 검증을 통해 오버라이드 값 음수 입력 차단 확인
- [ ] 중복 등록 방지 로직 작동 확인 (동일 화주 + 동일 요율 카드로 재등록 시도 시 에러 팝업 등 차단 처리)
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-16-02] 대리점 요율 오버라이드 목록 조회 및 RLS 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/rate-overrides |
| 예상 소요 시간 | 5분 |
| 사전 조건 | AGENCY A 및 AGENCY B 계정에 각각 요율 오버라이드가 1건 이상 등록되어 있을 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/rate-overrides | AGENCY A 계정으로 로그인 후 요율 오버라이드 목록 조회 | — | AGENCY A가 등록한 요율 오버라이드 목록만 나타남 | ☐ |
| 2 | /ko/agency/rate-overrides | 목록 확인 | — | AGENCY B의 요율 오버라이드는 목록에 절대 표시되지 않음 | ☐ |
| 3 | /ko/agency/rate-overrides | 로그아웃 후 AGENCY B 계정으로 로그인하여 동일 화면 조회 | — | AGENCY B의 요율 오버라이드 목록만 나타나며, AGENCY A의 데이터는 차단됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] RLS 정책(`zen_agency_rate_overrides` 테이블)이 올바르게 작동하여 타 대리점의 오버라이드 데이터가 유출되지 않음
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-16-03] 대리점 요율 오버라이드 비활성화 (Deactivate)

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/rate-overrides |
| 예상 소요 시간 | 5분 |
| 사전 조건 | `ACTIVE` 상태의 요율 오버라이드가 최소 1건 이상 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/rate-overrides | 대상 오버라이드 행의 [비활성화] 또는 [중단] 버튼 클릭 | — | "이 요율 오버라이드를 비활성화하시겠습니까?" 대화상자 표시 | ☐ |
| 2 | 확인 대화상자 | [확인] 또는 [예] 클릭 | — | "비활성화되었습니다." 알림 표시 | ☐ |
| 3 | /ko/agency/rate-overrides | 비활성화 결과 목록 확인 | — | 목록에서 해당 항목의 상태가 `INACTIVE`로 실시간 업데이트됨을 확인 | ☐ |
| 4 | Supabase Studio | `SELECT is_active FROM zen_agency_rate_overrides WHERE id = '[오버라이드ID]'` | — | `is_active = false` 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 비활성화 시 물리 삭제(Hard Delete)가 아닌 논리 삭제(`is_active = false` 로 Soft Update) 됨을 확인
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
