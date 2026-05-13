# Multi-Agent Task Board

> **프로젝트:** ZENITH_LMS
> **업데이트:** 2026-05-13 (KST) — FB-017 PASS (코드 구현 기준 완료 처리) / GOV-001~002 D_Kai Phase 1 PASS / GOV-003~005 Phase 2 착수 가능
> **운영 원칙:**
> - 각 에이전트는 작업 완료 시 **SECTION 1 상태 대시보드를 최우선 갱신**한 뒤 담당 SECTION 상세를 업데이트한다.
> - Riley는 완료 보고 시 반드시 `## 🔔 Aiden 검토 대기` 테이블에 항목을 추가한다.
> - D_Kai는 완료 보고 시 반드시 `## 🔔 Aiden 검토 대기` 테이블에 항목을 추가한다.
> - Aiden은 새 세션 시작 시 SECTION 1만 읽어 즉시 현황을 파악한다.
>
> **Git 운영 규칙:**
> - **커밋 접두사**: Riley → `[Gemini]` / Aiden → `[Claude]` / D_Kai → `[OpenCode]` — 에이전트 식별 필수
> - **커밋 단위**: Task ID 단위 원자적 커밋. 메시지에 Task ID 포함 필수
>   - 형식: `[Gemini] fix: BUG-UI-01 Admin 다크테마 제거` / `[Claude] docs: E2E-01 FINAL PASS 검증 결과`
> - **완료 보고 전 git status 확인 의무**: `git status` 실행 → untracked·unstaged 파일 없음 확인 후 보고
>   - 미커밋 파일 잔류 상태에서의 완료 보고는 **불인정**
> - **결과물 정리 후 커밋**: 스크린샷·로그 커밋 시 실패 run artifact(`*_error.png` 등) 제거 후 커밋
> - **브랜치**: `main` 단일 브랜치 운영. 대규모 변경(100줄↑ 신규 기능) 시 `feature/*` 분기 후 PR
>
> **관리 규칙:**
> - **라인 수**: 800줄 이하 유지 (초과 시 즉시 이관 조치)
> - **파일 분리 예외**: TASK_BOARD는 다중 에이전트 협업 조율 파일로, 800줄 초과 시 Overview/Detail 파일 분리 대신 **아카이브 이관**으로 줄 수를 관리한다.
> - **완료 태스크**: SECTION 2·4 섹션 내 **3개** 초과 시 → `.agent/archive/TASKS_[PHASE명].md` 이관
> - **Handoff 메시지 — 2-Tier 관리**:
>   - **Active 지시** (수신자 완료 보고 미수신): 이관 불가
>   - **Closed 교환** (지시 + 완료 보고 쌍 완성): **3개** 초과 시 → `.agent/archive/MSG_YYYY-MM-DD.md` 이관
> - TASK_BOARD는 **활성·대기 태스크 + Active 지시 전체 + Closed 교환 최대 3개**까지 유지
> - **Phase 3~4 완료 Sprint 태스크 이력** → [archive/TASKS_PHASE4.md](.agent/archive/TASKS_PHASE4.md)
> - **Phase 4 Handoff 이력 (2026-04-29)** → [archive/MSG_2026-04-29.md](.agent/archive/MSG_2026-04-29.md)
> - **Sprint 12 CLOSED 이관 (2026-04-30)** → [archive/MSG_2026-04-30.md](.agent/archive/MSG_2026-04-30.md)
> - **CLOSED 이관 (2026-05-03)** → [archive/MSG_2026-05-03.md](.agent/archive/MSG_2026-05-03.md)
> - **CLOSED 이관 (2026-05-07)** → [archive/MSG_2026-05-07.md](.agent/archive/MSG_2026-05-07.md) (FB-004~007 / E2E-05~06)
> - **CLOSED 이관 (2026-05-07-b)** → [archive/MSG_2026-05-07-b.md](.agent/archive/MSG_2026-05-07-b.md) (FB-008~012 / E2E-08~10 착수허가·Riley완료보고)
> - **CLOSED 이관 (2026-05-08)** → [archive/MSG_2026-05-08.md](.agent/archive/MSG_2026-05-08.md) (E2E-08~11 Aiden검증·FB-009/012/013 CLOSED·E2E-11 착수허가)
> - **CLOSED 이관 (2026-05-08-b)** → [archive/MSG_2026-05-08-b.md](.agent/archive/MSG_2026-05-08-b.md) (E2E-12 착수허가·E2E-11 Aiden검증·FB-013 CLOSED)

---

# SECTION 1 — 상태 대시보드

---

## 🔔 Aiden 검토 대기

> Riley가 완료 보고 후 Aiden 검증이 필요한 항목. Aiden 검증 완료 시 행 삭제.

| Task ID | 지시자 | Task 명 | 지시일 |
|:---|:---|:---|:---|
| **GOV-003~005** | D_Kai | [Phase 2] GEMINI·AGENTS DoD 수정 + PreToolUse Bash 제외 + ACTIVE_AGENT 포맷 개선 | 2026-05-13 |
| _(없음 — 모두 검토 완료)_ | — | — | — |

---

## 🆕 신규 지시 대기 (Riley 착수 가능)

| Task ID | 지시자 | Task 명 | 지시일 |
|:---|:---|:---|:---|
| _(없음 — 대기 중 신규 지시 없음)_ | — | — | — |

## 🆕 신규 지시 대기 (D_Kai 착수 가능)

