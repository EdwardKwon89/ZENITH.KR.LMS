# TASK-179 — Phase 7.2 IMP-146 SPR-01: Box 상품 + Zone-서비스-방향 매핑 정밀화

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-179 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | B_Kai |
| **우선순위** | P3 (Go-Live 비차단 백로그) |
| **전제조건** | 없음 |
| **관련 IMP** | IMP-146 |
| **브랜치** | 신규 생성 — `feature/teama-task-179-zone-box-precision-bkai` |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ⬜ |

---

## [배경]

An-14 §9(요율표 구조 정확도 리스크) 중 2건을 해소한다. `docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md` §12 필독.

## [작업 범위]

### 1. Box 상품 등록 (An-14 §12-1 #2)

- `zen_ups_products`에 `max_weight_kg INT` 컬럼 추가(마이그레이션)
- `UPS_10KG_BOX`(max_weight_kg=10)·`UPS_25KG_BOX`(max_weight_kg=25) 신규 제품 시드
- `zen_ups_base_rates`에 Box 상품용 요율 시드(1kg 단위, 공식 UPS Rate Guide 참고 — `docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` p.14 "UPS 10 KG Box 및 UPS 25 KG Box" 표 참조)
- Admin UI(`/admin/ups-rates` 제품 탭)에 Box 상품 CRUD 시 `max_weight_kg` 입력 필드 추가

### 2. Zone-서비스-방향 매핑 (An-14 §12-1 #3)

- `zen_ups_zone_countries`에 `product_family VARCHAR(20)`(EXPRESS/SAVER/EXPEDITED/FREIGHT)·`direction VARCHAR(6)`(EXPORT/IMPORT) 컬럼 추가
- 기존 UNIQUE(country_code) → UNIQUE(country_code, product_family, direction)로 재정의
- **데이터 마이그레이션**: 기존 시드 46개국 매핑을 `product_family='EXPRESS', direction='EXPORT'`로 우선 채움(하위 호환 유지, 기존 6/30 시범 운영 데이터 깨지지 않도록)
- `src/lib/ups/pricing-engine.ts`의 `resolveZoneByCountry()`에 `productFamily`·`direction` 파라미터 추가(기본값 EXPRESS/EXPORT로 하위호환 유지)
- Admin UI Zone 관리 탭에 product_family·direction 필터/입력 추가

## [설계 의견 — 필수]

착수 전 아래 항목에 대한 방안을 상세 파일 `[설계 의견]` 섹션에 제출하고 Aiden 확정을 받는다(⬜→📝→🔍→🔄):

1. 기존 시드 데이터(46개국)를 EXPRESS/EXPORT로만 초기화하면 나머지 조합(SAVER/EXPEDITED/FREIGHT × IMPORT 등)은 매핑이 비어있게 된다 — 조회 시 폴백 전략(예: 매핑 없으면 EXPRESS/EXPORT 값 사용)을 어떻게 설계할지
2. `resolveZoneByCountry()` 시그니처 변경이 기존 호출부(TASK-174 `freight.ts` 등)에 미치는 영향 — 하위호환 유지 방법

## [DoD]

- [ ] `zen_ups_products.max_weight_kg` 컬럼 추가 + Box 제품 2종 시드
- [ ] Box 상품 요율 시드(공식 Rate Guide 기준, 최소 Zone 2~10 × 1~15kg 구간)
- [ ] `zen_ups_zone_countries` 컬럼 2종 추가 + UNIQUE 재정의 + 기존 데이터 마이그레이션(하위호환)
- [ ] `resolveZoneByCountry()` 파라미터 확장(하위호환 기본값 포함) + 기존 호출부 정상 동작 확인
- [ ] Admin UI 반영(Box 상품 필드, Zone 매핑 필터)
- [ ] 신규 단위테스트(TC-UPS-BOX-*, TC-UPS-ZONEMAP-*)
- [ ] `npm run test:regression` 전체 PASS (현재 기준선 424 이상 유지)
- [ ] `npx tsc --noEmit` 신규 오류 0건
- [ ] `LIVE_REGRESSION_TEST_MAP.md`·`scratch/IMP_PROGRESS.md` 갱신
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

표준 절차 준수(R-17 §0 Git 동기화 → 신규 브랜치 → 코드 커밋 → task file 🔔 → ACTIVE_TASK 반영 → check-R17-DoD → 문서 커밋 → PR 생성, `Closes` 대상 이슈 없음).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

## [설계 의견]

_(B_Kai 작성)_

## [설계 확정]

_(Aiden 전속)_

## [작업 결과]

_(B_Kai 작성)_
