# Future Requirements & Improvements - ZENITH LMS

이 문서는 초기 개발 단계 이후의 기능 개선 및 확장 계획을 기록합니다. (ZEN_A4 규정에 따라 관리)

## 1. Dynamic RBAC (Dynamic Role-Based Access Control)
현재의 정적 권한 체계를 넘어 사용자가 직접 역할을 등록하고 기능별 권한을 설정할 수 있는 기능을 추가합니다.

- **기능 개요**:
    - 역할(Role) 추가/수정/삭제 관리 UI
    - 각 역할별 기능(Menu/Action) 접근 권한 매트릭스 설정
    - 필드 단위(Field-level) 접근 제어 (Future phase)
- **설계 고려 사항**:
    - `permissions` 테이블과 `role_permissions` 매핑 테이블 구조 도입
    - 캐싱 전략: 역할별 권한 정보를 Redis 또는 세션에 캐싱하여 조회 성능 최적화

## 2. Document Verification System (Advanced Corporate Approval)
법인 사용자의 승인 접수 시 제출한 서류를 OCR 등으로 자동 검토하거나 관리자가 통합 뷰어로 검토할 수 있는 워크플로우를 강화합니다.

- **기능 개요**:
    - 파일 업로드 및 스토리지 (Supabase Storage) 연동
    - 승인 워크플로우 상태 트래킹 고도화