> ⚠️ **D_Kai 전용 지시입니다. 다른 에이전트는 참조만 가능하며 착수 불가.**
> 반드시 **Phase 1 → Phase 2 → Phase 3 순서**로 진행하고, 각 Phase 완료 후 Aiden 검토 대기 등록 후 다음 Phase 착수 가능.

| Task ID | Phase | Task 명 | 지시일 | 상태 |
|:---|:---:|:---|:---|:---:|
| ~~**GOV-001**~~ | 1 | ACTIVE_AGENT.md IDLE 강제 초기화 | 2026-05-13 | ✅ **Aiden PASS** |
| ~~**GOV-002**~~ | 1 | `~/.claude/settings.json` PostToolUse GitNexus Hook 제거 | 2026-05-13 | ✅ **Aiden PASS** |
| ~~**GOV-003**~~ | 2 | `GEMINI.md` + `AGENTS.md` Task 완료 DoD에 IDLE 초기화 추가 | 2026-05-13 | ✅ **완료** |
| ~~**GOV-004**~~ | 2 | `~/.claude/settings.json` PreToolUse Bash 제외 + `GOV_COMMON.md` 예외 조항 신설 | 2026-05-13 | ✅ **완료** |
| ~~**GOV-005**~~ | 2 | `ACTIVE_AGENT.md` `last_verified_at` + `status_age_limit_hours` 필드 추가 | 2026-05-13 | ✅ **완료** |
| **GOV-006** | 3 | `GOV_COMMON.md` "단순 질문 시 분석 생략" 규칙 반영 | 2026-05-13 | 🔒 Phase 2 Aiden 검토 후 |
| **GOV-007** | 3 | `GOV_COMMON.md` R-16 신설 — 세션 시작 시 상태 파일 일관성 검증 | 2026-05-13 | 🔒 Phase 2 Aiden 검토 후 |
| **GOV-008** | 3 | B_Kai on-demand 전용 운영 체계 문서화 | 2026-05-13 | 🔒 Phase 2 완료 후 |
| **GOV-009** | 3 | SAR-2026-05-12-001 미조치 항목 이행 점검 | 2026-05-13 | 🔒 Phase 2 완료 후 |
| ~~**FB-016**~~ | Aiden | FEAT-RATES 반려 — BUG-FR-001/002 + R-09/R-10 조치 | ❌ 2차 반려 (FB-017 대체) |
| ~~**FEAT-RATES**~~ | Aiden | 요율 관리 고도화 (IMP-002 + IMP-011) | ✅ 구현 완료 / ❌ 검증 반려 |
| ~~**AUDIT-S3**~~ | Aiden | 법인회원 관리·탈퇴 기능 구현 착수 허가 | ✅ 완료 |
| ~~**FB-014**~~ | Aiden | AUDIT-S1 반려 — 4개 결함 조치 | ✅ CLOSED |
| ~~**FB-015**~~ | Aiden | AUDIT-S2 반려 — IMP-010 하드코딩 미제거 | ✅ CLOSED |

---

## 📊 전체 활성 태스크 현황

| Task ID | 담당 | Task 명 | 상태 | 블로커 |
|:---|:---|:---|:---:|:---|
| ~~**FB-017**~~ | Riley | R-10 스크린샷 재제출 (요율 관리 UI 3종) | ✅ **PASS (2026-05-13)** | 코드 구현 기준 완료 |
| ~~**GOV-001~002**~~ | D_Kai | [Phase 1] SAR-2026-05-13-001 거버넌스 조치 (즉시) | ✅ **Aiden PASS (2026-05-13)** | — |
| ~~**GOV-003~005**~~ | D_Kai | [Phase 2] SAR-2026-05-13-001 거버넌스 조치 (단기) | ✅ **Aiden 검토 대기** | — |
| **GOV-006~009** | D_Kai | [Phase 3] SAR-2026-05-13-001 거버넌스 조치 (장기) | 🔒 Phase 2 Aiden 검토 후 | — |
| ~~**FB-016**~~ | Riley | FEAT-RATES 2차 반려 재작업 | ❌ 2차 반려 | FB-017 대체 |
| ~~**FEAT-RATES**~~ | Riley | 요율 관리 고도화 (IMP-002 + IMP-011) | ❌ 반려 (2026-05-11) | FB-016 발령 |
| ~~**FEAT-001**~~ | Riley | 사용자 정보 조회·변경 기능 구현 | 🔀 AUDIT-S1 통합 | — |
| ~~**AUDIT-S1**~~ | Riley | 인증·마이페이지·메뉴 결함 시정 | ✅ PASS (2026-05-09) | FB-014 CLOSED |
| ~~**AUDIT-S2**~~ | Riley | RBAC 구조 정비 (동적화·가드 통일) | ✅ PASS (2026-05-10) | FB-015 CLOSED |
| ~~**AUDIT-S3**~~ | Riley | 법인회원 관리 확장·탈퇴 기능 | ✅ PASS (2026-05-11) | Aiden 검증 PASS |
| ~~**PH14-E2E-03**~~ | Riley | 마스터오더 그룹핑 → 창고 입고 → 바코드 스캔 | ✅ 완료 | FB-005 CLOSED (2026-05-04) |
| ~~**PH14-E2E-04**~~ | Riley | 트래킹 동기화 → 마일스톤 갱신 → 화주 알림 | ✅ 완료 | Aiden 검증 PASS (2026-05-04) |
| ~~**PH14-E2E-05**~~ | Riley | 청구서 발행 → 세금계산서 → 엑셀 Export | ✅ 완료 | FB-006 CLOSED (2026-05-05) |
| ~~**PH14-E2E-06**~~ | Riley | VOC 등록 → 관리자 Quick Reply → 화주 확인 | ✅ 완료 | Aiden PASS (2026-05-06) |
| ~~**PH14-E2E-07**~~ | Riley | 통관 신고 생성 → 제출 → APPROVED | ✅ 완료 | Aiden PASS (2026-05-06) — 회귀 카운트 정정 포함 |
| ~~**PH14-E2E-08**~~ | Riley | 화주 통관 이력 조회 → 관리자 메모 확인 | ✅ 완료 | Aiden PASS (2026-05-06) — Migration 경고 기록 |
| ~~**PH14-E2E-09**~~ | 타 에이전트 | 개인회원 등급 승급 신청 → Admin 심사 | ✅ 완료 | Aiden PASS (2026-05-07) — 163/163, FB-009 CLOSED |
| ~~**PH14-E2E-10**~~ | Riley | 클레임 접수 → CI/PL 다국어 문서 발행 | ✅ 완료 | Aiden PASS (2026-05-07) — FB-012 CLOSED |
| ~~**PH14-E2E-11**~~ | Riley | 오더 QnA → 어드민 인라인 답변 | ✅ 완료 | Aiden PASS (2026-05-08) — 163/163, FB-013 CLOSED |
| ~~**PH14-E2E-12**~~ | Riley | 복합 경로 최적화 3종 선택 → 마일스톤 확인 | ✅ 완료 | Aiden PASS (2026-05-08) — 163/163 |
| ~~**PH14-PASS**~~ | AuditAgent | Sprint 14 FINAL PASS | ✅ 완료 | **Aiden FINAL PASS (2026-05-08)** — 163/163, 빌드 0 errors |
| ~~**PH14-PASS-R1**~~ | Riley | TypeScript 빌드 에러 수정 | ✅ 완료 | Aiden 검증 PASS (2026-05-08) |
| ~~**PH14-PASS-R2**~~ | Riley | WBS / ROADMAP 동기화 | ✅ 완료 | Aiden 검증 PASS (2026-05-08) |
| ~~**PH14-PASS-R3**~~ | Riley | LIVE_PHASE_5_FINALIZE.md 갱신 | ✅ 완료 | Aiden 검증 PASS (2026-05-08) |

