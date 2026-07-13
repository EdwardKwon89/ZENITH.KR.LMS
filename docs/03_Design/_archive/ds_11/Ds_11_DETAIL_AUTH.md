# Ds-11 API 상세 명세 — AUTH (공통 응답 + 인증/사용자)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 1. 공통 응답 및 에러 코드 (Standard Response)

### 1.1 기본 응답 구조 (Server Action Result)

| 필드명 | 타입 | 설명 |
|:---|:---:|:---|
| `success` | Boolean | 요청 성공 여부 |
| `data` | Object/Array | 반환 데이터 본체 (성공 시) |
| `error` | String | 에러 메시지 (실패 시) |

### 1.2 공통 에러 코드

| 코드 | 메시지 | 설명 |
|:---|:---|:---|
| `ERR_AUTH_001` | Unauthorized | 인증되지 않은 사용자 접근 |
| `ERR_PERM_001` | Forbidden | 해당 작업에 대한 권한 부족 |
| `ERR_VAL_001` | Validation Failed | 입력 데이터 검증 실패 (Zod Schema 위반) |
| `ERR_SYS_001` | Internal Server Error | 서버 내부 로직 오류 |

---

## 2. 인증 및 사용자 (Auth & User)

### 2.1 login (Action)

- **설명**: 사용자 이메일/비밀번호 기반 로그인
- **권한**: Public
- **파라미터 (FormData)**:
  - `email`: (string) 사용자 이메일
  - `password`: (string) 비밀번호
  - `locale`: (string, optional) 선호 언어 (ko, en, zh, ja)
- **응답**: `Promise<void>` (성공 시 대시보드 리다이렉트)

### 2.2 signup (Action)

- **설명**: 회원가입 및 신규 조직 생성 또는 기존 조직 가입 신청
- **권한**: Public
- **파라미터 (FormData)**:
  - `email`: (string) 이메일
  - `password`: (string) 비밀번호
  - `full_name`: (string) 사용자 성명
  - `org_id`: (uuid, optional) 기존 조직 ID (가입 신청 시)
  - `is_new_org`: (boolean) 신규 조직 생성 여부
  - `org_name`: (string, optional) 신규 조직명
  - `business_number`: (string, optional) 사업자 등록 번호
  - `org_type`: (string) 조직 유형 (SHIPPER, CARRIER, PARTNER, INDIVIDUAL)
  - `doc_file`: (File, optional) 사업자 등록증 등 증빙 서류
- **응답**: `{ success: true }` 또는 `{ error: string }`

### 2.3 getCurrentUserAffiliation (Action)

- **설명**: 현재 로그인한 사용자의 소속 조직 및 권한 정보 조회
- **권한**: User
- **응답**:
  ```json
  {
    "userId": "uuid",
    "userName": "string",
    "userEmail": "string",
    "role": "ADMIN|MEMBER|USER",
    "orgId": "uuid",
    "orgName": "string",
    "orgAddress": "string",
    "orgBizNo": "string",
    "isIndividual": "boolean",
    "dummyIndividualId": "string (SYSTEM_INDIVIDUAL_SHIPPER_ID)"
  }
  ```

### 2.4 approveOrganization / rejectOrganization (Action)

- **설명**: 대기 중인 조직 가입 신청 승인 또는 거절
- **권한**: Admin
- **파라미터**:
  - `orgId`: (uuid) 대상 조직 ID
  - `reason`: (string, reject 전용) 거절 사유
- **응답**: `{ success: boolean }`

### 2.5 requestOrganizationSupplement (Action)

- **설명**: 조직 가입 신청 시 서류 보완 요청
- **권한**: Admin
- **파라미터**:
  - `orgId`: (uuid) 대상 조직 ID
  - `reason`: (string) 보완 요청 상세 사유
- **응답**: `{ success: boolean }`

### 2.6 updateProfile (Action)

- **설명**: 현재 로그인한 사용자의 프로필 정보(성명 등) 수정
- **권한**: User (본인 프로필만)
- **파라미터 (FormData)**:
  - `full_name`: (string) 변경할 성명
- **응답**: `{ success: boolean, data?: object, error?: string }`

### 2.7 changePassword (Action)

- **설명**: 현재 로그인한 사용자의 비밀번호 변경 (Supabase Auth 연동)
- **권한**: User
- **파라미터 (FormData)**:
  - `current_password`: (string) 현재 비밀번호 (검증용)
  - `new_password`: (string) 새 비밀번호
- **응답**: `{ success: boolean, error?: string }`

### 2.8 updateRolePermissions (Action)

- **설명**: 특정 역할(Role)에 대한 메뉴/경로별 접근 권한 설정 변경
- **권한**: Admin
- **파라미터**:
  - `role_code`: (string) 대상 역할 코드
  - `permissions`: (array) `{ path: string, is_allowed: boolean }` 목록
- **응답**: `{ success: boolean, error?: string }`
