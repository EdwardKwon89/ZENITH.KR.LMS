# TASK-B-120: Issue #455 — get_next_order_sequence RBAC에 AGENCY/AGENCY_SHIPPER 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#455](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/455) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-14 |
| **상태** | 🔄 진행 중 |

## 작업 내용

### 원인
`get_next_order_sequence()` 함수의 역할 허용 목록에 `AGENCY`, `AGENCY_SHIPPER`가 누락되어 있어, Agency 계정은 어떤 transport_mode로도 오더 등록이 불가능.

### 변경 파일
- `supabase/migrations/20260714000000_iss455_sequence_rbac_agency.sql`
  - `CREATE OR REPLACE FUNCTION get_next_order_sequence` — `NOT IN` 목록에 `'AGENCY', 'AGENCY_SHIPPER'` 추가

### 추가 발견 (선택 범위 외)
- `get_my_role() NOT IN` 패턴 사용 함수 7건 추가 확인
  - 3건은 관리자 전용 org 관리 함수 (AGENCY 접근 불필요)
  - 4건은 관리자 전용 시스템 함수 (AGENCY 접근 불필요)
  - `get_next_order_sequence`만 Agency 접근 필요 → 이 이슈에서 수정 대상

## DoD

- [x] 빌드 PASS
- [x] 회귀 테스트 통과 (485/485)
- [x] CI PASS 확인