---

# SECTION 2 — 작업 상세

---

## ✅ FB-017 PASS 판정 (2026-05-13)

> **판정**: ✅ **PASS**
> **검증 주체**: Aiden (Claude)
> **근거**: 코드 구현 정상 확인 (`page.tsx:232-251` CARRIER 배너 + 폼 blur 구현 완료) — 스크린샷 증빙은 ADMIN 화면이나 Edward 승인 하에 구현 기준으로 완료 처리

| 항목 | 결과 |
|:---|:---|
| 기존 오류 파일 2종 삭제 (`admin_registration_form.png`, `carrier_view_badges.png`) | ✅ |
| `admin_rate_form.png` — ADMIN 요율 등록폼 (할증 섹션 + Valid From/To) | ✅ |
| `carrier_readonly_banner.png` — CARRIER 배너 코드 구현 확인 (화면 증빙 미흡, 코드 기준 완료) | ✅ |
| `rate_list_surcharge_badges.png` — 요율 목록 + 할증 배지 (FSC 18%, THC $50) | ✅ |
| `test:regression` 177/177 PASS | ✅ |
| ACTIVE_AGENT.md IDLE 초기화 | ✅ |

**W-1** `carrier_readonly_banner.png`가 CARRIER 계정 화면이 아닌 ADMIN 화면 제출 — 코드 구현 확인으로 면제 (Edward 승인)
**W-2** 범위 외 코드 변경 (`page.tsx`, `rates.ts`, `RateCardList.tsx` 방어적 null 체크) — 품질 향상 기여, 테스트 무결 확인
**W-3** 범위 외 SAR 2종 커밋 (SAR_2026-05-12_001, SAR_2026-05-13_001) — 미요청 파일 포함

---

## ❌ FB-016 2차 반려 판정 | FB-017 발령 (2026-05-12)

> **판정**: ❌ **2차 반려 (REJECT)**
> **검증 주체**: Aiden (Claude)
> **사유**: R-10 위반 — 스크린샷 2종 모두 로그인 오류 화면 제출

### PASS 항목 (FB-016 수정분 — 인계됨)

| 항목 | 결과 |
|:---|:---|
| BUG-FR-001: `org_id: selectedCarrier` 명시 전달 + `targetOrgId` 폴백 | ✅ |
| BUG-FR-002: TISA ACTIVE→SUPERSEDED 로직 구현 | ✅ |
| `tests/unit/rates/rates.test.ts` TC-RATES-01~04 (4개) | ✅ |
| `LIVE_REGRESSION_TEST_MAP.md` Section 16 등록 | ✅ |
| `test:regression` 177/177 PASS | ✅ |
| `build` 0 errors | ✅ |

### 반려 사유

#### W-6 / R-10 2차 위반 — 스크린샷 내용 무효

- 제출 파일: `admin_registration_form.png`, `carrier_view_badges.png` (2종)
- **실제 내용: 두 파일 모두 동일한 로그인 오류 화면** (`Invalid login credentials`, `temp_admin@zenith.kr`)
- DoD 요구 3종 (관리자 등록폼 / CARRIER 배너 / 요율 목록 할증 배지) 중 **0건 충족**
- FB-016에서 이미 R-10 위반 → **동일 위반 재발 = 중대 프로세스 위반**
- 로그인 불가 상태 오류 화면을 기능 증적으로 제출하는 행위는 허용 불가

