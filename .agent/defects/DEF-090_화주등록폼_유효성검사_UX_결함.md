# DEF-090: 화주 등록 폼 유효성 검사 UX 결함 (할인율 오류·폼 초기화·필드별 오류 미표시)

> **발견일**: 2026-07-04
> **발견자**: JSJung (UAT-15-01 Step 3 수행 중)
> **긴급도**: High
> **연관 Issue**: [#159](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/159)

---

## 발견 경위

UAT-15-01 Step 3 — `/ko/agency/shippers/new` 에서 화주 등록 시 할인율 `1` 입력 후 제출하면 오류가 발생하고, 이미 입력한 모든 필드 값이 초기화됨. 오류 발생 시 어느 필드가 문제인지 표시되지 않음.

---

## 현상 (3건)

### 현상 A — 할인율 `1` 입력 시 Zod 오류
- UI: `input type="number" min="0" max="99.99"` + `%` 접미사 → 사용자는 퍼센트(%) 단위로 입력
- `shipper-form.tsx`: `/100` 변환 없이 그대로 전달 (`discount_rate: Number('1')` = `1.0`)
- Zod: `z.number().max(0.9999)` → `1.0 > 0.9999` → 유효성 검사 실패

### 현상 B — 오류 발생 시 폼 전체 초기화
- `<form action={handleSubmit}>` Next.js form action 방식에서 오류 후 form 리셋
- Uncontrolled inputs (name, discount_rate, biz_no, contact 등) 값 전량 소실
- 사용자가 모든 정보를 다시 입력해야 함

### 현상 C — 필드별 오류 메시지 표시 없음
- `createAgencyShipper`가 Zod 오류를 `throw new Error(parsed.error.message)` 단순 문자열로 반환
- 클라이언트에서 상단에 전체 오류 JSON만 표시
- 어느 필드가 문제인지 시각적 피드백 없음

---

## 영향 범위

- UAT-15-01 Step 3 실행 불가 (할인율 입력 시 오류)
- 모든 화주 등록 시도에서 입력 정보 유실 가능

---

## 결함 위치

| 레이어 | 파일 | 문제 |
|:------|:-----|:-----|
| Action | `src/app/actions/agency/shippers.ts` | Zod 오류를 `throw Error` 단순 반환 — 필드별 오류 정보 소실 |
| Validation | `src/lib/validations/agency.ts` | Zod 오류 메시지 미국제화 |
| UI | `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx` | `/100` 변환 누락, formValues 상태 없음, fieldErrors 상태 없음 |
| UI | `src/app/[locale]/(dashboard)/agency/shippers/new/required-fields.tsx` | defaultValue props 없음, 필드별 오류 표시 없음 |
| UI | `src/app/[locale]/(dashboard)/agency/shippers/new/contact-fields.tsx` | defaultValue props 없음, 필드별 오류 표시 없음 |

---

## 권장 조치

**Dave (Backend — TASK-B-045)**:
1. `actions/agency/shippers.ts` — `createAgencyShipper` Zod 오류를 `{ success: false, fieldErrors }` 형태로 반환 (throw 대신)
2. `validations/agency.ts` — Zod 오류 메시지 한글화

**Baker (Frontend — TASK-B-046)**:
1. `shipper-form.tsx` — `discount_rate / 100` 변환, `formValues` 상태, `fieldErrors` 상태 추가
2. `required-fields.tsx` — `defaultValue` + `fieldError` props 추가
3. `contact-fields.tsx` — `defaultValue` + `fieldError` props 추가
