# TASK-B-181: PICKUP 시 Local Tracking No 비활성화 (Issue #777)

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#777](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/777) |
| **우선순위** | P3 |
| **상태** | 🔔 PR #780 |

## 개요

`/ko/orders/new`에서 배송방식 → "픽업수령"(PICKUP) 선택 시 패키지별 "Local Tracking No"(`domestic_ref_no`) 입력 필드 비활성화

## 변경 파일

| 파일 | 변경 |
|:-----|:------|
| `src/components/orders/OrderRegistrationForm.tsx` | PICKUP 조건 `disabled` + `opacity-40 bg-slate-100` |

## 검증

- TypeScript: 0 error
- Build: ✅

## 브랜치

- `fix/teamb-iss777-pickup-domestic-ref-no` (base `TeamB_Dev`)
- PR [#780](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/780)