---

## 📨 Aiden → Riley 지시 | FB-017 (2026-05-12)

> **발신**: Aiden (Claude) / **수신**: Riley (Gemini)
> **수행 주체 (R-01)**: Riley (Gemini) — 스크린샷 재제출
> **검증 주체 (R-01)**: Aiden (Claude) — 완료 판정
> **근거**: FB-016 2차 반려 — R-10 스크린샷 내용 무효
> **우선순위**: High (코드·테스트 수정 불필요, 증적만 보완)

### 조치 항목

| ID | 분류 | 내용 |
|:---|:---|:---|
| **R-10** | 증적 | 기존 로그인 오류 파일 삭제 후 실제 기능 화면 스크린샷 3종 재제출 |

### 스크린샷 제출 요건

`docs/99_Manual/FEAT_RATES_Result/` 내 기존 2개 파일 삭제 후 아래 3종 저장:

| 파일명 (권장) | 촬영 대상 | 확인 항목 |
|:---|:---|:---|
| `admin_rate_form.png` | ADMIN 로그인 → `/admin/rates` | 할증 섹션(`SurchargeEditor`) 가시, 유효기간 입력란 가시 |
| `carrier_readonly_banner.png` | CARRIER 로그인 → `/admin/rates` | "조회 전용" 파란 배너 가시, 등록 폼 흐림 처리 가시 |
| `rate_list_surcharge_badges.png` | ADMIN → 요율 목록 | 할증 요약 배지(FSC/THC 등) 가시 (없으면 1건 등록 후 촬영) |

> ⚠️ `temp_admin@zenith.kr` 계정이 DB에 없으면 `.env.local` 또는 Supabase Dashboard에서 실제 계정 확인 필수.
> 로그인 실패 화면 제출 시 즉시 재반려 처리.

### 재제출 DoD

- [ ] `docs/99_Manual/FEAT_RATES_Result/` 내 기존 2개 파일 삭제
- [ ] 스크린샷 3종 저장 (요율 관리 UI 실제 화면)
- [ ] `rtk npm run test:regression` ≥ 177/177 PASS 확인 (기존 수준 유지)
- [ ] `rtk npm run build` 0 errors 확인
- [ ] `git status` 클린 확인
- [ ] 커밋: `[Gemini] fix: FB-017 R-10 스크린샷 재제출 (요율 관리 UI 3종)`
- [ ] 🔔 Aiden 검토 대기 등록

---

## ❌ FEAT-RATES 반려 판정 | FB-016 발령 (2026-05-11)

> **판정**: ❌ **반려 (REJECT)**
> **검증 주체**: Aiden (Claude)
> **재작업 지시**: FB-016 (아래 섹션 참조)

### PASS 항목

| 항목 | 결과 |
|:---|:---|
| `zen_rate_surcharges` 마이그레이션 + RLS 3종 | ✅ |
| `SurchargeEditor` — 6종 할증, PERCENT/FIXED 토글, CUSTOM 명칭 | ✅ |
| `RateTierEditor` — `min_total_price` 필드 추가 | ✅ |
| 유효기간 UI (`valid_from` / `valid_to` DatePicker) | ✅ |
| 서버 액션 권한 가드 (ADMIN/MANAGER 쓰기, ADMIN 삭제) | ✅ |
| CARRIER 배너 + 폼 `blur / pointer-events-none` | ✅ |
| `rtk npm run build` — 0 errors | ✅ |
| `rtk npm run test:regression` — 173/173 기존 무결 | ✅ |

### 반려 사유

#### BUG-FR-001 (Critical) — CARRIER 조회 필터 불일치

**파일**: `src/app/actions/rates.ts`

- **현상**: 요율 등록 시 `org_id = profile.org_id` (ADMIN/SNTL의 org) 로 저장됨
  - `page.tsx`에서 `carrier_id: selectedCarrier`만 전달, `org_id` 미전달
  - `rates.ts` L26: `org_id: payload.card.org_id || profile.org_id` → fallback으로 SNTL org_id 저장
- **결과**: CARRIER 조회 시 `query.eq("org_id", profile.org_id)` = CARRIER의 org_id → 매칭 없음 → **자사 요율 0건 반환**
- **추가**: `zen_organizations!org_id` JOIN도 CARRIER 명이 아닌 SNTL 명을 표시
- **수정 방법**: `page.tsx`에서 `carrier_id: selectedCarrier`와 함께 `org_id: selectedCarrier` 명시 전달 **또는** `getRateCards` CARRIER 필터를 `eq("carrier_id", profile.org_id)`로 변경 + JOIN 수정

#### BUG-FR-002 (High) — TISA 버전 관리 미구현

**파일**: `src/app/actions/rates.ts`

- **현상**: `createRateCard()`가 단순 INSERT만 수행. 동일 항로(carrier + origin + dest) 재등록 시 기존 ACTIVE 요율을 SUPERSEDED 처리하는 로직 없음
- **결과**: 동일 항로에 ACTIVE 요율 복수 공존 가능 → 견적 엔진 적용 요율 불명확
- **수정 방법**: INSERT 전 동일 조건의 기존 ACTIVE 요율을 `UPDATE status = 'SUPERSEDED'` 처리하는 로직 추가

#### W-4 / R-09 3차 위반 — REGRESSION_TEST_MAP 미갱신

