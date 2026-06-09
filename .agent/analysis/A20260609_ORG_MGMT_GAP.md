# 조직 정보 관리 기능 — 갭 분석 보고서

> **문서번호**: A20260609_ORG_MGMT_GAP  
> **작성일**: 2026-06-09  
> **작성자**: B_Kai (OpenCode, Noah)  
> **목적**: ADMIN/MANAGER의 조직(CARRIER·CUSTOMS·DELIVERY) 정보 조회·등록·승인 기능缺失에 대한 요구사항 정의 및 구현 방안 제시  
> **상태**: 🔔 (Aiden 검토 요청)

---

## 1. 현황 분석

### 1.1 현재 존재하는 화면

| 화면 | 경로 | 대상 조직 | 기능 |
|:----|:----|:----------|:-----|
| 운송 서비스 요율 관리 | `/admin/rates/` | CARRIER | 요율 CRUD (조직 정보 조회/등록 불가) |
| 운송 원가 관리 | `/admin/transport-costs/` | CARRIER | 원가 CRUD (조직 정보 조회/등록 불가) |
| 통관 서비스 요율 관리 | `/admin/customs-rates/` | CUSTOMS | 요율 CRUD (조직 정보 조회/등록 불가) |
| 배송 서비스 요율 관리 | `/admin/delivery-rates/` | DELIVERY | 요율 CRUD (조직 정보 조회/등록 불가) |
| 법인 가입 승인 센터 | `/admin/organizations/` | 전체 (PENDING) | 승인/반려/보완 요청만 가능 |

### 1.2 존재하지 않는 기능

- ✅ 조직 목록 조회/검색/필터 (type, status, date 등)
- ✅ 신규 조직 직접 등록 (Admin이 직접 CARRIER/CUSTOMS/DELIVERY 조직 생성)
- ✅ 조직 상세 정보 조회 및 편집
- ✅ 조직 상태 관리 (ACTIVE/SUSPENDED/PENDING 전환)

### 1.3 회원가입 프로세스 (공개)

| 조직 유형 | 회원가입 지원 | 비고 |
|:---------|:-------------|:-----|
| PLATFORM | ✅ | 운영자 전용 |
| SHIPPER | ✅ | 화주 (일반) |
| CARRIER | ✅ | 운송사 |
| **CUSTOMS** | **❌** | **통관사 — 가입 불가** |
| **DELIVERY** | **❌** | **배송사 — 가입 불가** |
| CORPORATE | ❌ | 법인 (개인→법인 전환) |
| INDIVIDUAL | ❌ | 개인 (별도 가입) |

---

## 2. 요구사항

### 2.1 조직 조회 화면 (Admin 전용)

**목적**: ADMIN/MANAGER가 모든 조직(CARRIER, CUSTOMS, DELIVERY, SHIPPER)을 검색·조회·관리

**필수 기능**:
1. 조직 목록 조회 (테이블 뷰)
   - 컬럼: 조직명, 유형(CARRIER/CUSTOMS/DELIVERY/SHIPPER), 상태(ACTIVE/PENDING/SUSPENDED), 사업자번호, 대표자, 생성일
   - 필터: 유형별, 상태별, 검색어(조직명/사업자번호)
   - 정렬: 생성일, 조직명
2. 조직 상세 정보
   - 기본 정보: 조직명, 유형, 사업자번호, 대표자, 연락처
   - 상태 정보: 현재 상태, 승인일, 비고
   - 연동 정보: 연결된 사용자 목록, 요율 카드 수
3. 조직 등록 모달/페이지
   - Admin이 직접 신규 조직 생성
   - 필드: 조직명, 유형(CARRIER/CUSTOMS/DELIVERY/SHIPPER), 사업자번호, 대표자명, 이메일, 전화번호
   - 생성 시 조직 상태 `ACTIVE` (Admin 직접 등록이므로 승인 불필요)
   - 조직 생성 후 해당 조직의 관리자 계정 생성 옵션

### 2.2 조직 등록 기능

**Server Actions**:
- `createOrganization(data)` — 신규 조직 생성 + 선택적 관리자 계정 생성
- `updateOrganization(id, data)` — 조직 정보 수정
- `updateOrganizationStatus(id, status)` — 조직 상태 변경
- `getOrganizationsAdmin(filter)` — Admin용 조직 목록 조회 (모든 유형·상태)

### 2.3 기존 승인 기능과의 통합

- `/admin/organizations/` (현재 법인 가입 승인 센터) 유지
- PENDING 조직 자동 표시 (기존 로직 유지)
- 신규 조직 등록 페이지와 승인 페이지 간 네비게이션 연결

