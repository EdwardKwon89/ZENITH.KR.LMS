# TASK-130 — DEF-053 요율 UI 개선 5종 커밋 + R-17 완료 보고

> **발령일**: 2026-06-09
> **담당 Agent**: D_Kai (OpenCode)
> **우선순위**: P3
> **전제조건**: 없음 (uncommitted 변경 이미 존재)
> **관련 DEF**: DEF-053
> **상태**: ⬜

---

## 배경 및 목표

D_Kai가 DEF-053(운송 서비스 요율 UI 개선 5종) 작업을 완료했으나 R-17 절차 없이 uncommitted 상태로 남아 있다.
본 Task는 해당 변경을 검증하고 R-17 절차에 따라 커밋·보고하는 것을 목표로 한다.

**현재 uncommitted 파일 (5종)**:
- `src/app/[locale]/(dashboard)/admin/rates/page.tsx`
- `src/app/[locale]/(dashboard)/admin/rates/useRates.ts`
- `src/components/admin/RateCardForm.tsx`
- `src/components/admin/RateCardList.tsx`
- `src/components/ui/ZenDataGrid.tsx`

---

## 작업 범위

### §1 — 변경 내용 검증

`git diff HEAD` 로 uncommitted 변경을 확인하여 DEF-053 요구사항 5종 전량 구현 여부를 검증한다:

| # | 요구사항 | 확인 포인트 |
|:--:|:---------|:-----------|
| ① | Transit Days port 조건부 렌더링 제거 | `RateCardForm.tsx` — port 조건 없이 transit_days 표시 |
| ② | 수정화면 ✕ New 버튼 + onResetForm prop 제거 | `RateCardForm.tsx`, `RateCardList.tsx` |
| ③ | 검색 placeholder 한글화 | `ZenDataGrid.tsx` 또는 해당 컴포넌트 |
| ④ | 운송 수단/상태 ComboBox 필터 추가 | `page.tsx` — filterMode/filterActive select |
| ⑤ | 저장 전 client-side validation 보강 | `RateCardForm.tsx` — Slab·ORG·DES·Margin·PlatformFee |

**누락 항목 발견 시**: 해당 항목만 즉시 보완 후 §2 진행.

### §2 — 회귀 테스트

```bash
rtk npm run test:regression
```

### §3 — R-17 완료 보고

1. **[코드 커밋]** uncommitted 변경 전량 커밋
2. **본 파일 `[작업 결과]` 섹션 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md 상태** 🔄→🔔
4. **`scratch/IMP_PROGRESS.md`** — DEF-053은 IMP 항목 없음 (생략)
5. **자가 검증 — `check-R17-DoD` 실행** (R-17 v1.6)
6. **[문서 커밋]** task file · ACTIVE_TASK 포함

---

## DoD (완료 정의)

- [ ] DEF-053 ① Transit Days 조건부 렌더링 제거 확인
- [ ] DEF-053 ② 수정화면 ✕ New 버튼 제거 확인
- [ ] DEF-053 ③ 검색 placeholder 한글화 확인
- [ ] DEF-053 ④ 운송 수단/상태 ComboBox 필터 동작 확인
- [ ] DEF-053 ⑤ 저장 전 client-side validation 동작 확인
- [ ] 회귀 테스트 전체 PASS: N/N
- [ ] 코드 커밋 해시 기재: (TBD)
- [ ] 문서 커밋 해시 기재: (TBD)

---

## [발견 이슈]

_(작업 중 발견한 담당 Task 범위 밖 이슈를 기재. 없으면 "없음" 기재)_

| ISS# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | — | — | — |

---

## [설계 의견]

_(D_Kai 작성 시 기재)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

_(D_Kai 작성 후 🔔 변경)_

---

## [Aiden 검토]

_(Aiden 전속)_