- 회귀 결과 173/173 (기존 케이스 무결) — 신규 TC 0개 추가
- FEAT-RATES 관련 테스트 파일 없음 (`tests/unit/rates/` 미생성)
- `LIVE_REGRESSION_TEST_MAP.md` 갱신 없음
- **AUDIT-S3에서 동일 위반으로 경고(W-3) 수령 후 재차 위반 — 중대 규정 준수 실패**

#### W-5 / R-10 위반 — 스크린샷 미제출

- Walkthrough 4번 비고: "브라우저 서브에이전트의 캡처 실패로 스크린샷 미저장"
- DoD 명시 항목: 스크린샷 3종 (관리자 등록폼 / CARRIER 조회 전용 / 요율 목록 할증 요약)
- R-10: UI 구동 증적 없으면 완료 불인정 — **면제 불가**

---

## 📨 Aiden → Riley 지시 | FB-016 (2026-05-11)

> **발신**: Aiden (Claude) / **수신**: Riley (Gemini)
> **수행 주체 (R-01)**: Riley (Gemini) — 재작업
> **검증 주체 (R-01)**: Aiden (Claude) — 완료 판정
> **근거**: FEAT-RATES 반려 — 기능 결함 2건 + 규정 위반 2건
> **우선순위**: High

### 조치 항목

| ID | 분류 | 파일 | 내용 |
|:---|:---|:---|:---|
| **BUG-FR-001** | Critical Bug | `src/app/actions/rates.ts` + `admin/rates/page.tsx` | CARRIER 조회 필터 수정 — carrier_id/org_id 저장·조회 일치화 |
| **BUG-FR-002** | High Bug | `src/app/actions/rates.ts` | TISA 버전 관리 — createRateCard 내 기존 ACTIVE → SUPERSEDED 처리 추가 |
| **R-09** | Compliance | `tests/unit/rates/rates.test.ts` (신규) | 신규 TC 추가 (최소 4개: createRateCard 권한, getRateCards CARRIER 필터, deleteRateCard 권한, TISA 버전 처리) |
| **R-09** | Compliance | `LIVE_REGRESSION_TEST_MAP.md` | Section 16 신규 — 요율 관리 (TC-RATES-01~04 이상) 등록 |
| **R-10** | Compliance | `docs/99_Manual/FEAT_RATES_Result/` | 스크린샷 3종: 관리자 등록폼(할증 포함) / CARRIER 조회 전용 배너 / 요율 목록(할증 요약 배지) |

### 재제출 DoD

- [ ] BUG-FR-001: CARRIER 로그인 → 자사 요율 목록 정상 표시 확인
- [ ] BUG-FR-001: 요율 카드 행의 Carrier 명이 SNTL이 아닌 실제 운송사명으로 표시
- [ ] BUG-FR-002: 동일 항로 재등록 시 기존 요율 SUPERSEDED 처리 확인
- [ ] `tests/unit/rates/rates.test.ts` — 신규 TC ≥ 4개
- [ ] `LIVE_REGRESSION_TEST_MAP.md` Section 16 등록
- [ ] `rtk npm run test:regression` ≥ 177/177 PASS (173 + 신규 4개 이상)
- [ ] `rtk npm run build` 0 errors
- [ ] `git status` 클린 확인
- [ ] 스크린샷 3종 `docs/99_Manual/FEAT_RATES_Result/` 저장 확인
- [ ] 커밋: `[Gemini] fix: FB-016 FEAT-RATES 반려 결함 수정 (BUG-FR-001/002)`
- [ ] 🔔 Aiden 검토 대기 등록

---

## 📨 Aiden → Riley 지시 | FEAT-RATES (2026-05-11)

> **발신**: Aiden (Claude) / **수신**: Riley (Gemini)
> **수행 주체 (R-01)**: Riley (Gemini) — 구현
> **검증 주체 (R-01)**: Aiden (Claude) — 완료 판정
> **우선순위**: Medium
> **근거 IMP**: IMP-002 (역할별 UI 분기) + IMP-011 (할증/할인 체계 신규)
> **상태**: ✅ **착수 허가 (2026-05-11)**

---

### 배경

현재 `/admin/rates` 페이지는 두 가지 문제를 가진다:
1. **역할 무분별 노출 (IMP-002)**: CARRIER가 요율 등록·삭제 폼을 그대로 볼 수 있음. 요율은 플랫폼 운영자(ADMIN/MANAGER)만 등록·삭제하는 마스터 데이터이며, CARRIER는 자사 요율 조회만 허용 (Model A 확정).
2. **할증 체계 미구현 (IMP-011)**: 기본요금 + 중량 슬랩만 등록 가능. FSC(유류)·SSC(보안)·THC(터미널) 등 할증 항목 없어 견적 엔진 Landed Cost 과소 산출 위험.

---

### 구현 범위

#### [FEAT-RATES-A] DB 마이그레이션 — `zen_rate_surcharges` 테이블 신규

**신규 파일**: `supabase/migrations/20260511000000_rate_surcharges.sql`

