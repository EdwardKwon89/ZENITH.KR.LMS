# An-15 — UPS 특송 전체 구현 현황 점검 및 보완 계획

> **문서번호:** An-15 | **작성일:** 2026-07-05 | **작성자:** Aiden (Claude, ZEN_CEO)
> **목적:** Edward 지시("UPS 특송 관련 전체 구현 현황, 요구사항 및 설계와 차이점 분석, 우선순위 기반 보완 계획 수립")에 따른 종합 점검
> **방법:** ① Team A 등록 기능 완료 여부 코드 레벨 검증 ② 원본 요구사항(`20260705 UPS특송 요금관리.md`)·SNTL 원자료·An-13·An-14 전체 문서 대조(병렬 조사 에이전트 2개) ③ 실제 코드/스키마/UAT 문서 교차 검증
> **범위**: 문서만이 아니라 실제 코드·DB 시드까지 직접 확인하여 "설계상 완료"와 "실제 작동"의 괴리를 찾는 데 집중

---

## 0. 결론 요약

| 질문 | 답변 |
|:---|:---|
| Team A의 Agency 요금등록 관리 기능은 완료됐는가? | **설계·스키마·기본 UI는 완료. 단, Phase 7.2(IMP-146) 산출물 중 일부가 실제 계산 경로(API)에 연결되지 않은 상태(§1-3 참조) — "완료"라 부르기엔 이릅니다.** |
| 요구사항/설계 대비 차이점이 있는가? | **있습니다. 총 21건 발견 — Critical 3건, High 5건, Medium 6건, Low 7건 (§2~§5)** |

---

## 1. Q1 — Team A Agency 요금등록 관리 기능 완료 여부

### 1-1. 완료 확인된 부분

- Phase 7.1(TASK-171~177) + Phase 7.2(TASK-179~181) 전량 develop 머지 완료, 회귀 443/443 PASS
- `zen_agency_pricing_policies`(Admin 할인율 정책) + `zen_agency_other_charges`(Agency 부가요금) 신규 테이블 + `trg_agency_rate_override_calc_cost` 트리거(원가 자동계산) 정상 동작
- Admin UI(`/admin/ups-rates`) 6탭 — Zone/제품/기준요금/유류할증/부가요금/Agency 할인율 정책 — 전부 실 CRUD로 구현됨(Placeholder 아님)
- Agency UI(`/agency/rate-overrides`) — cost_price 읽기전용화 + selling_price만 입력 가능 + Agency 부가요금 등록 섹션 확인됨
- TASK-179(B_Kai): Box 상품(`UPS_10KG_BOX`/`UPS_25KG_BOX`) + Zone-서비스-방향 매핑(`product_family`/`direction` + 2단계 Fallback) 구현 완료
- TASK-180(Riley): 20kg 초과 티어 요금 + DWB + Freight 최소운임 구현 완료(`zen_ups_weight_tier_rates`, `zen_ups_freight_minimums`)

### 1-2. 발견된 결함 — "완료"로 보기 어려운 이유

**🔴 [CRITICAL] estimateUpsFreight()가 TASK-179의 Zone 정밀화를 실제로 사용하지 않음**

`src/app/actions/ups/freight.ts`(Team B가 호출할 유일한 진입점)를 직접 확인한 결과, Zone 조회가 여전히 구(舊) 인라인 로직을 사용 중입니다:

```ts
// freight.ts:66-70 (현재 코드, 그대로)
const zone = (zonesRaw ?? []).find((z) =>
  (z as unknown as UpsZoneWithCountries).countries.some(
    (c) => c.country_code.toUpperCase() === code
  )
);
```

