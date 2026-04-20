# 🔐 ZENITH RBAC & Menu Governance (제니스 권한 및 메뉴 관리 가이드)

> **문서번호:** ZEN-GOV-03
> **관할:** CISO (Chief Information Security Officer)
> **대상:** 8대 표준 역할 및 메뉴 접근 제어

## 1. 개요
제니스는 물류 생태계의 다양한 이해관계자를 위해 정교한 **Role-Based Access Control(RBAC)** 체계를 운영한다. 

## 2. 8대 표준 역할 (Hierarchy)
1. **ZENITH_SUPER_ADMIN**: 시스템 전역 통제. 모든 메뉴 바이패스 접근.
2. **ADMIN**: 조직(Tenant) 관리자. 사용자 및 코드 관리 권한.
3. **MANAGER**: 업무 총괄. 상위 승인 및 리포트 조회 권한.
4. **OPERATOR**: 물류 실무자. 오더 처리 및 상태 관리.
5. **CARRIER**: 배송 파트너. 배정된 물량 정보 및 실행 이력 관리.
6. **CORPORATE**: 법인 화주. 대량 오더 및 정산 관리.
7. **INDIVIDUAL**: 개인 화주. 단일 오더 및 트래킹 조회.
8. **USER**: 일반 회원. 기본 정보 및 고객 지원 접근.

## 3. 메뉴 접근 제어 원칙
- **DB 매핑**: `zen_role_permissions` 테이블에서 `Role - Path` 관계를 정의한다.
- **Dynamic Sidebar**: 사용자의 역할에 허용된 메뉴만 화면에 렌더링한다.
- **Common Access**: 대시보드, 마이페이지, 공지사항 등은 모든 역할의 공통 접근권으로 분류한다.

## 4. 구현 가이드
- **Server-side Guard**: 모든 Server Action 및 API는 수행 전 `checkPermission` 유틸을 호출하여 행위 정당성을 검증한다.
- **Bypass**: 최상위 어드민(`ZENITH_SUPER_ADMIN`)은 모든 검증 로직에서 예외(Always Allow) 처리한다.