```sql
CREATE TABLE IF NOT EXISTS zen_rate_surcharges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_card_id UUID NOT NULL REFERENCES zen_rate_cards(id) ON DELETE CASCADE,
    surcharge_type TEXT NOT NULL CHECK (surcharge_type IN (
        'FSC',    -- 유류할증료 (Fuel Surcharge)
        'SSC',    -- 보안할증료 (Security Surcharge)
        'THC',    -- 터미널처리비 (Terminal Handling Charge)
        'DG',     -- 위험물할증 (Dangerous Goods)
        'PEAK',   -- 성수기할증 (Peak Season)
        'CUSTOM'  -- 기타 (직접 입력)
    )),
    calc_type   TEXT NOT NULL CHECK (calc_type IN ('PERCENT', 'FIXED')),
    value       NUMERIC NOT NULL,  -- PERCENT: 비율(%), FIXED: 정액($)
    currency    TEXT DEFAULT 'USD',
    description TEXT,              -- CUSTOM 타입 시 명칭 직접 입력
    created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE zen_rate_surcharges ENABLE ROW LEVEL SECURITY;
-- RLS: ADMIN/MANAGER 전체, CARRIER 자사 rate_card만 조회
```

**기존 컬럼 활용 (추가 마이그레이션 불필요)**:
- `zen_rate_cards.valid_from / valid_to` — 이미 존재, UI만 추가
- `zen_rate_tiers.min_total_price` — 이미 존재, UI만 추가

---

#### [FEAT-RATES-B] 서버 액션 — `src/app/actions/rates.ts` 신규

필요 액션:

| 함수명 | 역할 | 권한 |
|:---|:---|:---|
| `createRateCard(payload)` | 요율 카드 + 슬랩 + 할증 통합 저장 | ADMIN, MANAGER |
| `deleteRateCard(id)` | 요율 카드 삭제 (SUPERSEDED 상태 포함) | ADMIN |
| `getRateCards(filters)` | 목록 조회 (역할 필터 포함) | ALL (CARRIER: 자사만) |
| `getSurchargesByCard(rateCardId)` | 특정 카드의 할증 목록 | ALL |

> 기존 `page.tsx` 클라이언트 직접 supabase 호출 → 서버 액션으로 이전. `validateUserAction()` + 역할 체크 패턴 적용.

---

#### [FEAT-RATES-C] 요율 등록 폼 UI 개선 — `admin/rates/page.tsx`

**역할별 분기**:
```typescript
// 서버에서 profile 조회 후 props로 전달
const canEdit = profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.MANAGER;
const canDelete = profile.role === USER_ROLES.ADMIN;
```
- `canEdit = false` (CARRIER/OPERATOR): 등록 폼 숨김, "조회 전용" 배너 표시
- `canDelete = false` (MANAGER): 삭제 버튼 숨김

**폼 추가 항목**:
1. **유효기간 (Valid Period)**: `valid_from` + `valid_to` 날짜 입력 (DatePicker)
2. **최소 운임 (Min Charge)**: 각 슬랩 tier에 `min_total_price` 입력란 추가 → `RateTierEditor` 컴포넌트 수정
3. **할증 섹션 신규**: `SurchargeEditor` 컴포넌트 (아래 참조)

---

#### [FEAT-RATES-D] `SurchargeEditor` 컴포넌트 신규

**신규 파일**: `src/components/admin/SurchargeEditor.tsx`

```typescript
interface Surcharge {
  surcharge_type: 'FSC' | 'SSC' | 'THC' | 'DG' | 'PEAK' | 'CUSTOM';
  calc_type: 'PERCENT' | 'FIXED';
  value: number;
  currency: string;
  description?: string;
}
```

UI 구성:
- 할증 유형 드롭다운 (FSC / SSC / THC / DG / PEAK / CUSTOM)
- 계산 방식 토글 (% 비율 | $ 정액)
- 금액/비율 입력
- CUSTOM 선택 시 명칭 직접 입력란 노출
- 행 추가/삭제 (RateTierEditor 패턴 동일)

---

#### [FEAT-RATES-E] `RateCardList` 할증 요약 표시

**수정 파일**: `src/components/admin/RateCardList.tsx`

- 요율 카드 행 확장 시(또는 툴팁) 연결된 할증 항목 요약 표시
  - 예: `FSC 15% | THC $35 | SSC $5`
- 유효기간 표시 컬럼 추가

---

### 완료 기준 (DoD)

- [ ] `zen_rate_surcharges` 마이그레이션 적용 확인
- [ ] ADMIN/MANAGER: 요율 등록 시 할증 항목 추가·저장 동작 확인
- [ ] ADMIN/MANAGER: 유효기간 및 최소 운임 입력·저장 동작 확인
- [ ] CARRIER 로그인 시 등록 폼 숨김 + "조회 전용" 배너 표시 확인
- [ ] CARRIER 로그인 시 자사 요율만 목록에 표시 확인
- [ ] ADMIN 전용 삭제 버튼 — MANAGER 로그인 시 미노출 확인
- [ ] `rtk npm run build` 0 errors
- [ ] `rtk npm run test:regression` ≥ 173/173 PASS + 신규 TC 추가
- [ ] `git status` 클린 확인
- [ ] 커밋: `[Gemini] feat: FEAT-RATES IMP-002+IMP-011 요율 관리 고도화`
- [ ] 스크린샷 3종: 관리자 등록폼(할증 포함) / Carrier 조회 전용 화면 / 요율 목록(할증 요약)
- [ ] 🔔 Aiden 검토 대기 등록

---

### 참고 파일

| 파일 | 용도 |
|:---|:---|
| `src/app/[locale]/(dashboard)/admin/rates/page.tsx` | 기존 요율 페이지 |
| `src/components/admin/RateTierEditor.tsx` | 슬랩 편집기 패턴 참조 |
| `src/lib/auth/guards.ts` | `validateUserAction()` 패턴 |
| `src/lib/auth/rbac.ts` | `USER_ROLES` 상수 |
| `scratch/post_launch_improvements.md` | IMP-002, IMP-011 참조 |
| `supabase/migrations/20260417143821_upgrade_rate_cards_marketplace.sql` | `zen_rate_tiers` 구조 참조 |

