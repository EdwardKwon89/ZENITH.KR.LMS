# [공식 감사 보고서] ZENITH_LMS 요구사항 준수 감사

> **문서번호:** AUD-2026-0508-001
> **작성자:** Aiden (Claude)
> **감사 일시:** 2026-05-08
> **감사 방법:** 병렬 3종 에이전트 탐색 (① RBAC·Auth Guard / ② 메뉴·페이지 정합 / ③ 요구사항 격차)
> **검토 배경:** 로컬 환경 수동 테스트 중 반복적 기능 결함 발견 — 구조적 감사 필요성 제기
> **문서 상태:** 🔴 감사 완료 — 시정 Sprint S1~S3 계획 수립 완료

---

## 1. 감사 요약 (Executive Summary)

ZENITH_LMS 프로젝트는 WBS 상 전 Phase 100% 완료 판정을 받았으나, 실제 수동 테스트에서 다수의 구조적 결함과 요구사항 미충족 항목이 반복 발견되었다. 병렬 3종 감사 에이전트를 통한 전수 점검 결과, **전체 기능 완성도는 약 70%**로 추정되며 회원 관리(인증·프로필·법인) 및 RBAC 권한 체계에서 심각한 격차가 확인되었다.

| 감사 영역 | 완성도 | 심각도 |
|:---|:---:|:---:|
| 인증 시스템 (Auth) | 66% | 🔴 HIGH |
| 개인회원 관리 | 60% | 🔴 HIGH |
| 법인회원 관리 | **17%** | 🔴 HIGH |
| RBAC·권한 체계 | 구조 결함 | 🔴 CRITICAL |
| 시스템 관리 | 57% | 🟡 MEDIUM |
| 사이드바 메뉴 정합성 | 불일치 | 🟡 MEDIUM |
| 오더·창고·회계 | 100% | ✅ PASS |

**전체 평균 완성도: 약 70%**

---

## 2. 감사 영역별 상세 결과

### 2-1. [CRITICAL] RBAC 권한 체계 구조 결함

현재 시스템은 권한 체크를 **3가지 다른 방식**으로 구현하고 있으며, 이들이 비동기화 상태로 공존한다.

| 방식 | 위치 | 문제 |
|:---|:---|:---|
| 정적 배열 | `src/lib/auth/rbac.ts` | DB 비연동, 런타임 변경 불가 |
| 경로 화이트리스트 | `src/middleware.ts` | rbac.ts와 경로 목록 비동기화 (`/inventory` 등) |
| 하드코딩 문자열 비교 | 각 `page.tsx` 6개 파일 | `role === 'ADMIN'` 직접 비교 — 오타 취약, 유지보수 고비용 |

#### 하드코딩 역할 비교 발견 파일 (6개)

| 파일 | 하드코딩 패턴 |
|:---|:---|
| `(dashboard)/settlement/page.tsx` | `profile?.role === USER_ROLES.ADMIN` |
| `(dashboard)/mypage/grade/page.tsx` | `profile?.role !== 'INDIVIDUAL'` |
| `(dashboard)/support/faq/page.tsx` | `profile?.role === 'ADMIN'` |
| `(dashboard)/support/notices/page.tsx` | `profile?.role === 'ADMIN'` |
| `(dashboard)/support/qna/page.tsx` | `profile?.role === 'ADMIN'` |
| `(dashboard)/inventory/page.tsx` | 3개 역할 OR 비교 |

#### DB 상태

`zen_role_permissions` 테이블은 마이그레이션 파일에 정의되어 있으나 **데이터 0건, 코드 참조 0건** — 완전 미활용 상태.

```sql
CREATE TABLE IF NOT EXISTS zen_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code TEXT NOT NULL,
    menu_id TEXT NOT NULL,
    path TEXT NOT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_code, path)
);
-- ↑ 테이블 구조만 존재. 실제 데이터 및 코드 참조 없음.
```

---

