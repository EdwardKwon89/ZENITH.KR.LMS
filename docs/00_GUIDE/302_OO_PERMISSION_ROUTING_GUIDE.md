---
tags: ["procedure"]
---

# ZEN-GUIDE-302: 객체 지향적 권한 및 라우팅 설계 가이드

> **문서번호**: ZEN-GUIDE-302
> **버전**: v1.0
> **작성자**: Antigravity (CTO Agent)
> **대상**: SNTL 물류 플랫폼 개발팀 (Edward CEO 승인)

## 1. 개요 (Overview)
본 문서는 ZENITH LMS가 지향하는 **"코드 수정 없는 확장"**을 위한 객체 지향적 권한 체계 설계 원칙을 정의한다. 조직의 도메인(Type)과 세부 권한(Role)을 분리하여 시스템의 유연성을 극대화하는 것을 목적으로 한다.

---

## 2. 핵심 설계 원칙: Orthogonal Separation
우리는 라우팅(어디로 가는가)과 기능 권한(무엇을 하는가)을 독립적인 축으로 설계한다.

### A. 조직 타입 (Organization Type) = URL Root (Domain)
- 사용자가 속한 조직의 물리적 도메인을 정의한다.
- **라우팅 기준**: `ORG_ROUTE_MAP` 설정에 따라 최상위 경로가 결정된다.
- 예: `PLATFORM` → `/admin/*`, `SHIPPER` → `/dashboard/*`

### B. 역할 (Role) = Feature Access (Action)
- 특정 URL 내에서 사용자가 수행할 수 있는 구체적인 행위를 정의한다.
- **제어 방식**: UI 레벨의 컴포넌트 가드(Guard) 및 API 레벨의 RLS 정책.
- 예: 동일한 `/dashboard` 내에서 `ADMIN`은 '직원 관리' 버튼이 보이고, `USER`는 보이지 않는다.

---

## 3. 설정 기반 아키텍처 (Configuration Map)

### 3.1 Route Config (진입로 설정)
조직 타입이 추가될 경우 아래 Map에 경로만 추가한다.

```typescript
const ORG_ROUTE_MAP: Record<OrgType, string> = {
  PLATFORM: '/admin',
  SHIPPER: '/dashboard',
  CARRIER: '/terminal',
  CUSTOMS: '/customs', // 확장 예시
};
```

### 3.2 Permission Map (기능 권한 설정)
역할별 세부 기능 권한을 객체 형태로 관리한다.

```typescript
const PERMISSION_MAP = {
  SHIPPER_ADMIN: ['ORDER_CREATE', 'BILLING_VIEW', 'MEMBER_MANAGE'],
  SHIPPER_USER:  ['ORDER_CREATE', 'MY_TRACKING'],
} as const;
```

---

## 4. 구현 가이드 (Implementation Guide)

1.  **Context Hooks**: `useAuthContext`를 통해 현재 사용자의 `orgType`과 `role`을 전역적으로 접근 가능하게 한다.
2.  **Route Guard Middleware**: 미들웨어는 `ORG_ROUTE_MAP`을 참조하여 사용자가 권한 없는 도메인으로의 침입 시도를 차단한다.
3.  **RBAC Components**: 특정 기능을 감싸는 `<PermissionGate>` 컴포넌트를 사용하여 UI 노출 여부를 선언적으로 관리한다.
    ```tsx
    <PermissionGate action="MEMBER_MANAGE">
      <MemberManagementPanel />
    </PermissionGate>
    ```

---

## 5. 관리 및 확장 가이드
- **Role 추가 시**: `PERMISSION_MAP`에 새로운 키와 기능 리스트를 정의한다. (기존 라우팅 로직 수정 불필요)
- **비즈니스 주체 추가 시**: `ORG_ROUTE_MAP`에 새로운 도메인 경로를 할당한다. (기존 로그인 로직 수정 불필요)

> [!TIP]
> **"Config over Code"** - 모든 권한과 경로는 하드코딩이 아닌 객체 설정을 통해 통제되어야 하며, 이는 향후 관리자 설정 UI에서 동적으로 DB화하여 관리할 수 있는 토대가 된다.

---

## 6. 승인 날인
- **설계**: Antigravity (CTO)
- **승인**: Edward (CEO)
- **날짜**: 2026-04-18
