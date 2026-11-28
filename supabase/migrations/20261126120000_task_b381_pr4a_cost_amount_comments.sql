-- TASK-B-381 PR-4a (Issue #1459) — 원가 저장값 정의 주석 갱신(스키마 변경 없음)
-- base/fuel/surge: 원금액 + 통화 컬럼(기존 정의 유지). other_charges: 자식 행 원금액의 합(통화 혼재 가능).
-- calc_version: 3 = PR-4a부터 원금액·입력 통화 저장(환산·+7% 가산은 total_cost_krw/스냅샷에만).

COMMENT ON COLUMN public.zen_ups_actual_cost.other_charges_hkd IS
  '기타부가운임 원금액 합(통화 혼재 가능 — 항목별 원금액·통화는 zen_ups_actual_other_charges 자식 행)';
COMMENT ON COLUMN public.zen_ups_actual_cost.calc_version IS
  '계산 규칙 버전: 1=레거시/가산 없음, 2=신규 규칙(+7% 기본운임·항목별 통화)으로 계산한 값, 3=원금액·입력 통화 저장(PR-4a)';
