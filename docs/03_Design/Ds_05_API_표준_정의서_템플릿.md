# API 표준 정의서 템플릿

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Ds-05
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-16
> **버전:** v1.0

모든 데이터 통신은 본 표준 규격을 준수하며, 예외 상황 발생 시 기술 결정 사항(Decisions)에 기록 후 적용합니다.

---

## 1. 기본 프로토콜 (Base Protocol)

### 1.1 Endpoint 구조
- **Base URL**: `https://api.zenith-lms.com/api/v1`
- **Resource Naming**: 케이스별 복수형 명사 사용 (예: `/users`, `/orders`)
- **Method**: RESTful 원칙 준수 (GET, POST, PUT, DELETE, PATCH)

### 1.2 인증 및 보안 (Auth & Security)
- **방식**: JWT (JSON Web Token) 기반 Stateless 인증
- **Header**: `Authorization: Bearer {JWT_TOKEN}`
- **Content-Type**: `application/json; charset=utf-8`

---

## 2. 응답 표준 규격 (Response Standard)

### 2.1 성공 응답 (Success)
HTTP Status `200 OK` 또는 `201 Created`와 함께 아래 구조 반환:

```json
{
  "status": "success",
  "data": {
    "items": [], // 목록일 경우
    "total_count": 0 // 페이징 시
  },
  "timestamp": "2026-04-16T15:00:00.000Z"
}
```

### 2.2 에러 응답 (Error)
HTTP Status `4xx` 또는 `5xx`와 함께 아래 구조 반환:

```json
{
  "status": "error",
  "message": "사용자 메시지 (i18n 대응)",
  "error_code": "ERR_AUTH_001",
  "details": {
    "field": "email",
    "reason": "Invalid format"
  },
  "timestamp": "2026-04-16T15:00:00.000Z"
}
```

---

## 3. 공통 쿼리 규격 (Common Query Parameters)

### 3.1 페이징 및 정렬 (Paging & Sorting)
| Parameter | Type | Default | Description |
|:---:|:---:|:---:|:---|
| `page` | Integer | 1 | 현재 페이지 번호 |
| `limit` | Integer | 20 | 페이지당 출력 개수 |
| `sort_by` | String | `created_at` | 정렬 기준 필드 |
| `order` | String | `desc` | 정렬 순서 (`asc`, `desc`) |

---

## 4. 개별 API 명세 양식 (Sample)

### 4.1 [API 명칭]
- **Endpoint**: `[METHOD] /path/to/resource`
- **Description**: API의 기능 설명
- **Request Parameters (Body)**:
  - `field_name` (Type, Required): 설명
- **Response Data**:
  - `field_name` (Type): 설명

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-16 | Antigravity | 초기 API 표준 정의서 템플릿 수립 |
