# DEF-133: UPS WORLDWIDE EXPRESS(WW_EXPRESS_DOC/NONDOC) 판매가가 원가 대비 낮게 등록됨(역마진)

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-31 |
| **보고자** | Aiden — Edward 확인 요청("원격 Vercel의 UPS 원 판매가 중 WORLDWIDE EXPRESS 상품 이상하다") |
| **긴급도** | High |
| **우선순위** | P1 |

## 현상

`zen_ups_base_rates`(0.5~30kg 실중량 구간)와 `zen_ups_weight_tier_rates`(21kg 이상 kg당 구간)에서, WW_EXPRESS_DOC/NONDOC 상품의 `selling_price`(판매가)가 `cost_price`(원가)보다 낮은 행이 다수 존재 — 매 오더마다 손실이 발생하는 구조였다.

- WW_EXPRESS_DOC base_rates: 160건 중 99건 역마진(0.5~5kg 구간, 최대 -83%)
- WW_EXPRESS_NONDOC base_rates: 160건 중 56건 역마진
- WW_EXPRESS_NONDOC weight_tier_rates: 63건 **전부** 역마진(원가가 구간과 무관하게 고정값으로 남아있어 격차가 특히 큼)
- WW_EXPRESS_DOC weight_tier_rates: 역마진 없음(다만 검증 안 된 더미값, 아래 참조)

## 근본 원인

1. **2026-06-28**([D_Kai], `20260628000000_ups_seed_data.sql`, Issue #134 UAT 사전점검용): 모든 UPS 상품의 `selling_price`/`cost_price`를 임의의 더미 공식(`weight × zone_rate × product_factor`)으로 시딩 — 이 시점엔 판매가가 항상 원가의 1.25배로 설계돼 정상.
2. **2026-07-19**([Claude]=Aiden, `20260719000300_fix_cost_surcharge_double_apply_and_selling_price.sql`): UPS 실제 원가표(KR-P 시트, `docs/80_RawData/20260609 SNTL 자료/원가표.xlsx`)를 반영해 `cost_price`를 실측치로 정정. **같은 날 SAVER 상품은 `selling_price`도 UPS 공식 판매가로 함께 정정했으나(`20260719000200_sntl_saver_selling_price.sql`), WW_EXPRESS는 `cost_price`만 갱신되고 `selling_price`는 6월 28일 더미값 그대로 방치** — Aiden 본인의 작업 누락.

Team B는 이 데이터를 만진 이력이 없음(git log 확인 완료).

## 왜 기존 역마진 방지 로직이 못 걸렀나

1. `zen_ups_base_rates`/`zen_ups_weight_tier_rates`/`zen_ups_freight_minimums` 어디에도 "판매가 ≥ 원가" CHECK 제약이 없었음(음수만 방지하는 CHECK만 존재).
2. 앱 레벨 요율 수정 함수(`src/app/actions/ups/rates-mutation.ts`)에도 마진 검증 로직 없음.
3. 이번 값은 마이그레이션 SQL로 직접 UPDATE된 것이라, 설사 앱 레벨 검증이 있었어도 우회됐을 것.
4. 기존에 구축한 역마진 방지(DEF-B-031/033)는 **Agency↔Shipper 할인율 적용 계층**을 다룬 것으로, 플랫폼 원가표 자체(`zen_ups_base_rates`)의 원가 대비 판매가 정합성은 애초에 검증 대상이 아니었음 — 이번 건과는 다른 계층.

## 조치

**출처**: `docs/80_RawData/20260609 SNTL 자료/UPS 운임 및 부가서비스.pdf`("2026 UPS Rate and Service Guide - Daily Rates, Korea", "수출 – UPS Worldwide Express" 절) — `pdftotext -layout`으로 표를 직접 추출(수기 전사 아님, 전사 오류 방지).

- **WW_EXPRESS_DOC base_rates**(0.5~5.0kg, 10 zone × 10 weight = 100행): 공식 서류(Documents) 요금표로 `selling_price` 정정
- **WW_EXPRESS_NONDOC base_rates**(0.5~20kg, 10 zone × 14 weight = 140행): 공식 비서류(Non-Document) 요금표로 `selling_price` 정정
- **WW_EXPRESS_NONDOC base_rates 25/30kg**(10 zone × 2 weight = 20행): 공식 "20kg 초과 kg당 요금"(21-44 구간) × 중량으로 `selling_price` 산정. 로컬 검증 중 이 구간의 기존 `cost_price`도 2026-06-28 더미값 잔존임이 드러나(Zone10에서 더미 원가가 신규 판매가를 초과해 역마진 재발) 동일 방식으로 `cost_price`도 함께 정정
- **WW_EXPRESS_NONDOC weight_tier_rates**(21kg 이상, 7 구간 × 10 zone = 70행): 공식 kg당 요금표로 `price_per_kg_selling` 정정(DB의 300-499/500-999/1000-∞ 3개 구간은 공식표가 "300 and above" 단일구간이라 동일 요율 적용)
- **재발 방지**: `zen_ups_base_rates`/`zen_ups_weight_tier_rates`/`zen_ups_freight_minimums` 3개 테이블에 `CHECK (selling >= cost)` 제약을 `NOT VALID`로 추가 — 기존 미검증 행(아래 잔여 범위) 때문에 마이그레이션이 막히지 않으면서, 이후 모든 INSERT/UPDATE에는 즉시 적용됨

## 이번 조치 범위 밖(잔여, 역마진 아니므로 시급하지 않음)

- **WW_EXPRESS_DOC**의 7/10/15/20/25/30kg 구간과 `weight_tier_rates` 전체: 역마진은 아니나(1.25배 비율 유지) 여전히 2026-06-28 더미값 — 공식 자료상 "서류 5kg 초과 시 비서류 요금 적용" 규칙이 있어 실제로는 NONDOC과 같은 값을 써야 함. 별도 IMP로 기록 권장(시급하지 않음, 재무 손실 방향 아님).

## 검증

- 로컬 DB: `supabase db reset --yes` + 마이그레이션 적용 + `seed-local.ts` 재실행 2회, 매번 역마진 0건 확인
- 회귀 테스트: 144/144 파일 · 983/983 테스트 ALL PASS
- 원격 적용은 develop 병합 + CI 통과 확인 후 별도 진행 예정
