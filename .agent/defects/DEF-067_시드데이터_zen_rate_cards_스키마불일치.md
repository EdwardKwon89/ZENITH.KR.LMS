# DEF-067 — `supabase/seed_data.sql` 내 `zen_rate_cards` 스키마 불일치로 인한 CI 실패

> **발견일**: 2026-06-17
> **발견자**: Riley (Gemini)
> **긴급도**: 즉시 (모든 PR CI 빌드 및 로컬 DB Reset 차단)
> **관련 Task**: TASK-153 (직접 관련 없으나 CI 차단 블로커)

---

## 1. 발견 경위 및 현상

TASK-153 PR #26의 GitHub Actions CI 검증 단계 중, `supabase db reset --no-confirm` 단계에서 아래와 같은 오류가 발생하며 빌드가 실패했습니다.

```
Seeding data from supabase/seed_data.sql...
failed to send batch: ERROR: column "org_id" of relation "zen_rate_cards" does not exist (SQLSTATE 42703)
Try rerunning the command with --debug to troubleshoot the error.
##[error]Process completed with exit code 1.
```

이로 인해 모든 브랜치의 PR Checks가 정상적으로 진행되지 못하고 차단되는 상태입니다.

---

## 2. 원인 분석

1. `20260523130200_imp080_zen_rate_cards.sql` 마이그레이션에서 `zen_rate_cards` 테이블이 `carrier_id`, `tiers` JSONB 등의 구조로 전면 개편되었습니다.
2. 하지만 `supabase/seed_data.sql` 파일 (라인 26, 45 부근)에서는 여전히 과거 스키마(`org_id`, `origin_code`, `dest_code`, `mode`, `unit_type` 등)를 기준으로 데이터를 insert하려고 시도하여 컬럼 부재로 에러가 발생합니다.

---

## 3. 권장 조치

- `supabase/seed_data.sql` 파일 내의 `zen_rate_cards` 및 `zen_rate_tiers` 삽입 쿼리(라인 17~55)를 최신 스키마 사양에 맞게 수정해야 합니다.
- 수정 예시 (최신 스키마 기준):
  ```sql
  INSERT INTO zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from) ...
  ```
- 이 결함은 공용 시드 파일 및 테이블 스키마 정합성과 관련되어 있으므로, Aiden이 확인 후 **긴급 복구 Task를 발령하여 조치**할 것을 권장합니다.