### 2-2. [HIGH] 인증 기능 누락 (SCR-002, SCR-003)

| SCR | 기능명 | 요구 파일 | 현재 상태 |
|:---:|:---|:---|:---:|
| SCR-002 | ID 찾기 | `/[locale]/(auth)/find-id/page.tsx` | ❌ 미구현 |
| SCR-003 | 비밀번호 재설정 | `/[locale]/(auth)/reset-password/page.tsx` | ❌ 미구현 |
| SCR-010 | 내 정보 관리 | `/mypage/profile` | ⚠️ 부분 (지갑만) |

누락 서버 액션: `findUserId()`, `sendPasswordReset()`, `updateProfile()`, `changePassword()`

---

### 2-3. [HIGH] 회원 관리 기능 격차

#### 개인회원 (Fun_Detail_02 — 60% 구현)

| 기능 | 구현 상태 |
|:---|:---:|
| 2.1.1 개인회원 가입 | ✅ |
| 2.1.2 회원정보 수정 | ❌ |
| 2.1.3 등급 조회 | ✅ |
| 2.1.4 잔액 충전 | ✅ |
| 2.1.5 잔액 환불 | ✅ |
| 2.1.6 청구내역 조회 | ✅ |
| 2.1.7 회원탈퇴 (Soft Delete) | ❌ |

#### 법인회원 (Fun_Detail_02 — 17% 구현)

| 기능 | 구현 상태 |
|:---|:---:|
| 2.2.1 법인회원 가입 신청 | ✅ |
| 2.2.2 법인정보 수정 | ❌ |
| 2.2.3 법인관리자 정보수정 | ❌ |
| 2.2.4 부서 관리 CRUD | ❌ |
| 2.2.5 부서관리자 정보수정 | ❌ |
| 2.2.6 법인 탈퇴 | ❌ |

---

### 2-4. [MEDIUM] 사이드바 메뉴 구조 오류

| 오류 유형 | 위치 | 심각도 |
|:---|:---|:---:|
| `/admin/rates` 메뉴 항목 3중 중복 | `NaviSidebar.tsx` 약 L69, L83, L90 | 🟡 |
| `/order/house`, `/order/import` 동일 경로(`/orders`) 연결 | `NaviSidebar.tsx` L69-78 | 🟡 |
| `/support/page.tsx` 미존재 (부모 클릭 시 404) | 파일 시스템 | 🟢 |
| `/admin/geo` 경로 — 실제 파일은 `/master/geo` | `NaviSidebar.tsx` 및 파일 경로 불일치 | 🟡 |

---

### 2-5. [MEDIUM] 시스템 관리 누락 (Fun_Detail_09)

| 기능 | 구현 상태 |
|:---|:---:|
| 9.1 메뉴 관리 CRUD | ❌ |
| 9.3 권한 관리 역할-메뉴 매핑 UI | ⚠️ 부분 구현 |
| 9.7 데이터 백업 | ❌ |

---

## 3. 시정 Sprint 계획

### Sprint S1 — 빠른 수정 (Fast Fix)

**목표:** 사용자 직접 영향 결함 즉시 해소
**예상 공수:** 2~3 MD | **담당:** Riley (Gemini) | **착수 가능:** 즉시 (FEAT-001 통합)

| 항목 | IMP | 내용 |
|:---|:---:|:---|
| NaviSidebar 메뉴 오류 수정 | IMP-009 | rates 중복 제거, order 경로 처리, support parent 수정 |
| ID찾기 페이지 | IMP-005 | `/auth/find-id` + `findUserId()` 액션 |
| 비밀번호 재설정 페이지 | IMP-006 | `/auth/reset-password` + `sendPasswordReset()` 액션 |
| 사용자 프로필 페이지 | IMP-004 | `/mypage/profile` + `updateProfile()` |
| 비밀번호 변경 페이지 | IMP-004 | `/mypage/security` + `changePassword()` |