---

## 3. DB 스키마 참조

### zen_organizations (현재)

| 컬럼 | 타입 | 설명 |
|:----|:----|:------|
| id | UUID PK | |
| name | TEXT NOT NULL | 조직명 |
| type | TEXT CHECK | PLATFORM/CARRIER/SHIPPER/CORPORATE/INDIVIDUAL/CUSTOMS/DELIVERY |
| biz_no | TEXT | 사업자번호 |
| corporate_id | TEXT | 법인 ID (6자리) |
| rep_name | TEXT | 대표자명 |
| status | TEXT DEFAULT 'PENDING' | ACTIVE/PENDING/SUSPENDED/SUPPLEMENT_REQUIRED |
| approval_date | TIMESTAMPTZ | 승인일 |
| approval_comment | TEXT | 승인/반려 사유 |
| metadata | JSONB | 확장 정보 |
| created_at | TIMESTAMPTZ | 생성일 |

### zen_profiles (관련)

| 컬럼 | 타입 | 설명 |
|:----|:----|:------|
| id | UUID PK (→ auth.users) | |
| org_id | UUID FK | 소속 조직 |
| email | TEXT | |
| full_name | TEXT | |
| role | TEXT | ADMIN/MANAGER/OPERATOR/CARRIER/CUSTOMS_BROKER/DELIVERY_AGENT/... |
| status | TEXT | ACTIVE/SUSPENDED/PENDING |
| phone_number | TEXT | |

---

## 4. 구현 방안 (A·B안)

### A안 — 신규 전용 페이지 (권장)

**경로**: `/admin/organizations/manage/`  
**구성**:
- Server Component: 데이터 페칭 (Supabase RPC or Server Action)
- Client Component: 목록 테이블 + 필터 + 등록 모달
- Server Actions: createOrganization, updateOrganization, updateOrganizationStatus

**장점**: 기존 승인 센터(`/admin/organizations/`)와 역할 분리 명확  
**단점**: 신규 페이지 생성 필요

### B안 — 기존 승인 센터 확장

**경로**: `/admin/organizations/` (기존)  
**구성**:
- PENDING 탭 (기존 승인 화면 유지)
- ALL 탭 (전체 조직 검색/필터 추가)
- "+ 신규 등록" 버튼 추가

**장점**: 페이지 통합 유지  
**단점**: 기존 컴포넌트 복잡도 증가, PENDING 특화 UI와 충돌 가능성

---

## 5. 영향 범위 분석

| 영역 | 영향 | 상세 |
|:----|:-----|:-----|
| AdminRepository | 확장 필요 | `createOrganization()`, `findAllOrganizations(filter)` 메서드 추가 |
| Server Actions | 신규 | `src/app/actions/admin/organization.ts`에 create/update actions 추가 |
| UI 컴포넌트 | 신규 | OrganizationManageClient, OrganizationFormModal |
| i18n | 확장 필요 | 조직 관리 관련 다국어 키 추가 (ko/en/zh/ja) |
| RBAC | 영향 없음 | ADMIN/MANAGER 기반 (기존 정책 그대로 사용) |
| 기존 승인 화면 | 영향 없음 | B안 선택 시 확장, A안 선택 시 유지 |

---

## 6. 권장 우선순위 및 일정

| 단계 | 내용 | 예상 기간 | 우선순위 |
|:----|:-----|:---------|:---------|
| 1 | AdminRepository + Server Actions 구현 | 1일 | P1 |
| 2 | 조직 목록 조회 UI (필터/검색) | 1일 | P1 |
| 3 | 조직 등록 모달/페이지 | 1일 | P2 |
| 4 | 기존 승인 센터와 통합 | 0.5일 | P2 |
| 5 | i18n + 테스트 + 문서화 | 0.5일 | P3 |

---

## 7. 결론

현재 CUSTOMS/DELIVERY 조직은 **공개 회원가입도 불가능**하고, **Admin이 직접 등록할 화면도 없어** 사실상 시스템에 편입할 방법이 전무한 상태입니다. Phase 6에서 요율 관리 화면은 구축되었으나, **조직 자체를 시스템에 등록하는 기본 진입점이 누락**되었습니다.

ADMIN/MANAGER 전용 조직 관리 화면은 P1 수준의 필수 기능으로, 구현 규모도 중간 정도(Server Actions 3~4개 + UI 컴포넌트 2~3개)이므로 즉시 착수 가능합니다.
