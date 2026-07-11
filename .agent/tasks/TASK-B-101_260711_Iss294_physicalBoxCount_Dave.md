# TASK-B-101: Issue #294 — zen_order_packages.packing_count 의미 불일치 (physical_box_count 기반 작업)

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

### 커밋 2개

| # | 커밋 | 내용 | 파일 |
|:-:|:-----|:-----|:-----|
| 1 | `8d37cd58` | items 1~3: 마이그레이션 + 계산식 수정 + 참조 전환 | 11 files |
| 2 | `105922f9` | item 4: UPS 1-pkg 제약 Zod refine + form | 2 files |

#### 항목 1~3 상세
- DB 마이그레이션: `physical_box_count` 컬럼 추가
- 계산식 수정: `routing.ts`, `orders.ts`, `tisa.ts`, `UpsFreightEstimateSection.tsx`, `packing/page.tsx`, `orders/[orderId]/page.tsx`에서 `× packing_count` 제거
- 참조 전환: `OutboundProcessForm.tsx`, `orders/[orderId]/page.tsx`, `invoice.ts` → `physical_box_count` 참조

#### 항목 4 상세
- `orderPackageSchema`에 `physical_box_count` optional 추가
- UPS 모드 시 packages.length !== 1 → Zod refine 에러
- `OrderRegistrationForm.tsx` appendPackage 호출 정합성

### 검증
- **build PASS** ✅

### 처리 이력
- PR#353(Mike)에 혼입된 #294 구현을 회수하여 새 브랜치 `feature/teamb-task-b101-iss294-physical-box-count`로 재구성
- PR#354(TASK-B-100, Zod refine만)는 이 PR 머지 후 rebase하여 재제출 예정
