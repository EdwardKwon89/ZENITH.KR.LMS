# TASK-B-100: Issue #294 — zen_order_packages.packing_count 의미 불일치 (UPS 1-pkg 제약)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#294](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/294) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 설계 확정 (JSJung, Issue 코멘트)
- `packing_count` = 품목(item) 개수
- `physical_box_count` (신규) = 물리적 박스 개수
- UPS 서비스: 오더당 패키지 1개 제약

### develop 기 반영
DB 마이그레이션 + 계산식 수정(× packing_count 제거) + physical_box_count 참조 전환은 이미 develop에 머지 완료됨.

### 신규 변경 (본 PR)

| 파일 | 변경 | 설명 |
|:-----|:------|:------|
| `src/lib/validation/order.ts` | `physical_box_count` 추가 + UPS refine | 스키마에 optional 필드 추가, UPS 모드 시 packages.length !== 1 오류 |
| `src/components/orders/OrderRegistrationForm.tsx` | `appendPackage` 호출에 `physical_box_count: 1` | type 정합성 |

### 검증
- **build PASS** ✅
- UPS 모드 선택 → 패키지 2개 이상 등록 시도 → Zod refine 에러 반환

### 커밋
- `3e9d5a19` — `[Dave] feat: TASK-B-100 Issue #294 — UPS 1-package 제약 Zod refine + physical_box_count form 적용`
