# TASK-B-116: Issue #429 — STATIC_PERMISSIONS에 /address-book 추가

## 기본 정보

| 항목 | 값 |
|:-----|:---|
| **Task-ID** | TASK-B-116 |
| **생성일** | 260713 |
| **Issue** | #429 |
| **담당 Agent** | Baker |
| **우선순위** | P2 |
| **전제조건** | 없음 |

## 업무 개요

주소록(`/address-book`) 메뉴가 사이드바에서 어떤 역할로도 접근 불가한 문제 수정.
`STATIC_PERMISSIONS`의 각 역할 배열에 `/address-book` 경로를 추가하여 메뉴 표시 복구.

## 근본 원인

1. `NaviSidebar.tsx`에서 주소록이 "마이페이지" 하위 메뉴로 배치 (`/mypage` children)
2. 실제 라우트는 최상위 `/address-book` ( `/mypage/address-book` 이 아님)
3. `checkPermission()`은 prefix 매칭 수행 → `/address-book`이 `STATIC_PERMISSIONS` 어디에도 없어 메뉴 필터링에서 제외

## 수정 내용

**파일**: `src/lib/auth/rbac.ts`

- 모든 역할(12종)의 `STATIC_PERMISSIONS` 배열에 `'/address-book'` 추가
  - ADMIN, MANAGER, OPERATOR, CARRIER, CUSTOMS_BROKER, DELIVERY_AGENT, AGENCY, AGENCY_SHIPPER, SHIPPER, CORPORATE, INDIVIDUAL, USER

## 테스트 결과

- 회귀 테스트: **81 파일 / 485 테스트 ALL PASS** (로컬)
- CI: PR Checks에서 검증 필요
- 변경 범위: 허용 경로 추가만 (기존 로직 변경 없음)

## DoD

- [x] STATIC_PERMISSIONS 수정
- [x] 회귀 테스트 통과 (485/485)
- [x] 커밋 완료
- [x] PR 생성
- [ ] CI PASS 확인
- [ ] 브라우저 스크린샷 검증 (메뉴 노출 + /address-book 이동)
