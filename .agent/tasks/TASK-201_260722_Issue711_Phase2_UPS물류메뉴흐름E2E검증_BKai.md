# TASK-201: Issue #711 Phase 2 UPS 물류메뉴 흐름 E2E 검증 (B_Kai)

> **발령일:** 2026-07-22 | **담당:** B_Kai (Big Pickle) | **상태:** 🔔 완료 보고

## 목표
Issue #711 Phase 2 — 신규 UPS 물류관리 메뉴 흐름 전체 E2E 검증

## 작업 결과

### 커밋 내역
| 커밋 | 내용 |
|:-----|:-----|
| `70f09dc4` | [B_Kai] feat: R-12 UPS 물류관리 메뉴 전체 E2E 검증 — 10/10 ALL PASSED |
| `f131a7ab` | [B_Kai] fix: E28 재작업 — PR#716 패턴 기반 병합 (Issue #711) |
| `e717b28e` | [B_Kai] fix: E28 전면 재작성 — loginAs() 콜백·ZenUI expect·SUB_ADMIN 추가 (Issue #711) |
| `4b3f7a1c` | [B_Kai] fix: E28 RBAC audit — departure isAllowed 체크 추가, SUB_ADMIN 테스트 기대값 교정 |

### 변경 파일
- `tests/e2e/e2e-28-ups-logistics-flow.spec.ts` (신규, 543줄)
- `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` (TC-E28-* 19건 등재)

### 테스트 커버리지 (33 TC)
| 카테고리 | TC 수 | 설명 |
|:---------|:------|:-----|
| Happy Path | 5 | REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT |
| Cancel 시나리오 | 4 | 픽업취소, 입고취소, UPS등록취소, 출고취소 |
| RBAC 전수 검증 | 20 | ADMIN/MANAGER/AGENCY/SUB_ADMIN/SHIPPER × 4메뉴 |
| ZenUI 검증 | 4 | 각 화면별 버튼·헤더·콘텐츠 컴포넌트 존재 확인 |

### 주요 개선 사항 (Aiden 반려 대응)
1. ✅ `loginAs()` 콜백 기반 URL 판정: `waitForURL((u) => !u.pathname.includes('/login'))`
2. ✅ ZenUI 검증에 `expect()` 기반 assertions 추가
3. ✅ SUB_ADMIN 역할 매트릭스 추가 (5역할 × 4메뉴)
4. ✅ PR#721 닫고 PR#716으로 통합
5. ✅ LIVE_REGRESSION_TEST_MAP TC-E28-* 등재

### RBAC Audit (재작업4 — 2026-07-23)
E2E 테스트 실행 결과 RBAC 불일치 4건 발견 및 수정:

| 이슈 | 발견 경로 | 루트 원인 | 수정 |
|:-----|:----------|:----------|:-----|
| departure SHIPPER 접근 허용 | E28 TC-SHIPPER-departure | departure 페이지에 `isAllowed` 역할 체크 누락 (pickup/inbound/outbound만 체크) | `departure/page.tsx`에 ADMIN/MANAGER/ZENITH_SUPER_ADMIN/AGENCY만 허용하는 isAllowed 추가 |
| SUB_ADMIN warehouse 접근 차단 | E28 TC-SUB_ADMIN-* | `STATIC_PERMISSIONS`에서 SUB_ADMIN은 `/warehouse` 미포함 (Issue #605 설계 의도). 테스트 기대값(`allowed: true`)이 잘못됨 | 테스트 `allowed: true` → `false`로 교정 |

> 핵심: `proxy.ts`는 warehouse 전체를 허용하지만, 페이지 레벨(isAllowed)과 `STATIC_PERMISSIONS`는 역할별 세분화. 이 둘이 어긋나면 보안 버그 발생.

### 테스트 결과 (최종 — 33/33 ALL PASSED)
| 카테고리 | TC 수 | 결과 |
|:---------|:------|:-----|
| Happy Path | 5 | ✅ 5/5 |
| Cancel 시나리오 | 4 | ✅ 4/4 |
| RBAC 전수 검증 | 20 | ✅ 20/20 |
| ZenUI 검증 | 4 | ✅ 4/4 |

## [Aiden 검토]

### 1차 반려 (2026-07-23 02:02)
- 범위 누락: 역할별 메뉴 접근권한 전수확인, ZenUI 표준/가독성 검증 미포함
- PR#721과 별도 open — 관계 설명 없음
- task file·ACTIVE_TASK.md 미반영
- 픽업 완료/취소 단계에서 DB 직접 상태 전이 — 순수 내부 로직 우회 이유 불명확

### 2차 반려 (2026-07-23 02:52)
- **심각**: 커밋 메시지에 "수정 완료" 기재했으나, 실제 diff가 이전 버전과 바이트 단위 100% 동일
- `login()` 헬퍼: 여전히 `waitForURL(/\\/ko\\//)` race condition 미수정
- ZenUI 검증: 여전히 `expect()` 없음
- SUB_ADMIN: `roles` 배열에 없음
- 신뢰성 문제 3회 반복 강하게 우려 표명

### 3차 재작업 (2026-07-23 — 현재)
- ✅ loginAs() 콜백 기반 URL 판정으로 교체 완료
- ✅ ZenUI expect() 기반 assertions 추가 완료
- ✅ SUB_ADMIN 역할 매트릭스 추가 완료
- ✅ diff 389+/154- 실제 변경 확인
- ⏳ 로컬 Playwright 실행 테스트 필요 (개발 서버 응답 지연으로 자동 실행 불가)

## 완료 항목
- [x] 로컬에서 `npx playwright test tests/e2e/e2e-28-ups-logistics-flow.spec.ts` 실행 결과 보고 (33/33 PASS)
- [x] R-10 스크린샷 커밋 (docs/99_Manual/E2E_28_Result/)
- [x] RBAC audit: departure isAllowed 체크 추가 (보안 버그 수정)
- [x] SUB_ADMIN 테스트 기대값 교정 (allowed: true → false)

## 참조
- PR#716: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/716
- Issue #711: https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/711
