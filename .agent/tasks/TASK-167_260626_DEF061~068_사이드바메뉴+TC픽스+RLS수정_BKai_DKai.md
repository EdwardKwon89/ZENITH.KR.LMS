# TASK-167 — DEF-061~068 사이드바 메뉴 미등록 + TC-POLICY 픽스 + RLS 수정

> **Task-ID**: TASK-167
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — Edward 지시 (2026-06-26)
> **담당**: B_Kai (§1 NaviSidebar UI) / D_Kai (§2 TC-POLICY + §3 RLS)
> **우선순위**: P2
> **상태**: ⬜
> **GitHub Issue**: [#115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/115)

---

## 업무 개요

발령되지 않은 미해결 DEF 6건을 Team A에서 일괄 처리한다.

| DEF# | 제목 | 긴급도 | 담당 |
|:----:|:-----|:------:|:-----|
| DEF-061 | `/master-orders` 마스터 포장 메뉴 NaviSidebar 미등록 | High | B_Kai |
| DEF-062 | `/admin/permissions` 권한 관리 페이지 NaviSidebar 미등록 | High | B_Kai |
| DEF-063 | `/master/geo` 지리정보 관리 NaviSidebar 미등록 + `/master/*` 경로 정리 | High | B_Kai |
| DEF-064 | `/notifications` 알림 페이지 헤더/사이드바 미연결 | Medium | B_Kai |
| DEF-065 | TC-POLICY-03/04/06/07 db reset 환경 실패 (SEA/WM seed 의존) | Medium | D_Kai |
| DEF-068 | `order_status_history` SELECT RLS policy 누락 — 일마감 전체 비활성화 | High | D_Kai |

---

## 전제조건

없음 — 즉시 착수 가능

---

## 구현 범위

### §1 B_Kai — NaviSidebar 미등록 4건

**수정 파일**: `src/components/layout/NaviSidebar.tsx`

#### DEF-061: `/master-orders` 추가

`logistics_group` 하위에 추가:
```ts
{ title: t("master_orders"), href: "/master-orders" }
```
- 접근 역할: OPERATOR, MANAGER, ADMIN

#### DEF-062: `/admin/permissions` 추가

`admin/settings` 그룹 또는 별도 항목으로 추가:
```ts
{ title: t("permissions"), href: "/admin/permissions" }
```
- 접근 역할: ADMIN

#### DEF-063: `/master/geo` 추가 + 경로 정리

"기본 정보" 그룹 하위에 추가:
```ts
{ title: t("geo_master"), href: "/master/geo" }
```
- `/admin/codes` vs `/master/codes` 중복 경로 정리 (어느 쪽으로 단일화할지 구현 전 확인 후 결정)
- 접근 역할: ADMIN

#### DEF-064: `/notifications` 연결

- 헤더 Bell 아이콘 → `/notifications` 라우팅 연결 (사이드바 항목 추가 불필요)
- `src/components/layout/` 헤더 컴포넌트 확인 후 적용

**i18n 추가 키** (ko/en/zh/ja):
```
master_orders   — "마스터 포장" / "Master Packing"
permissions     — "권한 관리" / "Permissions"
geo_master      — "지리정보 관리" / "Geo Master"
```

---

### §2 D_Kai — TC-POLICY 통합 테스트 픽스 (DEF-065)

**대상 파일**: `tests/integration/p6-transport-policy.test.ts`

실패 TC: TC-POLICY-03 / TC-POLICY-04 / TC-POLICY-06 / TC-POLICY-07

**방안** (구현 전 선택):
- A안: 픽스처 인라인화 — TC 내부에서 `insertFixtureRateCard()` 등 실제 데이터 삽입 후 cleanup
- B안: `vitest globalSetup`에서 `seed_rates_realistic.sql` 실행 보장
- C안: mock 기반 전환 — DB 없이 동작

`db reset` 환경에서 `npm run test:regression` 전체 PASS 확인 필수.

---

### §3 D_Kai — order_status_history RLS policy (DEF-068)

**신규 migration 파일 작성**:
```
supabase/migrations/20260626XXXXXX_fix_order_status_history_rls_select_policy.sql
```

```sql
-- ADMIN/ZENITH_SUPER_ADMIN 전체 조회
CREATE POLICY "Admins can view all order status history"
  ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

-- MANAGER 전체 조회
CREATE POLICY "Managers can view all order status history"
  ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'MANAGER'
  );

-- 기타 authenticated 사용자: 본인 오더 이력만 조회
CREATE POLICY "Users can view own order status history"
  ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.zen_orders WHERE shipper_id = auth.uid()
    )
  );
```

**검증**: `/ko/ups/daily-close` 일마감 페이지에서 RELEASED 오더 조회 정상 확인.

---

## DoD (Definition of Done)

- [ ] DEF-061: 사이드바에서 `/master-orders` 메뉴 접근 가능 (OPERATOR 역할 확인)
- [ ] DEF-062: 사이드바에서 `/admin/permissions` 메뉴 접근 가능 (ADMIN 역할 확인)
- [ ] DEF-063: 사이드바에서 `/master/geo` 메뉴 접근 가능 + 중복 경로 정리
- [ ] DEF-064: 헤더 Bell 아이콘 → `/notifications` 라우팅 동작 확인
- [ ] DEF-065: TC-POLICY-03/04/06/07 `npm run test:regression` PASS
- [ ] DEF-068: `/ko/ups/daily-close` 일마감 RELEASED 오더 조회 정상 동작
- [ ] i18n 4개국어 키 추가 (ko/en/zh/ja)
- [ ] ZEN_A4 함수 50줄 이하 준수
- [ ] `rtk npm run test:regression` 전체 PASS (387건 기준)
- [ ] 코드 커밋 해시 기재: (미정)
- [ ] E2E 또는 UI 스크린샷 첨부 (사이드바 메뉴 4건 + 일마감 조회)

---

## [설계 의견]

_착수 후 B_Kai / D_Kai 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-167 신규 발령 — DEF-061~068 일괄 처리 Issue #115 |
