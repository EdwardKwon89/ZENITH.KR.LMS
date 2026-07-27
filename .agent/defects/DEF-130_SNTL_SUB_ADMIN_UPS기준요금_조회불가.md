# DEF-130: SNTL(SUB_ADMIN) 역할이 UPS 기준요금(zen_ups_base_rates)을 전혀 조회할 수 없음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | Aiden (고객 시연 검증 중 발견, Edward 지시로 DEF 등록) |
| **긴급도** | High |
| **우선순위** | P1 |

## 현상

`sntl@zenith.kr`(SUB_ADMIN, SNTL Master Agency)로 로그인 → `/admin/ups-rates`(UPS 요율 관리) > "기준요금" 탭 진입 시, 실제로는 해당 상품의 요율이 DB에 존재함에도(예: WW_EXPEDITED 160건) **"등록된 기준요금이 없습니다"로 표시됨**. "전체 기간" 필터나 Agency 미리보기 선택 여부와 무관하게 항상 0건.

## 재현/검증

- service_role 키로 직접 조회: WW_EXPEDITED 상품 요율 160건 정상 존재 확인
- `sntl@zenith.kr`의 실제 로그인 세션 토큰으로 동일 쿼리 재현 → `content-range: */0` (RLS에 의해 0건 반환) 확인

## 근본 원인

`zen_ups_base_rates` 테이블의 SELECT 정책 3개 중 SUB_ADMIN 역할이 어디에도 포함되지 않음:

| 정책명 | 대상 역할 |
|:-------|:---------|
| `ups_base_rates_admin_all` | ADMIN, MANAGER, ZENITH_SUPER_ADMIN |
| `ups_base_rates_agency_select` | AGENCY |
| `ups_base_rates_shipper_select` | CORPORATE, INDIVIDUAL, SHIPPER, AGENCY_SHIPPER |

마이그레이션 `20260719000400_sub_admin_master_agency_scoped_pricing.sql` 주석에 다음과 같이 **의도적으로 제한**했다고 명시되어 있음:

> "전역 ADMIN과 달리 zen_ups_base_rates(UPS 판매가)·zen_organizations 등 플랫폼 공용/타 조직 데이터는 접근 불가."

## 문제점 (설계와 실제 UI의 불일치)

TASK-192(Issue #618)에서 `UpsBaseRateMatrix` 컴포넌트를 "SUB_ADMIN 모드로 재사용"하도록 구현하며 `/admin/ups-rates` 화면에 SUB_ADMIN 접근을 열어줬으나(NaviSidebar 메뉴 노출 + page.tsx 권한 통과), **정작 근간이 되는 `zen_ups_base_rates` SELECT 자체가 막혀 있어 화면이 항상 빈 상태**로 나옴 — 화면은 만들어졌지만 데이터 계층 권한 설계가 따라가지 못한 상태.

의도된 설계(SUB_ADMIN은 판매가 아닌 원가만 관리)가 맞다면, 최소한 사용자에게 "권한 없음"을 명확히 안내하거나 원가(cost_price) 전용 다른 화면으로 분리해야 하는데, 현재는 데이터 없음처럼 보여 혼란을 야기함.

## 영향

고객 시연 시 SNTL 계정으로 "UPS 요율 관리" 화면을 열면 아무 데이터도 안 보임 — 실제로는 정상 작동하는 admin/manager 계정으로 대체해 시연 진행하기로 함(Edward 결정, 2026-07-27).

## 조치 방향 (설계 결정 필요 — Team A 배정 예정)

| 안 | 설명 |
|:---|:-----|
| A. RLS에 SUB_ADMIN 조회 정책 추가 | `zen_ups_base_rates`에 SUB_ADMIN이 본인 관리 하위 Agency 범위에서 SELECT 가능한 정책 추가(판매가 조회는 허용, 수정은 기존 cost_price 전용 경로 유지) |
| B. 화면 자체를 원가 전용으로 재설계 | SUB_ADMIN에게는 base_rate 판매가 대신 `zen_agency_pricing_policies`(원가) 기반 별도 뷰만 노출 |
| C. 최소 조치 — 권한 없음 안내 | 데이터 없음이 아니라 명확한 "조회 권한 없음" 메시지로 UX만 수정(임시) |

## 관련 Task/Issue

- 원 기능: TASK-192(Issue #618) — SNTL 원가 Matrix 편집 기능
- 본 결함: 미배정, Team A 대상 신규 Task 발령 필요
