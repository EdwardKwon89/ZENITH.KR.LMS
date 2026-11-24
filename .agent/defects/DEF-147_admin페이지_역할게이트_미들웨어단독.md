# DEF-147 | admin 화면 11건의 역할 게이트가 미들웨어 단독 — 페이지 레벨 인가 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1151(Issue #1314, DEF-146) 운영 의존성 취약점 영향 분석 중. `next` 미들웨어 우회 권고(GHSA-492v-c6pp-mqqv 외 2건)가 **실제로 도달 가능한지** 판정하려고 "미들웨어를 우회했을 때 남는 2차 방어선"을 추적하다 발견 |
| **긴급도** | **Medium** — 페이지 레벨 역할 게이트 다층 방어(Defense-in-Depth) 보강 필요 |
| **발견일** | 2026-11-15 |
| **발견자** | D_Kai (Team A) |
| **관련** | Issue #1314 · TASK-1151 · DEF-146 · R-18 |
| **조치 상태** | 미해소 (부분 해소: 데이터 계층은 `TASK-1166` #1399로 차단, 페이지/레이아웃 게이트 정비 대기) |

> **공개 저장소 기준 (R-18 / IS #1489)**: 우회 경로·세부 재현·미방어 페이지 목록 상세는 비공개 경로로 관리합니다.

## 1. 목표 상태 (설계 기준)

1. `admin` 레이아웃 및 서버 컴포넌트 페이지에서 서버측 역할 게이트(`requireAdmin()` / `checkPermission()`)를 일관 적용해 미들웨어 단일 의존을 해소합니다.
2. `src/app/actions/ups/rates.ts` 및 관련 조회 경로에 역할별 허용 범위(관리자 vs 화주 공개 범위)를 서버에서 강제합니다.
3. 인라인 역할 검사를 RBAC 권한표(`checkPermission`) 기반으로 점진 통합합니다 (`IMP-001` 연계).

## 4. 권장 조치 (별도 Task)

1. **`admin/layout.tsx` 신설 + 서버측 역할 게이트** — `requireAdmin()`(또는 `checkPermission(profile.role, '/admin')`)로 통일. 22개 페이지를 개별 수정하는 대신 **한 곳에서 강제**하는 것이 회귀 위험이 가장 낮다.
2. **`admin/ups-rates/page.tsx`** — `requireAuth()` → `requireAdmin()`(또는 `validateAdminAction()`)로 교체. 페이지에서 직접 테이블을 읽는 패턴 자체를 액션 경유로 정리.
3. **`src/app/actions/ups/rates.ts`** — 조회 함수에 역할 정책 부여. 화주 화면(`shipper/ups-rates`)이 같은 액션을 쓰므로 **단순 ADMIN 제한은 불가** → "화주는 본인 조직 요율만" 같은 범위 제한 필요(설계 확정 사항).
4. **RLS 확인** — `zen_agency_pricing_policies`·`zen_ups_fuel_surcharges`의 `authenticated` SELECT 정책 확인.
5. **재발 방지** — `check-audit`처럼 "admin 페이지 역할 게이트" 정적 점검 스크립트 검토(선택).

> ⚠️ 본 DEF는 **발견 사실의 기록**이며, 인가 전수 감사(authorization audit)가 아니다. §1.2의 `corporate.ts`·`auth.ts`는 grep 기반 분류로, 함수별 판정은 별도 감사가 필요하다(TASK-1151 §9-3 미확인 항목).

## 5. 왜 TASK-1151에서 고치지 않았는가

- Issue #1314의 범위는 **"취약점 도달 가능성 분석 + 단계별 업그레이드 계획"** 이며, 구현은 Edward 승인 후 별도 Task다.
- 인가 구조 변경은 `src/` 동작 변경이고, 병행 진행 중인 TASK-1152(B_Kai PoC)와 파일 충돌 위험이 있다.
- 분석 Task가 코드를 바꾸면 "P0 업그레이드가 코드 변경 없이 가능하다"는 전제(§6.1)가 깨진다.
