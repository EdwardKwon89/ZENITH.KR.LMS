# TASK-1149: Issue #1229 — 오더목록 잔여지연 인증 중복조회 Orders 한정 수정 (DEF-142)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1229](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1229) |
| **DEF** | [DEF-142](.agent/defects/DEF-142_오더목록_잔여지연_인증중복조회_외.md) |
| **담당** | B_Kai (Team A) |
| **착수** | 2026-10-03 18:24 KST (Issue #1229 코멘트 기재済) |
| **우선순위** | P2 (defect) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1149-orders-auth-dedup` (origin/develop `b8f0f3b2b` 기준) |

> 범위 준수: `validateUserAction()`·`requireAuth()` 시그니처 불변, 46개 호출부 영향 없음
> (getOrders에만 옵션 파라미터 추가). 전역 개선은 IMP-173으로 분리済.
> GitNexus impact `getOrders` LOW (호출 1건) 확인 후 수정.

## 수정

- `orders.ts getOrders()`: `preloaded?: {user, profile, supabase}` 옵션 추가 —
  제공 시 내부 `validateUserAction()` 생략, 미제공 시 기존 동작 100% 유지.
- `orders/page.tsx`: `requireAuth()` 결과 `{user, profile, supabase}` 전달
  (requireAuth 반환에 supabase 포함 확인済).
- `order.repository.ts findList()`: `select('*')` → 렌더 실사용 14컬럼 + 기존 join 유지.
  소비처 전수: `orders/page.tsx`→`OrderDataTable`のみ (id/상태는 모달 포함 커버).
  findList 호출부도 getOrders 1건のみ — 타 영향 없음.

## 착수 체크리스트

- [x] 브랜치 생성 + `status:in-progress` + Issue 착수 코멘트
- [x] GitNexus impact (LOW) + 호출부 전수 확인
- [x] preloaded 옵션 + page 전달 + select 축소
- [x] 회귀 테스트 신설 (실행 behavioral 4건)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1229 원문 대비)

- [x] 선택적 preloaded 파라미터 (기존 호환 유지)
- [x] page.tsx 전달 수정
- [x] select 축소 (소비처 전수 확인 — 범위 내 포함 가능 판단)
- [x] 46개 호출부 영향 없음 (validateUserAction 미수정 + TC-DEDUP-02)
- [x] 회귀 테스트 + 맵 갱신
- [ ] R-10 production 재실측은 배포 후 Aiden (본 Task 범위 밖)

## [작업 결과]

- 코드 커밋: `d32f1a3b1678aff354c59214445cb98ee5cb40d5`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 223 passed (223), Tests 1548 passed (1548)
- DoD 항목별 증거:
  - 테스트: `tests/unit/orders/order-list-dedup.test.ts` TC-DEDUP-01~04 —
    실제 getOrders+findList 실행, supabase 체인 목으로 select SQL·필터 검증.
  - 제거 효과: 페이지 전환당 getUser+profile 1회분 왕복 제거 (요청 흐름상 3중복 중 1).
    findList payload 61컬럼 → 14컬럼+join.

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)