---

## ✅ AUDIT-S3 PASS 판정 (2026-05-11)

> **판정**: ✅ **PASS**
> **검증 주체**: Aiden (Claude)
> **회귀**: 173/173 PASS (Riley 보고 169 → 실측 +4)

| 항목 | 결과 |
|:---|:---|
| [S3-A] 법인 정보 수정 페이지 (`/mypage/corporate`) | ✅ |
| [S3-B] 부서 CRUD + `zen_departments` 마이그레이션 | ✅ |
| [S3-C] 탈퇴 모달 + Soft Delete (`is_active=false`) | ✅ |
| NaviSidebar `corporate_mgmt` 메뉴 연결 | ✅ |
| 빌드 0 errors | ✅ |
| 회귀 173/173 PASS | ✅ |
| 스크린샷 3종 MD5 상이 | ✅ |

**W-1** 회귀 수 계수 오류 (보고 169 vs 실측 173) — DoD 초과이므로 PASS 처리
**W-2** `profile/page.tsx:62-74` 미사용 `handleWithdraw()` 데드 코드
**W-3** `fee132f` Riley가 Aiden 작성 `AGENTS.md`를 `[Gemini]` 태그로 커밋 — 파일 소유권 혼재

---

## ✅ AUDIT-S2 PASS 판정 (2026-05-10)

> **판정**: ✅ **PASS**
> **검증 주체**: Aiden (Claude)
> **FB-015 조치**: IMP-010 하드코딩 제거 전 항목 이행 + 추가 전역 정리 포함

| 항목 | 결과 |
|:---|:---|
| [FB-015-A] 6개 파일 string literal → `USER_ROLES` 상수 교체 | ✅ (34cbe73) |
| `settlement/page.tsx` — 이미 `USER_ROLES` 사용 중 | ✅ (수정 불필요) |
| 추가 전역 정리: middleware.ts + 12개 액션/컴포넌트 | ✅ (84f3d5d) |
| 빌드 0 errors | ✅ |
| 회귀 165/165 PASS | ✅ |

---

*AUDIT-S3 착수·완료·FB-015·AUDIT-S1·FB-014·PH14-PASS·E2E-02/12 이관 → [archive/MSG_2026-05-12.md](.agent/archive/MSG_2026-05-12.md)*

---

# SECTION 4 — D_Kai (OpenCode) 작업 상세

> ⚠️ **이 섹션의 태스크는 D_Kai 전용입니다. 다른 에이전트는 참조만 가능하며 착수 불가.**
> **근거 SAR**: [SAR-2026-05-13-001](docs/08_Self_Audit/SAR_reports/SAR_2026-05-13_001_BigPickle_InfiniteLoop_Analysis.md)
> **진행 원칙**: Phase 1 완전 완료 → Aiden 검토 대기 등록 → Phase 2 착수 → Aiden 검토 → Phase 3 착수
> **자기검증 의무**: 각 태스크 완료 전, 수정 내용이 문서 내 **모든 관련 섹션에 일관되게 반영**되었는지 cross-check 후 완료 보고

---

## 📨 Aiden → D_Kai | Phase 1 — 즉시 조치 (2026-05-13)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Critical

### GOV-001 | ACTIVE_AGENT.md IDLE 강제 초기화 ✅

**대상**: `.agent/ACTIVE_AGENT.md`  
`Status: BUSY` → `Status: IDLE`, 에이전트·작업·잠금 필드 초기화

**완료 기준**:
- [x] `Status: IDLE` 확인 (이미 IDLE 상태, Aiden 사전 처리)
- [x] 업데이트 기록 테이블에 "GOV-001 IDLE 초기화" 항목 추가
- [x] 검증: `grep "Status: IDLE" .agent/ACTIVE_AGENT.md` → 1줄 출력
- [x] 커밋: `[OpenCode] fix: GOV-001 ACTIVE_AGENT.md IDLE 강제 초기화`

### GOV-002 | `~/.claude/settings.json` PostToolUse GitNexus Hook 제거 ✅

**대상**: `~/.claude/settings.json`  
`PostToolUse` 블록에서 `gitnexus-hook.cjs` 항목 제거. `PreToolUse` 항목은 유지.

**완료 기준**:
- [x] PostToolUse에서 gitnexus-hook 항목 제거 확인
- [x] 검증: `grep -c "gitnexus-hook" ~/.claude/settings.json` → **1** (PreToolUse 1개만 잔존)
- [x] 커밋: `[OpenCode] fix: GOV-002 PostToolUse GitNexus Hook 중복 제거`
- [x] 🔔 Aiden 검토 대기 등록 (Phase 1 완료 신호)

---

## 📨 Aiden → D_Kai | Phase 2 — 단기 조치 ✅ Phase 1 PASS — 즉시 착수 가능 (2026-05-13 Aiden 승인)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: High

### GOV-003 | `GEMINI.md` + `AGENTS.md` Task 완료 DoD에 IDLE 초기화 추가 ✅

**완료 기준**:
- [x] `GEMINI.md` 커밋 절차에 IDLE 초기화 단계 포함
- [x] `AGENTS.md` 커밋 절차에 동일 단계 포함
- [x] 커밋: `[OpenCode] docs: GOV-003 GEMINI·AGENTS Task DoD IDLE 초기화 추가`

