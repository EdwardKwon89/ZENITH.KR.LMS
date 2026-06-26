# TASK-B-029 — IMP-140: E2E 테스트 (createorder → getnewlabel → gettrack)

> **Task-ID**: TASK-B-029
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: Jaison (구현)
> **우선순위**: P1
> **상태**: ⬜
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
| TASK-B-025 ✅ (shxk client) | 🚫 |
| TASK-B-026 ✅ (Server Action) | 🚫 |
| TASK-B-027 ✅ (DB 마이그레이션) | 🚫 |
| TASK-B-028 ✅ (TrackingProvider) | 🚫 |

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

_착수 후 Jaison 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Jaison 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-029 신규 발령 — An-13 v2.0 IMP-140 |
