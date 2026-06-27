# TASK-B-029 — IMP-140: E2E 테스트 (createorder → getnewlabel → gettrack)

> **Task-ID**: TASK-B-029
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: Jaison (구현)
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

### 신규 파일

```
tests/e2e/e2e-26-ups-label-flow.spec.ts
```

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

- [ ] E2E-26-01~07 전항목 PASS
- [ ] `docs/99_Manual/E2E_26_Result/` 스크린샷 7장 저장
- [ ] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` IMP-140 항목 추가
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)

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

_Jaison 완료 후 기재_

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-080 | zen_ports.country_code CHAR(2) 'KR' vs shxk_country_map 'KOR' 불일치 — issueUpsLabel 실패 경로 | Medium | `.agent/defects/DEF-080_zen_ports_country_code_CHAR2_vs_shxk_map_KOR_불일치.md` |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-029 신규 발령 — An-13 v2.0 IMP-140 |
| 2026-06-27 | Jaison (JSJung) | **🔄 착수** — 전제조건 TASK-B-025~028 ✅ 전량 확인. 브랜치: `feature/teamb-task-b-029-e2e-ups-flow`. spec 파일 작성 착수 / E2E 실행은 TASK-B-024 완성 후. shxk removeorder 정리 의무화 기재 |
| 2026-06-27 | Jaison (JSJung) | **spec 작성 완료** — `tests/e2e/e2e-26-ups-label-flow.spec.ts` (339줄, E2E-26-01~07). 코드 커밋 `8f1e68d`. DEF-080 발견 및 spec 내 KR fixture 우회 처리. 실행 대기: TASK-B-024 머지 후 |
