# TASK-B-073 — DEF-098 OrderRegistrationForm watch TDZ 긴급 수정

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P0 (즉시 — UAT-17 전체 차단)
> **상태**: 🔔 검토 요청
> **연관 이슈**: [Issue #250](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/250)
> **DEF 보고서**: `.agent/defects/DEF-098_OrderRegistrationForm_watch_TDZ_오류.md`

---

## 배경

TASK-B-060 커밋 `5c8c247`에서 삽입된 `isAgencyShipper`·`destPort` 두 줄이
`useForm()` 선언부 위에 위치하여 `watch` TDZ(Temporal Dead Zone) ReferenceError 발생.
`/orders/new` 전체 진입 불가로 UAT-17-01/02/03 모두 차단됨.

---

## 작업 범위

**파일**: `src/components/orders/OrderRegistrationForm.tsx`

### 변경 내용

Line 137~138의 두 줄을 Line 163(useForm 블록 종료) **하단**으로 이동.

```tsx
// ❌ 현재 위치 (Line 137~138) — 제거
const isAgencyShipper = affiliation?.role === USER_ROLES.AGENCY_SHIPPER;
const destPort = ports.find((p) => p.id === watch('dest_port_id'));

// ✅ 이동 대상 위치 — useForm 블록 직후 (Line 163 다음)
const isAgencyShipper = affiliation?.role === USER_ROLES.AGENCY_SHIPPER;
const destPort = ports.find((p) => p.id === watch('dest_port_id'));
```

코드 변경은 두 줄 위치 이동만으로 완료됨. 로직 변경 없음.

---

## DoD

- [x] Line 137~138 두 줄을 useForm 블록(Line 163) 하단으로 이동
- [x] 로컬 개발서버에서 `/orders/new` 정상 진입 확인 (에러 없음)
- [x] `shipper@zenith.kr` 로그인 후 오더 등록 폼 로드 확인
- [x] 회귀 테스트 PASS (`rtk npm run test:regression`)
- [ ] R-17 커밋 순서 엄수:
  - `[Baker] fix: DEF-098 OrderRegistrationForm watch TDZ — isAgencyShipper·destPort useForm 하단 이동`
  - 문서 커밋: task file 🔔 + DEF-098 갱신
- [ ] PR 생성 (`feature/teamb-def-098` → develop, `Closes #250`)

---

## 착수 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-def-098
```

---

## [작업 결과]

### 수정 내용
- `src/components/orders/OrderRegistrationForm.tsx`
  - Line 137~138의 `isAgencyShipper`/`destPort` 선언을 useForm 블록(Line 163) 하단으로 이동
  - `watch` TDZ ReferenceError 해소, `/orders/new` 진입 복구

### 검증
- `npm run build` **PASS**
- `npm run test:regression` **81 files, 489/489 PASS**

### 커밋
- 코드: `ed601e6` — `[Baker] fix: DEF-098 OrderRegistrationForm watch TDZ — isAgencyShipper·destPort useForm 하단 이동`
- 문서: `<TBD>` — `[Baker] docs: TASK-B-073 완료 보고 — task file + ACTIVE_TASK.md`

### PR
- PR#NNN: `feature/teamb-def-098` → `develop` (`Closes #250`)

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | TASK-B-073 발령 — DEF-098 긴급 수정 지시 |
