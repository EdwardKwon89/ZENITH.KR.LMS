# DEF-134: UPS WW_EXPEDITED/WW_SAVER_DOC/WW_SAVER_NONDOC 판매가가 원가 대비 낮게 등록됨(역마진) — DEF-133 확장 검증

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-31 |
| **보고자** | Aiden — DEF-133 조치 후 "다른 상품의 판매가/원가도 검증해 달라"는 Edward 지시로 UPS 전 상품 전수 검증 |
| **긴급도** | High |
| **우선순위** | P1 |

## 현상

DEF-133(WW_EXPRESS_DOC/NONDOC) 정정 후, 원격 DB의 UPS 전체 8개 상품을 대상으로 `selling_price < cost_price`(base_rates) / `price_per_kg_selling < price_per_kg_cost`(weight_tier_rates) / `min_charge_selling < min_charge_cost`(freight_minimums) 전수 조회한 결과, DEF-133 범위 밖에서도 동일한 역마진 패턴이 광범위하게 발견됨.

| 상품 | base_rates 역마진 | weight_tier_rates 역마진 | freight_minimums 역마진 |
|:-----|:---:|:---:|:---:|
| WW_EXPEDITED | 16/160 | 63/63(전부) | 0/0 |
| WW_SAVER_DOC | 70/160 | 0/63 | 0/0 |
| WW_SAVER_NONDOC | 0/160(정상) | 18/63 | 0/0 |
| WW_FLIGHT | 0/160(정상) | 45/63 | 8/9 |
| UPS_10KG_BOX / UPS_25KG_BOX | 0 | — | 0 |

(WW_EXPRESS_DOC/NONDOC은 DEF-133에서 이미 조치 — 이 문서는 원격 반영 전 시점 스냅샷 기준)

## 근본 원인

DEF-133과 동일: 2026-06-28 더미 시드(`20260628000000_ups_seed_data.sql`) 이후, 2026-07-19 원가 정정 작업(`20260719000100`/`20260719000300`)이 상품별로 `cost_price`만 부분 갱신하고 `selling_price`(또는 일부 구간의 tier/freight_min)를 갱신 대상에서 누락 — 상품마다 누락 범위가 다르게 남음.

- 검증 방법: 각 역마진 행의 `selling_price`(반올림된 정수, 더미 공식 산출값)와 `cost_price`(소수점 포함, KR-P 원가표 실측치)를 대조 — 원가는 이미 실측치, 판매가만 잔존 더미값임을 확인.

## 조치

**출처**: DEF-133과 동일 — `docs/80_RawData/20260609 SNTL 자료/UPS 운임 및 부가서비스.pdf`, `pdftotext -layout` 직접 추출.

- **WW_EXPEDITED base_rates**(16행): 확인된 역마진 셀만(1.0kg 9개 zone, 2.0kg 6개 zone, 3.0kg 1개 zone) 공식 비서류(Expedited는 서류 등급 없음) 요금표로 정정
- **WW_EXPEDITED weight_tier_rates**(63행 전부): 공식 20kg 초과 kg당 요금표로 정정(DB 300-499/500-999/1000-∞ 3구간은 공식표 "300 and above" 단일 구간 적용 — DEF-133과 동일 매핑)
- **WW_SAVER_DOC base_rates**(70행, 2.0~5.0kg 전 zone): 공식 서류(Documents) 요금표로 정정
- **WW_SAVER_NONDOC weight_tier_rates**(18행, 500-999/1000-∞ 구간만 역마진 확인): 공식 20kg 초과 kg당 요금표("300 and above")로 정정. 21-44/45-70/71-99/100-299/300-499 구간은 역마진이 아니어서(이미 selling≥cost) 이번 정정 범위 밖 — DEF-133과 동일하게 "역마진 확인된 행만" 원칙 적용.

**마이그레이션**: `supabase/migrations/20260731160000_def134_expedited_saver_reverse_margin_fix.sql`

## 이번 조치 범위 밖 — WW_FLIGHT(UPS Worldwide Express Freight)

WW_FLIGHT는 weight_tier_rates 45/63행, freight_minimums 8/9행이 역마진이나, **공식 UPS 요금 가이드 PDF에 이 상품의 공개 요금표 자체가 없음** — Freight(파렛트 단위 화물) 서비스는 계약/견적 기반으로 가격이 책정되는 구조이며, PDF에는 서비스 설명·부가요금만 존재. `docs/80_RawData/20260609 SNTL 자료/원가표.xlsx`(KR-P 시트)에도 Flight/Freight 섹션이 없음 — 이미 `20260719000000_sntl_zone_countries_rebuild.sql` 주석에 "FREIGHT(WW_FLIGHT) product_family는 이 시트에 데이터 없음"으로 동일한 gap이 기록되어 있었음.

- **현재 상태**: WW_FLIGHT는 `is_active=TRUE`이며 실제 주문 화면(`UpsServiceSelector.tsx`)에서 선택 가능한 상태 — 검증되지 않은 근거로 원가보다 낮은 판매가로 실제 주문이 발생할 수 있는 리스크가 실존함.
- **권장 조치**: (1) 공식 Freight 계약 요금 자료를 SNTL/UPS 담당자로부터 확보 후 동일 방식으로 정정하거나, (2) 자료 확보 전까지 임시로 `is_active=FALSE` 처리하여 선택을 차단. 데이터를 추정/역산하여 채우지 않음(재무 데이터 조작 금지 원칙).
- Aiden 단독 판단으로 비활성화하지 않고, Edward 확인 후 진행 여부 결정 필요 — 별도 보고 예정.

## 검증

- 로컬 DB: `supabase db reset --yes` + 마이그레이션 적용 + `seed-local.ts` 재실행, WW_EXPEDITED/WW_SAVER_DOC/WW_SAVER_NONDOC 역마진 0건 확인(WW_FLIGHT는 의도적으로 미조치 상태 유지)
- 회귀 테스트: 진행 중(결과는 PR에 기재)
- 원격 적용은 develop 병합 + CI 통과 확인 후 별도 진행 예정
