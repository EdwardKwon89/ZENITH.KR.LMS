# DEF-153 | `zen_rate_cards` SELECT RLS — 화주·법인·개인 세션이 원가·마진 전 컬럼 조회 가능

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **High** (Edward 보고 후 TASK 발령 — R-18 4항, Aiden 단독 발령 금지) |
| **발견일 / 발견자** | 2026-11-18 / B_Kai (TASK-1156, Issue #1338, `TASK-1156_DEF-147_admin_접근통제_점검.md` §5.1·§8.1 #1) — Aiden 등록 |
| **관련** | DEF-147 · DEF-152(§1.1 `rate-cards.ts` 가드 공백, 동일 영역) · PR #1383 |
| **조치 상태** | 미조치 — 점검 전용 Task라 수정 안 함 |

## 현상
화주 계정(CORPORATE)의 정상 액세스 토큰으로 PostgREST `GET /rest/v1/zen_rate_cards?select=carrier_cost,margin_rate,platform_fee_rate` 호출 시 **200, 24건 전량** 반환(브라우저에서 anon key + 본인 토큰만으로 재현 가능).

## 원인
`zen_rate_cards_select` 정책(`supabase/migrations/20260529150000_fix_route_rls_corporate_individual.sql:30-40`)이 `SHIPPER`/`CORPORATE`/`INDIVIDUAL`을 **조직·소유 조건 없이** 허용. 테이블에 원가·마진 컬럼이 같이 있다. 서버 액션 `admin/rates.ts getRateCards`는 화주를 거부하고 `CARRIER`의 `platform_fee_rate`를 마스킹(`:253-255`, `:303-307`)해 **숨기려는 의도는 코드에 있으나 RLS에 반영되지 않음**.

## 영향
화주가 대리점·운송사 원가와 플랫폼 마진을 열람 가능(영업 기밀). 화면으로는 보이지 않고 데이터 계층으로만 노출 — DEF-147 §1.2의 "액션 레벨 방어"와 모순되지 않음. **Pilot 원격 DB가 실데이터**이므로 마이그레이션 시 기존 데이터 보전 필요.

## 소유 팀 근거 (git log)
정책 마이그레이션 `1a2e475d` `[D_Kai]`(Team A). 수정 범위가 RLS(Team A 소유 영역)이므로 Team A Task.

## 권장 조치
1. `zen_rate_cards_select`에서 화주 계열 제외, 필요 시 원가·마진 컬럼 없는 **판매가 뷰**(`rates-public` 계열과 동일 원칙) 제공.
2. 변경 전 화주 화면이 이 테이블을 직접 SELECT하는 경로가 있는지 확인(회귀 위험).
3. 회귀 테스트: 화주 세션 SELECT 0건·원가 컬럼 비노출 단언(자기완결 fixture).
