# TASK-B-029 — IMP-140: E2E 테스트 (createorder → getnewlabel → gettrack)

> **Task-ID**: TASK-B-029
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: Dave (§1 준비) · Baker (§2 실행) — Jaison 재배정 (2026-06-28)
> **우선순위**: P1
> **상태**: 🔄
> **GitHub Issue**: [#110](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/110)
> **연관 IMP**: IMP-140
> **전제조건**: TASK-B-025~028 (IMP-136~139) ✅ 전량
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §5·§7

---

## 업무 개요

Phase 8 UPS 연동 전체 흐름 E2E 자동화 테스트 (IMP-140).
createorder → gettrackingnumber → getnewlabel → gettrack 순서 검증.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-025 ✅ (shxk client) | ✅ |
| TASK-B-026 ✅ (Server Action) | ✅ |
| TASK-B-027 ✅ (DB 마이그레이션) | ✅ |
| TASK-B-028 ✅ (TrackingProvider) | ✅ |

---

## 구현 범위

### 대상 파일

```
tests/e2e/e2e-26-ups-label-flow.spec.ts   ← spec 작성 완료 (Jaison, 339줄)
```

### §1 — Dave 준비 작업 (Baker 착수 전 완료 필수)

1. **브랜치 rebase**
   ```bash
   git fetch origin
   git checkout feature/teamb-task-b-029-e2e-ups-flow
   git rebase origin/develop
   ```
2. **DEF-081 수정** — spec line 91: `weight_kg: 1.0` → `gross_weight: 1.0`
3. **B-032 fix 반영** — E2E-26-07 tracking_events insert 수정 (PR#131 Aiden ✅ 승인 내용 직접 적용):
   - `order_id` · `tracking_number` · `event_date` NOT NULL 필드 추가
   - `event_time`: ISO 문자열 → `HH:MM:SS` 형식 변경
   - `raw_payload` → `raw_response` 컬럼명 수정
4. **커밋 후 push**:
   ```
   [Dave] fix: TASK-B-029 spec DEF-081 + B-032 tracking_events fix 반영
   ```
5. **완료 후 Baker에게 착수 알림** (PR#130 코멘트)

> ⚠️ §1 push 완료 전 Baker 착수 금지

### §2 — Baker 실행 작업 (Dave §1 완료 후)

1. **브랜치 최신화**
   ```bash
   git fetch origin
   git checkout feature/teamb-task-b-029-e2e-ups-flow
   git pull origin feature/teamb-task-b-029-e2e-ups-flow
   ```
2. **환경변수 확인** (`.env.local`): `SHXK_APP_KEY`, `SHXK_APP_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`
3. **로컬 Supabase 기동** (R-14): `rtk supabase start`
4. **E2E-26 실행**:
   ```bash
   rtk npx playwright test tests/e2e/e2e-26-ups-label-flow.spec.ts --headed
   ```
   > ⚠️ shxk NO sandbox — afterEach/afterAll `removeorder` 정리 의무. 오더 잔존 금지.
5. **스크린샷 7종 확인** (`docs/99_Manual/E2E_26_Result/07_tracking_stored.png` 포함)
6. **LIVE_REGRESSION_TEST_MAP.md** IMP-140 항목 추가
7. **회귀 테스트**: `rtk npm run test:regression` PASS 확인
8. **R-17 완료 보고**: task file `[작업 결과]` 기재 + 상태 🔔
9. **PR 생성**: `feature/teamb-task-b-029-e2e-ups-flow → develop`, `Closes #110`
   - PR#131 (B-032) 처리: B-029 머지 후 Baker가 PR#131 base→develop 변경 요청

### 테스트 시나리오

1. **E2E-26-01**: 창고 출고 화면 진입 + UPS 레이블 미발급 상태 확인
2. **E2E-26-02**: 출고 확정 클릭 → UPS createorder 호출 → 운송장 번호 발급 확인
3. **E2E-26-03**: getnewlabel 호출 → 레이블 PDF URL 생성 확인
4. **E2E-26-04**: `zen_ups_labels` 테이블 레코드 삽입 확인
5. **E2E-26-05**: 폐기(Void) 버튼 → confirm dialog → 폐기 완료 확인
6. **E2E-26-06**: 재발급 → 새 운송장 번호 갱신 확인
7. **E2E-26-07**: gettrack polling 첫 호출 → `zen_ups_tracking_events` 저장 확인

### 스크린샷 저장

```
docs/99_Manual/E2E_26_Result/
├── 01_label_not_issued.png
├── 02_issue_triggered.png
├── 03_label_issued.png
├── 04_void_dialog.png
├── 05_void_completed.png
├── 06_reissue_completed.png
└── 07_tracking_stored.png
```

---

## DoD (Definition of Done)

**§1 — Dave**
- [ ] `git rebase origin/develop` PASS (충돌 없음)
- [ ] DEF-081 수정: `weight_kg` → `gross_weight` (spec line 91)
- [ ] B-032 tracking_events fix 반영 (order_id·tracking_number·event_date·event_time·raw_response)
- [ ] 코드 커밋 + push 완료

**§2 — Baker**
- [ ] E2E-26-01~07 전항목 PASS
- [ ] `docs/99_Manual/E2E_26_Result/` 스크린샷 7종 저장 (07_tracking_stored.png 포함)
- [ ] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` IMP-140 항목 추가
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] R-17 준수: 코드 커밋 해시 기재 (미정)
- [ ] PR 생성 (`Closes #110`)

---

## [설계 의견]

### E2E 실행 순서 및 주요 제약

**E2E-26-01~07은 UI 기반 테스트** → TASK-B-024(OutboundProcessForm UPS UI) 완성 후 실행 가능.  
spec 파일 작성은 지금 착수, 테스트 실행은 TASK-B-024 🔔 제출 후 병행.

**⚠️ shxk NO sandbox 제약 (R-14 / 프로젝트 제약)**:
- `createorder` / `getnewlabel` 호출은 실제 UPS 오더 생성
- 테스트 afterEach / afterAll에 반드시 `removeorder` 호출로 정리 필수
- 테스트 실행 후 미정리 오더 잔존 금지

**폴링(E2E-26-07)**: `gettrack` 폴링 첫 호출 → DB 저장 확인만. 실제 폴링 스케줄러 미기동.

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker §2 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-029 신규 발령 — An-13 v2.0 IMP-140 |
| 2026-06-27 | Jaison (JSJung) | **🔄 착수** — 전제조건 TASK-B-025~028 ✅ 전량 확인. 브랜치: `feature/teamb-task-b-029-e2e-ups-flow`. spec 파일 작성 착수 / E2E 실행은 TASK-B-024 완성 후. shxk removeorder 정리 의무화 기재 |
| 2026-06-28 | Jaison (Team B) | **재배정** — B-030/031/032 develop 머지 완료. Dave(§1 준비: rebase+DEF-081+B-032 fix) · Baker(§2 실행: E2E+스크린샷+회귀+PR) 으로 분배. |
