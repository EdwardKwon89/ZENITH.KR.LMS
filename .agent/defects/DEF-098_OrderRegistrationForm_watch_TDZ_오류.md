# DEF-098 — OrderRegistrationForm `watch` Temporal Dead Zone 오류

> **발견일**: 2026-07-07
> **발견자**: Jaison (Team B 총괄)
> **긴급도**: 즉시 (UAT-17 전체 차단)
> **발생 출처**: TASK-B-060 (Baker, 커밋 `5c8c247`)
> **영향 범위**: `/ko/orders/new` 페이지 전체 (모든 역할 공통)

---

## 발견 경위

UAT-17-01 수행을 위해 `shipper@zenith.kr`로 로그인 후 대시보드 → "오더 등록" 클릭 시
**"System Interruption"** 에러 화면이 즉시 표시되어 오더 등록 페이지 진입 자체가 불가한 상태.

---

## 현상

- **증상**: `/orders/new` 접근 시 `ZenErrorView` ("System Interruption") 즉시 표시
- **에러 유형**: `ReferenceError: Cannot access 'watch' before initialization`
- **발생 위치**: [src/components/orders/OrderRegistrationForm.tsx:138](../../src/components/orders/OrderRegistrationForm.tsx#L138)

---

## 근본 원인

TASK-B-060에서 Baker가 UPS 견적 섹션 연동을 위해 `isAgencyShipper`와 `destPort` 두 변수를 `useForm()` 선언부 **위**에 삽입함. JavaScript `const`의 Temporal Dead Zone(TDZ) 특성으로 `watch` 초기화 전 접근 → ReferenceError.

```tsx
// ❌ 현재 코드 (잘못된 순서)
const isAgencyShipper = affiliation?.role === USER_ROLES.AGENCY_SHIPPER; // Line 137
const destPort = ports.find((p) => p.id === watch('dest_port_id'));       // Line 138 ← watch 미정의!

const {                    // Line 141
  register,
  control,
  handleSubmit,
  watch,                   // Line 146 ← 여기서 비로소 초기화
  setValue,
  ...
} = useForm<OrderRegistrationInput>({...});
```

---

## 영향 범위

| 경로 | 역할 | 영향 |
|:-----|:----:|:----:|
| `/ko/orders/new` | 모든 역할 | 🔴 진입 불가 |
| UAT-17-01 (DIRECT 오더) | shipper | 🔴 차단 |
| UAT-17-02 (PICKUP 오더) | shipper | 🔴 차단 |
| UAT-17-03 (Agency 요율) | agency_shipper | 🔴 차단 |
| UAT-17 전체 | — | 🔴 전면 차단 |

---

## 수정 방법

`isAgencyShipper`와 `destPort` 두 선언을 `useForm()` 블록 **하단**으로 이동.

```tsx
// ✅ 수정 후 코드
const {
  register,
  control,
  handleSubmit,
  watch,        // ← 먼저 정의
  setValue,
  trigger,
  formState: { errors, isSubmitting }
} = useForm<OrderRegistrationInput>({...});

// useForm 아래에서 watch 사용
const isAgencyShipper = affiliation?.role === USER_ROLES.AGENCY_SHIPPER;
const destPort = ports.find((p) => p.id === watch('dest_port_id'));
```

**수정 대상 파일**: `src/components/orders/OrderRegistrationForm.tsx`
- 삭제: Line 137~138 (현 위치)
- 삽입: `useForm` 블록(Line 141~163) 직후

---

## 권장 조치

1. **즉시**: Baker가 위 수정 적용 후 PR 생성 (`feature/teamb-def-098`)
2. 회귀 테스트 PASS 확인 후 Aiden PR 머지
3. UAT-17 재착수

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | DEF-098 초기 작성 — UAT-17 진입 전면 차단 |