### Sprint S2 — RBAC 구조 정비

**목표:** 권한 체계 단일화 + `zen_role_permissions` DB 활성화
**예상 공수:** 3~5 MD | **담당:** Riley (Gemini) | **블로커:** S1 완료 후 착수

| 항목 | IMP | 내용 |
|:---|:---:|:---|
| 하드코딩 역할 비교 제거 | IMP-010 | 6개 파일 `checkPermission()` 패턴 통일 |
| middleware↔rbac 경로 동기화 | IMP-010 | `/inventory` 등 불일치 경로 정렬 |
| `zen_role_permissions` 활성화 | IMP-001 | 초기 데이터 삽입 + `checkPermission()` DB 쿼리 전환 |
| 권한 관리 UI 완성 | IMP-001 | `/admin/permissions` 역할-메뉴 CRUD 구현 |

### Sprint S3 — 회원 관리 확장

**목표:** 법인회원 관리 기능 완비
**예상 공수:** 2~4 MD | **담당:** Riley (Gemini) | **블로커:** S2 완료 후 착수

| 항목 | IMP | 내용 |
|:---|:---:|:---|
| 법인회원 정보 수정 | IMP-008 | 대표자·주소·연락처·이메일 수정 페이지 |
| 부서 관리 CRUD | IMP-008 | 부서 추가·수정·삭제 페이지 |
| 개인·법인 탈퇴 기능 | IMP-007/008 | Soft Delete 액션 + 확인 UI |

---

## 4. 근본 원인 분석 (Root Cause)

수동 테스트에서 결함이 반복 발견되는 구조적 원인은 다음 3가지이다.

| # | 원인 | 설명 |
|:---:|:---|:---|
| 1 | **요구사항 기준 테스트 부재** | E2E 테스트가 작성된 코드를 검증하는 구조 — An_04·Fun_Detail_* 항목과 1:1 매핑 없음 |
| 2 | **역할별 통합 테스트 부재** | ADMIN 외 CARRIER·CORPORATE·INDIVIDUAL 역할로 전체 플로우를 순회하는 케이스 미존재 |
| 3 | **완료 기준(DoD)의 구현 편향** | "빌드 통과 + 회귀 PASS"가 완료 기준 — "요구사항 명세 기능 동작 확인" 포함 없음 |

---

## 5. 권고 사항

1. **SCR-NNN 추적 매트릭스 구축**: 향후 Sprint DoD에 해당 SCR 항목 구현 여부 체크 포함
2. **역할별 E2E 테스트 추가**: S1~S3 완료 후 CARRIER·CORPORATE·INDIVIDUAL 역할로 핵심 플로우 케이스 추가
3. **S3 완료 후 재감사 수행**: 본 보고서 이슈 추적 매트릭스 전 항목 재점검

---

## 6. 이슈 추적 매트릭스

| IMP-ID | 내용 | 배정 Sprint | 우선순위 |
|:---:|:---|:---:|:---:|
| IMP-001 | RBAC 동적 권한 관리 DB 활성화·UI | S2 | High |
| IMP-004 | 사용자 프로필·보안 페이지 | S1 | High |
| IMP-005 | ID찾기 화면 미구현 | S1 | High |
| IMP-006 | 비밀번호 재설정 화면 미구현 | S1 | High |
| IMP-007 | 개인회원 정보수정·탈퇴 액션 누락 | S1(수정) / S3(탈퇴) | High |
| IMP-008 | 법인회원 관리 전면 미구현 | S3 | High |
| IMP-009 | NaviSidebar 메뉴 구조 오류 | S1 | Medium |
| IMP-010 | 다중 RBAC 가드 혼재·하드코딩 | S2 | High |

---

*본 보고서는 2026-05-08 병렬 3종 감사 에이전트 결과를 Aiden이 통합 작성하였습니다.*
*시정 조치 진행 현황은 `.agent/TASK_BOARD.md`에서 추적합니다.*
