# TASK-B-007 — SPR-03 Agency 요율 오버라이드 UI 구현

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-B-007 |
| **생성일** | 2026-06-16 |
| **할당 Agent** | Baker (Big Pickle) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-B-006 ✅ (Agency 요율 오버라이드 Server Actions 완료) |
| **관련 IMP** | IMP-116 |
| **브랜치** | `feature/ups-spr03-devteam-agency-rate-overrides` (TASK-B-006 동일 브랜치) |
| **커밋 태그** | `[Baker]` |
| **상태** | 🔔 |

---

## [목표]

TASK-B-006에서 구현된 Server Actions 3종을 기반으로  
AGENCY role이 자체 요율 오버라이드를 조회·등록·비활성화할 수 있는  
UI 페이지 일체 + NaviSidebar 메뉴 + i18n 키를 구현한다.

---

## [기존 인프라 확인]

| 항목 | 위치 | 상태 |
|:----|:----|:----:|
| Server Actions 3종 | `src/app/actions/agency/rate-overrides.ts` | ✅ TASK-B-006 완료 |
| Barrel export | `src/app/actions/agency/index.ts` | ✅ |
| AgencyRateOverrideWithRefs 타입 | `src/types/agency.ts` | ✅ |
| CreateAgencyRateOverrideInput 타입 | `src/types/agency.ts` | ✅ |
| CreateAgencyRateOverrideSchema | `src/lib/validations/agency.ts` | ✅ |
| base_rate 목록 조회 | `src/app/actions/ups/rates.ts` → `getUpsBaseRates()` | ✅ |
| TrendingUp 아이콘 | `NaviSidebar.tsx` line 19 (이미 import됨) | ✅ |
| SPR-02 Baker 분리 패턴 참조 | `src/app/[locale]/(dashboard)/agency/shippers/` | ✅ |

---

## [작업 범위]

### 1. NaviSidebar 메뉴 추가

**파일**: `src/components/layout/NaviSidebar.tsx`

**위치**: line 146 (`agency_shippers_nav` 행) **직후** 에 삽입

```typescript
{ title: t("agency_rate_overrides_nav"), href: "/agency/rate-overrides", icon: TrendingUp },
```

> ⚠️ `TrendingUp`은 line 19에 이미 import됨 — 신규 import 추가 금지

---

### 2. i18n 키 추가

**파일 1**: `messages/ko.json` (최상위 레벨에 추가 — 네임스페이스 아님)

```json
"agency_rate_overrides_nav": "요율 오버라이드",
"agency_rate_overrides_title": "요율 오버라이드 관리",
"agency_rate_overrides_desc": "대리점 전용 요율을 설정하고 관리합니다.",
"agency_rate_overrides_new": "신규 요율 등록",
"agency_rate_overrides_base_rate": "기준 요율",
"agency_rate_overrides_selling": "판매가",
"agency_rate_overrides_cost": "원가",
"agency_rate_overrides_valid_from": "적용 시작일",
"agency_rate_overrides_valid_until": "적용 종료일",
"agency_rate_overrides_deactivate": "비활성화"
```

**파일 2**: `messages/en.json` (동일 키 영문 추가)

```json
"agency_rate_overrides_nav": "Rate Overrides",
"agency_rate_overrides_title": "Rate Override Management",
"agency_rate_overrides_desc": "Configure and manage agency-specific rate overrides.",
"agency_rate_overrides_new": "New Rate Override",
"agency_rate_overrides_base_rate": "Base Rate",
"agency_rate_overrides_selling": "Selling Price",
"agency_rate_overrides_cost": "Cost Price",
"agency_rate_overrides_valid_from": "Valid From",
"agency_rate_overrides_valid_until": "Valid Until",
"agency_rate_overrides_deactivate": "Deactivate"
```

---

### 3. 목록 페이지 (서버 컴포넌트)

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/page.tsx`

- `getAgencyRateOverrides(agencyOrgId)` 호출 → 데이터 fetch
- `agencyOrgId`: `profile.org_id` (validateUserAction으로 취득)
- 클라이언트 컴포넌트 `RateOverridesClient`에 `overrides` props 전달
- 50줄 이하 준수 (ZEN_A4)

### 4. 신규 등록 페이지 (서버 컴포넌트)

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/new/page.tsx`

- `getUpsBaseRates()` 호출 → base_rate 목록 fetch (드롭다운용)
- 클라이언트 컴포넌트 `RateOverrideForm`에 `baseRates` props 전달
- 50줄 이하 준수 (ZEN_A4)

### 5. 클라이언트 컴포넌트 (ZEN_A4 — 각 50줄 이하)

**SPR-02 Baker 분리 패턴** (`agency/shippers/` 구조) 동일하게 적용:

| 파일 | 역할 | 50줄 제한 |
|:----|:-----|:--------:|
| `rate-overrides/rate-overrides-client.tsx` | 목록 + 비활성화 버튼 조합 | ✅ |
| `rate-overrides/rate-overrides-header.tsx` | 제목 + "신규 등록" 버튼 | ✅ |
| `rate-overrides/rate-overrides-table.tsx` | `<table>` 래퍼 + 헤더 행 | ✅ |
| `rate-overrides/rate-override-table-row.tsx` | 개별 행 (비활성화 버튼 포함) | ✅ |
| `rate-overrides/rate-override-form.tsx` | 등록 폼 (base_rate 드롭다운 + 입력 필드) | ✅ |

> **비활성화 버튼**: `deactivateAgencyRateOverride(id)` 호출 후 `router.refresh()`

---

## [주의 사항]

- 모든 컴포넌트·함수 **50줄 이하 엄수** (ZEN_A4) — 초과 즉시 분리
- `'use client'` 지시어: 클라이언트 컴포넌트에만 선언 (서버 페이지 파일 제외)
- NaviSidebar `TrendingUp` 신규 import 추가 금지 (이미 존재)
- Dave 담당 파일 수정 금지: `rate-overrides.ts`, `types/agency.ts`, `validations/agency.ts`, `index.ts`
- i18n 키: 최상위 레벨 추가 (기존 `agency_management`, `agency_console_badge`와 동일 레벨)
- 브랜치: `feature/ups-spr03-devteam-agency-rate-overrides` (Dave 브랜치와 동일 — pull 후 작업)

---

## [R-17 커밋 순서]

```
1. 코드 커밋: [Baker] feat: TASK-B-007 Agency 요율 오버라이드 UI — /agency/rate-overrides + NaviSidebar
2. task file [작업 결과] 섹션 작성 + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영
4. scratch/IMP_PROGRESS.md IMP-116 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋: [Baker] docs: TASK-B-007 완료 보고 — task file 🔔
```

---

## [DoD]

- [x] `NaviSidebar.tsx` line 146 직후 `agency_rate_overrides_nav` 메뉴 추가 확인
- [x] `messages/ko.json` — 11개 i18n 키 추가 완료
- [x] `messages/en.json` — 11개 i18n 키 추가 완료
- [x] `/agency/rate-overrides/page.tsx` (서버) — 목록 페이지 구현 완료
- [x] `/agency/rate-overrides/new/page.tsx` (서버) — 등록 페이지 구현 완료
- [x] 클라이언트 컴포넌트 7종(header·table·row·client·form·fields·actions) — 각 50줄 이하 (ZEN_A4) ✅
- [x] `deactivateAgencyRateOverride` 호출 + `router.refresh()` 동작 확인
- [x] `upsertAgencyRateOverride` 폼 제출 + `/rate-overrides` locale-prefixed redirect 확인
- [x] `npm run test:regression` — 345/345 PASS (2건 env 누락 기존 이슈)
- [x] Builder 빌드 PASS
- [x] 코드 커밋 해시: `140793e`
- [x] 문서 커밋 해시: `TBD`
- [x] DoD 자가 검증 (`check-R17-DoD`) 실행 완료

---

## [작업 결과]

**구현 완료 ✅** — TASK-B-007 Agency 요율 오버라이드 UI 전량 구현

### 생성/수정 파일

| 파일 | 설명 |
|:-----|:------|
| `NaviSidebar.tsx` | 🔄 `agency_rate_overrides_nav` 메뉴 line 146 직후 추가 (TrendingUp 아이콘, 기존 import 활용) |
| `messages/ko.json` | 🔄 11개 i18n 키 추가 (root 레벨) |
| `messages/en.json` | 🔄 11개 i18n 키 추가 (root 레벨) |
| `rate-overrides/page.tsx` | Server Component — 권한 가드 + `getAgencyRateOverrides()` 호출 |
| `rate-overrides/new/page.tsx` | Server Component — `getUpsBaseRates()` fetch + 폰 전달 |
| `rate-overrides-client.tsx` | Client Component — 목록 상태 관리 |
| `rate-overrides-header.tsx` | Client Component — 제목 + 신규 등록 버튼 |
| `rate-overrides-table.tsx` | Client Component — `<table>` 래퍼 + 빈 상태 처리 |
| `rate-override-table-row.tsx` | Client Component — 개별 행 + 비활성화 버튼 |
| `new/rate-override-form.tsx` | Client Component — 등록 폼 (handleSubmit + 상태 관리) |
| `new/override-form-fields.tsx` | Client Component — base_rate 드롭다운 + 가격/날짜 입력 필드 |
| `new/override-form-actions.tsx` | Client Component — 취소/제출 버튼 |

### 브랜치

`feature/ups-spr03-devteam-agency-rate-overrides`

**코드 커밋 해시**: `140793e`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