TASK-179가 구현한 `resolveZoneByCountry()`(2단계 Fallback + `productFamily`/`direction` 파라미터 + `fallbackApplied` 반환)는 **`pricing-engine.ts`에 존재하지만 `freight.ts`에서 호출되지 않습니다.** 즉, Box 상품·SAVER/EXPEDITED/FREIGHT 계열·수입(IMPORT) 방향의 정확한 Zone 조회가 **API 레벨에서는 여전히 작동하지 않습니다.** (이 리팩터링은 TASK-179 설계 확정 시 "TASK-180 이후 별도 Task로 분리 가능"이라고 명시적으로 유예했던 항목 — 유예된 채로 남아있음)

**🟡 [HIGH] Admin UI에 20kg 초과 티어·Freight 최소운임 관리 화면 없음**

`zen_ups_weight_tier_rates`·`zen_ups_freight_minimums`는 마이그레이션 시드로만 존재하며, Admin이 값을 조회·수정할 UI가 전혀 없습니다(`/admin/ups-rates`의 6개 탭 어디에도 해당 없음). 운영 중 요율 변경이 필요하면 직접 DB 접근이 유일한 방법입니다.

**결론**: Team A 등록 기능의 **핵심 골격(Agency 할인율/부가요금 CRUD)은 완료**됐지만, **Phase 7.2가 만든 정밀화 로직 중 일부가 실제 서비스 경로에 연결되지 않았고, 운영 UI도 빠져 있어** "완료"로 확정 짓기보다 §2 우선순위 계획에 따라 마무리가 필요한 상태입니다.

---

## 2. 우선순위 종합 표

