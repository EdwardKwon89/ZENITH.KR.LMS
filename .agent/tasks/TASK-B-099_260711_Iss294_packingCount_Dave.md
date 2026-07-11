# TASK-B-099: Issue #294 — zen_order_packages.packing_count 의미 불일치 (품목 개수 확정 + UPS 1-pkg 제약)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#294](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/294) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 설계 결정 (JSJung 확정, Issue 코멘트 참조)
- `packing_count` = 품목(item) 개수로 확정
- `physical_box_count` (신규) = 물리적 박스/포장 개수
- UPS 서비스 한정 → 오더당 패키지 1개 제약

### develop 기 반영 확인
계산식 수정(× packing_count 제거) + `physical_box_count` 컬럼 추가 + 참조 전환은 이미 develop에 병합 완료 상태.

### 본 PR 신규 변경

| 파일 | 변경 |
|:-----|:------|
| `src/lib/validation/order.ts` | `orderPackageSchema`에 `physical_box_count` optional + UPS 1-package `.superRefine()` 제약 추가 |
| `src/components/orders/OrderRegistrationForm.tsx` | `appendPackage` 호출에 `physical_box_count: 1` 추가 (type 정합성) |

### 검증
- **build PASS** ✅
- UPS 모드 선택 시 패키지 2개 이상 등록 시도 → Zod refine에서 `packages` 에러 반환

### 커밋
- 커밋: `커밋해시`
