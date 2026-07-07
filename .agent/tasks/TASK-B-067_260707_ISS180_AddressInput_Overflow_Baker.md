# TASK-B-067 — Issue #180 주소 검색 모달 iframe 잘림 수정

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Kimi)
> **우선순위**: P2
> **상태**: 🔔 검토 요청
> **선행 Task**: TASK-B-066 ✅ 권장
> **연관 이슈**: [Issue #180](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180)

---

## 배경

화주 등록/수정 화면의 주소 검색 모달(`DaumPostcodeEmbed`) 낶� iframe 컨텐츠가 모달 컨테이너의 `overflow-hidden` 때문에 잘리는 현상이 발견되었습니다.

---

## 작업 범위

### §1 — address-input.tsx 모달 overflow 수정

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/address-input.tsx`

모달 낶� 컨테이너의 `overflow-hidden`을 `overflow-auto`로 변경합니다.

```tsx
// Before
<div
  className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-xl"
  onClick={(e) => e.stopPropagation()}
>

// After
<div
  className="bg-white rounded-2xl overflow-auto w-full max-w-md shadow-xl"
  onClick={(e) => e.stopPropagation()}
>
```

---

## DoD (완료 기준)

- [x] `address-input.tsx` 모달 컨테이너 `overflow-hidden` → `overflow-auto` 변경
- [x] 전체 회귀 PASS (`npm run test:regression`) — 485/485 PASS
- [x] R-17 커밋 분리: 코드 커밋 / 문서 커밋
- [x] PR#227 브랜치에 push (기존 PR 활용)

---

## [설계 의견]

_(필요 시 기재)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

### §1 — address-input.tsx 모달 overflow 수정 ✅
- `DaumPostcodeEmbed` 모달 낶� 컨테이너 클래스에서 `overflow-hidden` → `overflow-auto`로 변경
- 카카오 우편번호 iframe 컨텐츠 잘림 문제 해결

### 회귀 테스트
- **80 files, 485/485 PASS**

### 커밋
- 코드: `01075d8` — `[Baker] fix: TASK-B-067 Issue #180 주소 검색 모달 iframe 잘림 수정`

### PR
- PR#227: `feature/teamb-jaison-b064-b065-dispatch` → `develop` (기존 PR에 추가 push)

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | 없음 | — | — |