| # | 등급 | 항목 | 근거 | 영향 |
|:-:|:----:|:-----|:-----|:-----|
| 1 | 🔴 Critical | **OVERSIZE 부가요금 시드값 오류** — DB `15,000/12,000` vs SNTL 요구값 `69,200` | 코드 직접 확인 | 대형포장물 배송 발생 시 상시 저평가 청구(DEF-095와 동일 성격) |
| 2 | 🔴 Critical | **API 명세서에 Phase 7.2 신규 기능 전량 미기재** — `resolveZoneByCountry`/`fallbackApplied`, `resolveBillingWeight`, DWB/티어/Freight최소, Box 상품 | 2개 조사 에이전트 독립 확인 | Team B가 B-059/060/061을 불완전한 계약 기준으로 설계할 위험 |
| 3 | 🔴 Critical | **`estimateUpsFreight()`가 `resolveZoneByCountry()` 미사용** | 코드 직접 확인 | TASK-179 Zone 정밀화가 실제 API에서 무효 |
| 4 | 🟠 High | **Admin UI에 20kg 초과 티어·Freight 최소운임 관리 화면 부재** | 코드 직접 확인 | 운영 중 요율 변경 시 DB 직접 조작 필요 |
| 5 | 🟠 High | **§4/§11 담당 불일치** — `order-integration.ts`(스냅샷 저장)가 An-14 §4엔 Team A, §11엔 Team B로 중복 기재 | 문서 조사 | B-059 설계 시 책임 소재 혼선 가능 |
| 6 | 🟠 High | **6/30 시범 운영 중 20kg 초과·Box 상품 실사용 여부 미확인** | An-14 §9·§12-3 중복 미결정 | 남은 Phase 7.2 갭의 실제 긴급도 판단 불가 |
| 7 | 🟠 High | `UAT_DEFECT_LOG.md` 2026-06-10 이후 미갱신 — Phase 7 결함(DEF-089~095) 중앙 원장에 미등재 | 조사 에이전트 확인 | 결함 이력 이원화, 추적 누락 위험 |
| 8 | 🟠 High | `UAT_MASTER.md` 인덱스가 개별 UAT 파일 실행 상태(UAT-17-01/02, 18-01/02 이미 ☑)를 반영 못함 | 조사 에이전트 확인 | 진행률 오판 위험 |
| 9 | 🟡 Medium | `zen_ups_flight_plans` 테이블 — 스키마만 존재, 앱 코드 어디에도 미사용(고아 기능) | 코드 직접 확인 | 방치된 미완성 기능, 정리 또는 완성 결정 필요 |
| 10 | 🟡 Medium | 원본요구 "부가요금은 배송 건수에 별도 적용" — 건당 계산 로직이 계산 파이프라인에 미구현 | 문서 조사 | Agency 부가요금이 건별로 정확히 청구되는지 불명 |
| 11 | 🟡 Medium | "부피 할증" 용어가 실제 구현(부피중량 계산 vs OVERSIZE) 중 무엇을 가리키는지 불명확 | 문서 조사 | 원가 회계상 혼선 가능 |
| 12 | 🟡 Medium | `zen_ups_shxk_country_map`(An-13, API 코드) ↔ `zen_ups_zone_countries`(An-14, 요금 Zone) 이원 관리, 동기화 규칙 없음 | 문서 조사 | 두 매핑 데이터 드리프트 위험 |
| 13 | 🟡 Medium | Ds_11 API 명세서 3파일 공존(활성 1 + Deprecated/Draft 2) + 활성본이 `03_Design`이 아닌 `02_Analysis`에 위치 | 조사 에이전트 확인 | 참조 시 혼동, 특히 파일명 동일한 Deprecated본과 오인 가능 |
| 14 | 🟡 Medium | `UAT_22`/`UAT_23` 파일 내부 시나리오 ID 오채번(UAT-20/21로 잘못 표기) | 조사 에이전트 확인 | 문서 자기참조 오류 |
| 15 | 🟢 Low | SNTL 원자료의 물류 운영 프로세스(Pick-up 2종, 입고 후 정보수정 잠금, UPS 직원 Hand-held 인수, 반환/발송완료 수동처리)가 An-13/An-14 어디에도 명시적 스코프 배제 없이 누락 | 문서 조사 | 의도적 제외인지 누락인지 불명 — Edward 확인 필요 |
| 16 | 🟢 Low | SNTL 원자료의 세분화된 역할 계층(대리점관리자/운영자/사용자, 법인관리자/부서관리자/부서사용자)이 실제로는 flat 6-role(ADMIN/MANAGER/ZENITH_SUPER_ADMIN/AGENCY/SHIPPER/AGENCY_SHIPPER)로 단순화 | 코드+문서 조사 | 의도적 MVP 단순화로 추정되나 명시적 승인 기록 없음 |
| 17 | 🟢 Low | shxk `calculateshippingfee`(자체 운임 API) vs ZENITH 자체 `estimateUpsFreight()` 이원 계산 경로 — 왜 자체 구축했는지, 대사(reconciliation) 계획 미논의 | 문서 조사 | 두 계산 결과 상이 시 대응 방안 없음 |
| 18 | 🟢 Low | An-13 KOR 시드는 8개 코드(Express/Expedited/Saver/Flight)만 포함, Phase8 가이드가 권고한 16개 코드(CNK 직계약, 3자계약 포함) 중 나머지 채택 근거 미문서화 | 문서 조사 | 향후 CNK/3자계약 상품 추가 시 재작업 필요 가능 |
| 19 | 🟢 Low | An-14 §8의 3개 "Edward 확인 필요" 항목(브랜치 재사용, 정책 이력관리 방식, OC 폴백)의 명시적 확정 문구 부재 | 문서 조사 | 실무는 Aiden 권고안대로 이미 진행됨 — 사후 승인만 필요 |
| 20 | 🟢 Low | An-14 §9("Go-Live 이후 착수 권고")와 §12("당일 즉시 발령")가 동일 문서 내 자기모순 | 문서 조사 | 실질적 영향 없음(기록 정정 목적) |
| 21 | 🟢 Low | An-13/An-14가 서로를 전혀 인용하지 않음(같은 `zen_orders` 필드를 각자 다른 목적으로 소비) | 문서 조사 | 문서 정합성 관리 이슈 |

---

## 3. Critical 3건 — 즉시 조치 제안 (Go-Live 전 필수)

### 3-1. DEF-096(가칭): OVERSIZE 부가요금 시드값 오류

