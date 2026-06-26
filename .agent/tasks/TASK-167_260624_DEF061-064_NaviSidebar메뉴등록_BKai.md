# TASK-167 §1 — DEF-061~064: NaviSidebar 미등록 메뉴 4건 추가

> **TASK-ID**: TASK-167 (§1 B_Kai)
> **생성일**: 2026-06-24
> **발령자**: Aiden (Claude) — Issue #115
> **담당 Agent**: B_Kai (Big Pickle)
> **우선순위**: High
> **관련 Issue**: [#115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/115)
> **전제조건**: 없음
> **브랜치**: `feature/teama-task-167-def061-064-sidebar-fix`
> **상태**: 🔔

---

## [업무 개요]

사이드바(NaviSidebar)에 등록되지 않은 4개 메뉴를 추가/연결합니다.

| DEF# | 경로 | 설명 |
|:----:|:----|:----:|
| DEF-061 | `/master-orders` | 마스터 포장 메뉴 — master section children에 추가 |
| DEF-062 | `/admin/permissions` | 권한 관리 페이지 — admin 전용 standalone 추가 |
| DEF-063 | `/master/geo` | 지리정보 관리 페이지 — master section children에 추가 |
| DEF-064 | `/notifications` | 헤더 Bell 아이콘 → `/notifications` 라우팅 연결 (사이드바 항목 불필요) |

---

## [구현 명세]

### NaviSidebar.tsx
- `master` 섹션 children에 `master_geo` + `master_orders` 추가
- `admin_error_logs` 다음에 `permissions` (isAdminOnly) 추가
- ~~`notifications` 사이드바 항목~~ → 삭제 (명세: 사이드바 항목 불필요)

### NotificationBell.tsx (DEF-064)
- Bell 아이콘을 `Link` 컴포넌트로 래핑 → 클릭 시 `/notifications` 페이지로 이동
- 드롭다운 토글을 별도 `ChevronDown` 버튼으로 분리 (기존 드롭다운 UX 유지)
- "전체 알림 보기" 하단 버튼 유지
- 추가 import: `Link` (from `@/i18n/routing`), `ChevronDown` (from `lucide-react`)

### i18n (4개국어)
- `master_orders`: ko="마스터 포장" / en="Master Packing" / ja="マスターパッキング" / zh="主包装"
- `permissions`: ko="권한 관리" / en="Permissions" / ja="権限管理" / zh="权限管理"
- `notifications`: ko="알림" / en="Notifications" / ja="通知" / zh="通知"

### RBAC
- `ALL_RESOURCE_PATHS`에 3개 경로 추가 (`/master/geo`, `/master-orders`, `/notifications`)

---

## [DoD 체크리스트]

- [x] DEF-061: 사이드바에서 `/master-orders` 접근 가능
- [x] DEF-062: 사이드바에서 `/admin/permissions` 접근 가능
- [x] DEF-063: 사이드바에서 `/master/geo` 접근 가능
- [x] DEF-064: 헤더 Bell 아이콘 클릭 → `/notifications` 라우팅 동작 확인
- [x] DEF-064: Bell 드롭다운 기존 UX 유지 (ChevronDown 버튼으로 분리)
- [x] i18n 4개국어 키 추가 완료 (ko/en/zh/ja)
- [x] `npm run tsc` 통과
- [x] R-18 발견 이슈 보고 — `/admin/codes` vs `/master/codes` 중복
- [x] R-17 완료 보고 절차 준수 (PR#117 업데이트)

---

## [작업 결과]

### 1차 제출 (6dc3717) → ❌ 반려

| DEF# | 경로 | 상태 | 비고 |
|:----:|:----|:----:|:----:|
| DEF-061 | `/master-orders` | ✅ | master section children에 추가 |
| DEF-062 | `/admin/permissions` | ✅ | isAdminOnly 항목으로 추가 |
| DEF-063 | `/master/geo` | ✅ | i18n key `master_geo` 기존 존재, children에만 추가 |
| DEF-064 | `/notifications` | ❌ | 사이드바 항목 잘못 추가 → Bell icon 라우팅으로 변경 필요 |

### 2차 수정 (a5e27dd)

| 항목 | 변경 사항 |
|:-----|:---------|
| DEF-064 사이드바 | NaviSidebar.tsx에서 `notifications` 항목 제거 + 미사용 `Bell` import 제거 |
| DEF-064 Bell 라우팅 | NotificationBell.tsx: Bell → `Link[href="/notifications"]`, 드롭다운 토글 `ChevronDown` 분리 |
| DEF-063 경로 정리 | 발견 이슈 R-18 등록 (별도 태스크로 진행) |

### 커밋
| 해시 | 메시지 | 설명 |
|:----|:-------|:-----|
| `6dc3717` | `[B_Kai] fix: DEF-061~064 NaviSidebar 미등록 4건 추가` | 1차 코드 |
| `a5e27dd` | `[B_Kai] fix: DEF-064 반려 수정 — 사이드바 notifications 제거 + Bell Link 라우팅` | 2차 반려 수정 — NotificationBell.tsx Bell→Link, ChevronDown 분리 |

---

## [발견 이슈 — R-18 보고]

### `/admin/codes` vs `/master/codes` 완전 중복

**상태**: ❌ 중복 (byte-for-byte 동일)

| 항목 | `/admin/codes` | `/master/codes` |
|:----|:--------------|:---------------|
| page.tsx | `requireAdmin` + `getCommonCodes` + `CommonCodeClient` | 동일 |
| codes-client.tsx | 동일 | 동일 |
| 제목 | 공통 코드 관리 | 공통 코드 관리 |
| NaviSidebar 연결 | master section href는 `/admin/codes` | (고아 경로, 링크 없음) |

**권장**: Aiden 결정 후 `/master/codes` → `/admin/codes` redirect 또는 `/master/codes` page.tsx 제거

---

## [Aiden 검토]

**1차 판정: ❌ 반려 (2026-06-26)**

| 반려 사유 | 상세 | 2차 수정 |
|:---------|:-----|:---------|
| ❌ DEF-064 구현 방향 불일치 | 사이드바 항목만 추가, Bell icon 라우팅 미연결 | ✅ `a5e27dd` — Bell → `Link` 래핑 + ChevronDown 분리 |
| ❌ DEF-063 경로 정리 누락 | `/admin/codes` vs `/master/codes` 중복 미보고 | ✅ R-18 발견 이슈 보고 (상단) |

**2차 판정: ✅ 승인 (2026-06-26)**

| 항목 | 결과 |
|:----|:----:|
| DEF-061~063: 사이드바 3개 항목 추가 | ✅ |
| DEF-064: NotificationBell.tsx Bell → Link 래핑 | ✅ |
| DEF-064: ChevronDown 드롭다운 분리 | ✅ |
| i18n 4개국어 추가 | ✅ |
| DoD 전항목 [x] | ✅ |
| R-18 발견이슈 보고 (/admin/codes 중복) | ✅ |

Advisory: B_Kai가 D_Kai 브랜치에 최초 커밋 후 cherry-pick으로 이관 — R-17 git sync 규칙 위반 (교차오염 경고, 비차단). 향후 작업 시작 전 반드시 자신의 브랜치로 checkout 후 커밋할 것.

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | B_Kai (Big Pickle) | NaviSidebar 4건 추가 완료 · PR 생성 |
| 2026-06-26 | Aiden (ZEN_CEO) | ❌ 반려 — DEF-064 Bell icon 미연결, DEF-063 경로 정리 누락 |
| 2026-06-26 | B_Kai (Big Pickle) | 2차 수정 — Bell icon 라우팅 추가 (`a5e27dd`), R-18 보고 |
| 2026-06-26 | Aiden (ZEN_CEO) | ✅ 2차 승인 — DEF-064 Bell/Link 구현 확인. Advisory: 브랜치 교차오염 경고 |
