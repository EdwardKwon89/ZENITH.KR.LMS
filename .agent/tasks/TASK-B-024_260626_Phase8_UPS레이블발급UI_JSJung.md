# TASK-B-024 — [Phase 8] UPS 레이블 발급 UI — 창고 출고 화면 인라인 배치

> **Task-ID**: TASK-B-024
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #102 2026-06-26)
> **담당**: JSJung (검토·승인) / Baker (구현)
> **우선순위**: P1
> **상태**: 🚫 (전제조건 미충족 — TASK-B-023 ✅ 대기)
> **GitHub Issue**: [#114](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/114)
> **연관 IMP**: IMP-141

---

## 업무 개요

창고 출고 화면(`OutboundProcessForm`)에 UPS 레이블 발급 기능을 인라인으로 통합합니다.
Issue #102 Edward 승인 기준: 인라인 배치(Option A) + 출고 확정 시 자동 발급.

---

## 전제조건

| 조건 | 상태 | 비고 |
|:-----|:----:|:----|
| TASK-B-023 ✅ | 🚫 | shxk.rtb56.com API 리서치 완료 필요 — PR #113 수정 대기 |
| DEF-079 해제 | 🚫 | UPS 연동 대상 확정 후 IMP-136~140 착수 가능 |
| IMP-136~138 ✅ | 🚫 | UPS Ship API Server Action 완료 후 UI 연동 가능 |

> TASK-B-023 PR #113 머지 완료 후 🚫→⬜ 전환 (Aiden 전속)

---

## 확정 설계 (Issue #102 — Edward 승인 2026-06-26)

### Q1. 버튼 위치 → 출고 화면 인라인 + 출고 확정 시 자동 발급
- 출고 대기 카드: UPS 레이블 상태 배지 인라인 표시
  - 미발급: 주황 배지 `UPS 레이블 미발급`
  - 발급 완료: 초록 배지 `UPS 레이블 발급 완료 · {운송장번호}`
- "출고 확정" 클릭 시 UPS Ship API 자동 호출 → 레이블 발급 → `zen_order_packages.intl_ref_no` 자동 채움 + `intl_ref_locked = TRUE`

### Q2. 레이블 확인 → 이력 카드 PDF 다운로드 버튼 인라인
- 출고 이력 카드에 운송장 번호 + "PDF" 다운로드 버튼 배치
- 새 탭 열기 불필요

### Q3. 재발급/폐기 → 이력 카드 인라인 + confirm dialog
- 이력 카드: "폐기(Void)" 버튼 → confirm dialog (운송장 번호 표시 + 폐기 확정)
- 폐기 완료 후 동일 위치에 "재발급" 버튼 활성화
- 재발급 완료 시 새 운송장 번호로 카드 갱신

---

## 구현 범위

### 수정 파일
- `src/components/warehouse/OutboundProcessForm.tsx`
  - 출고 대기 카드에 UPS 레이블 상태 배지 추가 (미발급/발급완료)
  - 출고 확정 시 UPS API 자동 호출 로직 연동
  - 출고 이력 카드에 PDF 다운로드 + 폐기 + 재발급 버튼 추가
  - Void confirm dialog 컴포넌트 인라인 추가

### i18n 추가 키 (ko/en/zh/ja)
```
ups_label_not_issued   — "UPS 레이블 미발급"
ups_label_issued       — "UPS 레이블 발급 완료"
ups_label_download     — "PDF"
ups_label_void         — "폐기"
ups_label_reissue      — "재발급"
ups_label_void_title   — "UPS 레이블 폐기 (Void)"
ups_label_void_desc    — "폐기 후에는 동일 번호로 재사용이 불가합니다."
ups_label_void_confirm — "폐기 확정"
ups_label_voided       — "폐기됨"
```

### ZEN_A4 제약
- 함수 50줄 이하 엄수
- OutboundProcessForm.tsx 1,000줄 초과 시 분리 필요 (현재 467줄 — 여유 있음)

---

## DoD (Definition of Done)

- [ ] 출고 대기 카드에 UPS 레이블 상태 배지 인라인 표시
- [ ] 출고 확정 시 UPS API 자동 발급 → `intl_ref_no` / `intl_ref_locked` 갱신 확인
- [ ] 이력 카드 PDF 다운로드 버튼 동작 확인
- [ ] 폐기(Void) confirm dialog 동작 확인
- [ ] 재발급 후 카드 운송장 번호 갱신 확인
- [ ] i18n 4개국어 키 추가 (ko/en/zh/ja)
- [ ] ZEN_A4 함수 50줄 이하 준수
- [ ] `rtk npm run test:regression` — 전체 PASS (현재 387건 기준)
- [ ] 코드 커밋 해시 기재: (미정)
- [ ] E2E 스크린샷 첨부 (출고 확정 → 레이블 발급 → 다운로드 → 폐기 → 재발급)

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-024 신규 발령 — Edward 승인 Issue #102 반영 |