- **현상**: `supabase/migrations/20260628000000_ups_seed_data.sql:99` — `('OVERSIZE', 'Oversize / Bulky Package', 'PKG', TRUE, 15000, 12000)`
- **정답**: SNTL 원자료(`sntl_ups.txt:15`) — "대형 포장물은... 포장물 1C/T당 **69,200원**의 추가요금이 적용됩니다"
- **영향**: 대형포장물(길이+둘레 300~400cm) 배송 시 판매가가 54,200원 과소 청구됨 — DEF-095와 동일한 "요율표 데이터가 원문과 불일치" 유형의 결함
- **권고**: DEF 등록 + Hotfix로 즉시 처리(DEF-095 선례와 동일 처리 방식 제안)

### 3-2. `estimateUpsFreight()` ↔ `resolveZoneByCountry()` 미연결

- **권고**: TASK-179에서 유예했던 리팩터링(freight.ts 인라인 로직 → `resolveZoneByCountry()` 전환)을 Team B의 B-059/060 착수 전에 마무리. 이걸 미루면 Team B가 Zone 정밀화 없는 API를 기준으로 오더 연동을 설계하게 됨.

### 3-3. Ds_11 API 명세서 Phase 7.2 갱신 누락

- **권고**: `docs/02_Analysis/Ds_11_API_상세_명세서.md`에 §11 보강 — Box 상품, `product_family`/`direction`/`fallbackApplied`, DWB/티어/Freight최소 breakdown 필드를 Team B가 소비할 수 있게 명문화. 3-2와 연계해 함께 처리 권장.

---

## 4. High 5건 — Team B B-059 착수 전 정리 권장

| # | 항목 | 권고 조치 |
|:-:|:-----|:---------|
| 4 | Admin UI 티어/Freight최소 관리화면 부재 | 신규 탭 2개 추가(Admin UI), 별도 Task로 발령 |
| 5 | §4/§11 담당 불일치(스냅샷 저장) | An-14 정정 — §4에서 `order-integration.ts` 삭제, §11 Team B 단독 소유로 명확화 |
| 6 | 20kg초과/Box 실사용 여부 미확인 | **Edward 확인 필요** — 시범 운영 로그/오더 데이터 조회로 실제 발생 여부 파악 |
| 7 | UAT_DEFECT_LOG 미갱신 | DEF-089~095를 원장에 소급 등재, 갱신 담당·주기 재정의 |
| 8 | UAT_MASTER 인덱스 불일치 | UAT-17-01/02, 18-01/02 상태를 🔄→☑ 반영하는 갱신 작업 |

## 5. Medium/Low — 백로그 등재(우선순위 순 정리, 즉시 조치 불요)

Medium 6건(#9~14), Low 7건(#15~21)은 위 §2 표에 근거·영향과 함께 이미 정리되어 있습니다. 별도 긴급 대응 없이 다음 Phase 계획 수립 시 반영을 권장합니다. 특히 #15(SNTL 물류 프로세스 스코프)와 #16(역할 계층 단순화)은 **기능 결함이 아니라 "의도적 범위 조정인지 확인이 필요한 항목"**이므로 Edward의 명시적 확인만 받으면 종결 가능합니다.

---

## 6. 다음 단계 제안

1. **Critical 3건(§3)** — Edward 승인 시 DEF 등록 + Hotfix로 즉시 처리(TASK 채번은 별도 지시 대기)
2. **High 5건 중 #6(실사용 여부)** — Edward 확인 회신 대기, 회신에 따라 나머지 Phase 7.2 항목 우선순위 재조정
3. **High 나머지(#4·5·7·8)** — Team B B-059 착수 전 처리 권장, 순서는 Edward 지시에 따름
4. **Medium/Low 14건** — 백로그 등재만 하고 즉시 착수하지 않음(본 세션 조사 완료로 기록 목적 달성)

이 계획대로 진행해도 될지, 우선순위 조정이 필요한지 확인 부탁드립니다.
