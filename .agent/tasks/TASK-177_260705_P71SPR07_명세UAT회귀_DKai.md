# TASK-177 — Phase 7.1 SPR-07: API 명세·UAT 보강·전체 회귀 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-177 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | TASK-174·175·176 ✅ |
| **관련 IMP** | IMP-145 |
| **브랜치** | `feature/teama-phase71-ups-rate-management` |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🚫 (TASK-175·176 완료 후 착수) |

---

## [작업 범위]

### 1. API 명세 갱신 (R-12) — `docs/02_Analysis/Ds_11_API_상세_명세서.md`

An-14 §6·§11 기준 아래 API 계약을 명문화 (Team B가 GH #181 작업 시 참조):
- `estimateUpsFreight(input): UpsFreightEstimate` — 파라미터·반환 타입 전체, `agencyOrgId`/`shipperOrgId` 유무별 동작 분기 명시
- `fn_get_ups_agency_selling_price(agency_org_id, base_rate_id)` — SECURITY DEFINER DB 함수, 호출 권한 범위
- Admin 정책/부가요금 CRUD Action 목록(TASK-175·176 산출물)
- **명시적으로 기재**: `zen_agency_rate_overrides.cost_price`는 서버(트리거)가 계산하며 클라이언트 입력값은 무시됨

### 2. UAT 보강 — `docs/91_FinalTest/UAT/`

- **UAT-17-03 재실행**: `UAT_17_UPS특송오더발송.md`의 UAT-17-03(Agency 오버라이드 적용 요금계산 검증) 시나리오가 현재 미완료(미체크) 상태 — TASK-175·176 완료물 기준으로 재실행하여 체크박스 완료 처리. 실제 DB 조회로 값 확인 후 스크린샷/쿼리결과 첨부.
- **신규 UAT-20**: Admin의 Zone/기준요금/유류할증/OC 등록·수정 시나리오 (`UAT_20_UPS요율Admin등록.md` 신규 작성)
- **신규 UAT-21**: Admin 대리점 할인율 정책 설정 → Agency 원가 자동계산 검증 (`UAT_21_UPS Agency할인율정책.md` 신규 작성)
- `UAT_MASTER.md` 인덱스 갱신

> **UAT-22(화주 할인율 적용 최종운송비, R6)는 이 Task 범위 밖** — 오더 등록 화면 연동이 완료된 뒤(Team B #181)에나 화주 관점 UAT가 가능하므로, An-14 §11에 따라 Team B 작업 완료 후 별도 Task로 발령한다. 이 Task에서는 계산 로직 자체의 단위/통합 테스트(TC-UPS-ENGINE-05)로 갈음한다.

### 3. 전체 회귀 최종 확인

`rtk npm run test:regression` 전체 실행, Phase 7.1 전체(TASK-171~177) 누적 신규 테스트가 모두 PASS인지 최종 확인. `LIVE_REGRESSION_TEST_MAP.md` 헤더 최종 갱신.

## [DoD]

- [ ] `Ds_11_API_상세_명세서.md` (또는 관련 `Ds_11_DETAIL_*`) 갱신 완료
- [ ] UAT-17-03 재실행 및 완료 처리
- [ ] 신규 UAT-20·21 작성, `UAT_MASTER.md` 갱신
- [ ] 전체 회귀 최종 PASS 확인 및 `LIVE_REGRESSION_TEST_MAP.md` 헤더 갱신
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

동일 패턴. **완료 후 Aiden에게 보고** — Aiden이 Phase 7.1 전체(`feature/teama-phase71-ups-rate-management`)를 develop 대상 PR 1개로 생성하고 Issue #182 Closes 연동한다 (D_Kai는 PR 생성하지 않음).

## [발견 이슈]

_(담당 Task 범위 밖 이슈 발견 시 기재. 없으면 "없음")_