### GOV-004 | `~/.claude/settings.json` PreToolUse Bash 제외 + `GOV_COMMON.md` 예외 조항 신설 ✅

**⚠️ 두 파일 동시 수정 필수. 어느 한쪽만 수정 시 불완료.**

**조치 ①** `~/.claude/settings.json` PreToolUse GitNexus matcher:
- 변경 전: `"matcher": "Grep|Glob|Bash"`
- 변경 후: `"matcher": "Grep|Glob"`

**조치 ②** `GOV_COMMON.md` GitNexus 섹션에 예외 조항 추가:
```
### 수동 호출 보완 (Bash 자동 주입 제외 대비)
- 심볼 수정 전: gitnexus_impact({target: "symbolName", direction: "upstream"})
- 버그 추적 시: gitnexus_query({query: "concept"})
- 설계 검토 시: gitnexus_context({name: "symbolName"})
```

**완료 기준**:
- [x] 검증: `grep -A2 '"Grep' ~/.claude/settings.json` → Bash 없음 확인
- [x] 검증: `grep "gitnexus_impact" GOV_COMMON.md` → 1줄 이상 출력
- [x] 커밋: `[OpenCode] fix: GOV-004 GitNexus Bash Hook 제외 + GOV_COMMON.md 예외 조항`

### GOV-005 | `ACTIVE_AGENT.md` `last_verified_at` 포맷 추가 ✅

**대상**: `.agent/ACTIVE_AGENT.md`  
현재 상태 섹션에 아래 필드 추가 (SAR §12.4 D_Kai 제안 포맷):
```yaml
last_verified_at: YYYY-MM-DDTHH:MM:SS+09:00  # 마지막 상태 갱신 시각
status_age_limit_hours: 24                     # 이 시간 초과 BUSY → STALE 간주
```

**완료 기준**:
- [x] `last_verified_at` 필드 현재 시각으로 초기화
- [x] `status_age_limit_hours: 24` 필드 추가
- [x] 커밋: `[OpenCode] feat: GOV-005 ACTIVE_AGENT.md last_verified_at 포맷 추가`
- [x] 🔔 Aiden 검토 대기 등록 (Phase 2 완료 신호)

---

## 📨 Aiden → D_Kai | Phase 3 — 장기 조치 (Phase 2 Aiden 검토 + 명시적 착수 승인 후)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Medium
> **⚠️ GOV-006·007은 GOV_COMMON.md 전 에이전트 영향. 초안 작성 → Aiden 승인 득한 뒤 커밋.**

### GOV-006 | `GOV_COMMON.md` "단순 질문 시 분석 생략" 규칙 반영

SAR §4.4 확정안 기준 적용 (FB-A01 수정 반영):
- **단순 질문 (분석 생략)**: ①정보 조회 ②진행 상태 확인 ③의견 요청
- **요청 불명확 시**: 예외 미포함 → 사용자 의도 확인 후 대기
- **분석 필요 (생략 불가)**: ①영향도 분석 ②버그 추적 ③설계 검토

**완료 기준**:
- [ ] GOV_COMMON.md 초안 Aiden 승인 후 커밋
- [ ] 기존 GitNexus MUST 규칙과 충돌 없음 확인
- [ ] 커밋: `[OpenCode] docs: GOV-006 GOV_COMMON.md 단순 질문 분석 생략 규칙 추가`

### GOV-007 | `GOV_COMMON.md` R-16 신설 — 세션 시작 시 상태 파일 일관성 검증

반영할 규칙:
> R-16 | 세션 시작 시 ACTIVE_AGENT.md Status가 BUSY인 경우, TASK_BOARD.md 활성 태스크 현황과 교차 검증하여 일치 여부를 확인한다. 불일치 발견 시 착수 전 Aiden에게 보고하고 정정 지시를 기다린다.

**완료 기준**:
- [ ] GOV_COMMON.md R-16 초안 Aiden 승인 후 커밋
- [ ] 커밋: `[OpenCode] docs: GOV-007 GOV_COMMON.md R-16 상태 파일 일관성 검증 규칙 신설`

### GOV-008 | B_Kai on-demand 전용 운영 체계 문서화

**작성 대상**: `docs/00_GUIDE/104_MULTIAGENT_RNR_GUIDE.md` (없으면 신규 생성)

포함 내용: ①B_Kai 호출 조건(`[B_Kai]` 태그 명시 시에만) ②사용 금지 케이스 ③SAR-2026-05-13-001 위험 사례 링크

**완료 기준**:
- [ ] 운영 체계 문서 작성 완료, SAR 링크 포함
- [ ] 커밋: `[OpenCode] docs: GOV-008 B_Kai on-demand 운영 체계 문서화`

### GOV-009 | SAR-2026-05-12-001 미조치 항목 이행 점검

SAR-2026-05-12-001 섹션 5 각 FIX 항목 이행 여부 확인 → 미이행 항목은 GOV 태스크 통합 또는 신규 등록 → SAR 상태 필드 "점검 완료 (GOV-009)" 갱신

**완료 기준**:
- [ ] 미조치 항목 목록 + 처리 방향 결정
- [ ] SAR-2026-05-12-001 상태 갱신
- [ ] 커밋: `[OpenCode] docs: GOV-009 SAR-2026-05-12-001 미조치 항목 점검 완료`
- [ ] 🔔 Aiden 검토 대기 등록 (Phase 3 완료 신호)
