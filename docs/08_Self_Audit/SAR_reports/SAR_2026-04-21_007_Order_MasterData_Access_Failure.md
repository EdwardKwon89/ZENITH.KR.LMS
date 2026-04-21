# SAR-2026-04-21-007: 오더 등록 마스터 데이터 접근 장애 및 UI 결함 보고서

## 1. 개요 (Problem Summary)
- **발견 날짜**: 2026-04-21
- **발견자**: Antigravity (AI Agent)
- **대상 기능**: 하우스 오더 등록 (Order Registration)
- **결함 내용**: 
    1. 화주(Shipper) 및 항구(Port) 드롭다운 데이터가 노출되지 않아 선택 불가.
    2. 아이템 목록 입력 필드의 헤더 및 단위(Unit) 부재로 사용자 혼란 가중.

## 2. 근본 원인 (Root Cause Analysis)
### 🔗 데이터 소스 및 타입 불일치
- `orderRegistrationSchema`(Zod)는 `shipper_id`, `port_id`로 UUID 형식을 강제했으나, 기존 서버 액션은 UUID 컬럼이 없는 레거시 `ports` 테이블을 참조하여 매칭 실패.

### 🛡️ 보안 정책(RLS) 충돌
- 신규 마스터 테이블(`zen_ports`, `zen_organizations`)에 RLS가 활성화되어 있었으나, `SELECT` 권한에 대한 Policy가 수립되지 않아 기본적으로 모든 데이터 열람이 차단됨 (Deny All).

### 🎨 디자인 품질 관리 누락
- 아이템 목록의 복잡한 입력 그리드에서 컬럼 헤더와 단위 표시가 누락되어 물류 전문 시스템으로서의 시인성 미흡.

## 3. 조치 내용 (Resolution)
- **인프라 교체**: `master.ts` 액션의 소스를 `zen_ports`로 전환하여 UUID 규격 통일.
- **보안 개방**: `authenticated` 역할에 대해 두 테이블의 `SELECT` 정책(Policy)을 추가하여 데이터 공급로 확보.
- **UX 고도화**: 아이템 목록 상단에 'Table Header'를 도입하고, 필드 내 `EA`, `$`, `kg`, `CBM` 단위를 명시함.

## 4. 재발 방지 대책 (Prevention)
- **마스터 데이터 생성 시 필수 gate**: 신규 테이블 생성 시 반드시 `authenticated` 사용자의 `SELECT` 정책 수립 여부를 자가 점검함.
- **스키마-데이터 크로스 체크**: Zod 발리데이션 스키마의 타입(UUID 등)과 조회 대상 테이블의 PK 타입을 작업 전 반드시 대조함.
- **그리드 UI 표준화**: 3개 이상의 입력 필드가 결합된 그리드 형태의 UI는 반드시 고정 헤더와 명확한 단위를 포함하도록 컴포넌트 규격을 정형화함.
