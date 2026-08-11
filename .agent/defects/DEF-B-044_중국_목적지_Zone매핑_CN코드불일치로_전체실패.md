# DEF-B-044 — 중국(CN) 목적지 UPS Zone 조회가 전부 실패 (country_code 불일치 — CN vs CNN/CNS)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 보고: "목적지 국가(CN)에 매핑된 Zone이 없습니다" 에러 |
| **긴급도** | **Critical** — 중국행 UPS 오더 전체(예외 없이 100%)가 견적조회/오더등록 단계에서 실패 |
| **현재 상태** | 미수정 |

## 근본 원인 (확정)

`resolveZoneByCountry()`(`src/lib/ups/pricing-engine.ts:61`)가 `destCountryCode`(ISO-3166 2자리, 예: `CN`)로 `zen_ups_zone_countries`를 조회하는데, 이 테이블에는 **"CN"이라는 코드 자체가 존재하지 않음** — 대신 UPS 공식 Zone 차트(원본: `docs/80_RawData/20260609 SNTL 자료/ups_zones_kr.pdf`)가 중국을 **남/북 두 개 지역으로 분리**해서 각각 다른 코드로 관리하기 때문:

```
CNN   China Mainland (Excluding Southern China Mainland)*   → EXPORT 시 Zone 1
CNS   Southern China Mainland+*                              → EXPORT 시 Zone 10
```

PDF 원문 정의(그대로 인용, `ups_zones_kr.pdf` 257~258행):
> China South refers to **Fujian, Hainan, Hu Nan(Hunan), Yunnan, Jiangxi, Guangxi, Guangdong** Provinces and **Chongqing City** only.
> China refers to the rest of China (Excluding China South)

DB 실측 확인(`zen_ups_zone_countries`):
```
CNN | EXPORT → Z1 (SAVER/EXPRESS/EXPEDITED)  |  IMPORT → Z3
CNS | EXPORT → Z10                            |  IMPORT → Z10
```
즉 **데이터 자체는 정확히 존재**하지만(CNN/CNS로), 애플리케이션 어디에도 "CN"을 "CNN 또는 CNS"로 변환하는 로직이 없어 조회가 무조건 실패함. `grep`으로 코드베이스 전체 확인 — `CNN`/`CNS`/국가코드 정규화(alias) 로직 0건.

## 영향 범위

`destCountryCode`가 사용되는 모든 경로 100% 영향(`grep destCountryCode` 확인 — `estimateUpsFreight`, 오더 등록 시 예상운임, 실제원가 확정, 일일정산, finance 화면 등 전부):
- `src/app/actions/ups/freight.ts` — `estimateUpsFreight()` (견적)
- `src/app/actions/operations/orders.ts` — 오더 등록 시 스냅샷 생성
- `src/app/actions/finance/order-revenue-cost.ts`, `ups-actual-cost.ts`, `daily-billing.ts` — 정산 관련
- 중국이 destCountryCode인 모든 케이스가 `throw`로 즉시 실패 — UI/UX 우회 경로 없음

## 수정 방향

`resolveZoneByCountry()`에 중국 전용 특수 분기 추가: `destCountryCode === 'CN'`일 때, 목적지 주(state/province) 정보를 참조해 CNS/CNN 중 하나로 먼저 변환한 뒤 기존 조회 로직을 그대로 태움.

**province → CNS 판정 목록** (PDF 원문 8개 지역, `country-state-city` 라이브러리의 China State ISO 코드로 매핑 — 직접 확인 완료):
```ts
// Fujian, Hainan, Hunan, Yunnan, Jiangxi, Guangxi(Zhuang), Guangdong, Chongqing
const CHINA_SOUTH_STATE_CODES = ['FJ', 'HI', 'HN', 'YN', 'JX', 'GX', 'GD', 'CQ'];
```
위 목록에 해당하면 `CNS`, 그 외(주 정보 없음/목록 외 전체)는 `CNN`으로 취급.

**구현 지점**:
1. `pricing-engine.ts`의 `resolveZoneByCountry(destCountryCode, zones, productFamily, direction, destStateProvince?)` — 신규 파라미터 추가, 함수 시작부에 `if (code === 'CN') code = resolveChinaSubCode(destStateProvince)` 형태로 정규화 후 기존 로직 그대로 진행
2. `EstimateUpsFreightInput`(`freight.ts`)에 `destStateProvince?: string` 추가, `estimateUpsFreight()`가 `resolveZoneByCountry` 호출 시 전달
3. `UpsFreightEstimateSection.tsx` — `destStateProvince` prop 추가해 상위로부터 전달받아 `estimateUpsFreight` 호출부에 포함
4. `OrderRegistrationForm.tsx:1374` 부근 — `destStateProvince={watch('recipient_state_province')}` 형태로 전달(recipient 주소는 `AddressInput`으로 입력되며 `state_province` 필드에 `country-state-city`의 **ISO 코드**가 저장됨 — `GD`, `FJ` 등, 지역명 문자열이 아님. 직접 확인 완료: `Guangxi Zhuang`은 isoCode `GX`, `Chongqing`은 `CQ`로 정상 존재)
5. **[JSJung 확인 완료, 2026-08-11 — "중국은 별도 처리 필요"] `state_province` 미입력 시 조용히 추정(default)하지 않고, 중국만 이 필드를 필수로 강제한다.**
   - 근거: `src/lib/validation/order.ts:66` 확인 결과 `recipient_state_province`는 현재 전체 국가 공통으로 `z.string().optional()` — 실제로 주 정보 없이 중국행 주문이 제출 가능한 상태. Zone 1(CNN)과 Zone 10(CNS)은 요금 차이가 크므로, 확인되지 않은 상태에서 default로 추정해 배정하면 에러 없이 조용히 잘못된 가격이 계산되는 **더 위험한 결과**(현재의 "명시적 에러로 막힘" 상태보다 나쁨).
   - 조치: `recipient_country_code === 'CN'`일 때 `recipient_state_province`를 **폼 레벨에서 필수로 강제**(zod `superRefine` 또는 동등한 조건부 검증 — `country_code`가 `CN`이면 `state_province` 비어있음을 막음) + `AddressInput`/제출 시점에 명확한 안내 문구("중국 배송은 UPS Zone이 지역(성/직할시)에 따라 달라져 필수 입력입니다" 등) 노출.
   - `state_province`가 정상 입력된 경우에만 위 8개 지역 목록으로 CNS/CNN 결정 로직 수행 — 이 경우는 기존 설계(1~4번) 그대로.
   - 기존에 이미 저장된 CN 오더 중 주 정보가 없는 레코드(과거 데이터)가 있을 수 있음 — 이런 경우 재계산/재조회 시 동일하게 막히는 게 맞는지, 아니면 예외적으로 CNN 기본 처리할지는 **구현자가 실제 데이터 유무 확인 후 [발견 이슈]에 기재**(이번 Task 범위 밖일 수 있음).

## 회귀 테스트 (필수)

- `resolveZoneByCountry('CN', zones, 'EXPRESS', 'EXPORT', 'GD')` → CNS 매핑(Zone 10) 반환 확인
- `resolveZoneByCountry('CN', zones, 'EXPRESS', 'EXPORT', 'BJ')`(베이징, 목록 외) → CNN 매핑(Zone 1) 반환 확인
- CNN/CNS 8개 지역 전부(FJ/HI/HN/YN/JX/GX/GD/CQ) 개별 케이스 확인 권장
- 기존 CN이 아닌 국가(예: US, JP) 조회는 영향받지 않는지 회귀 확인 — `state_province` optional 유지
- **폼 검증**: `recipient_country_code='CN'` + `recipient_state_province` 빈 값 → 제출 시 유효성 에러로 차단(현재는 통과됨 — 이 테스트가 지금 FAIL해야 정상, 수정 후 PASS로 전환되는 걸 확인)
- **폼 검증**: `recipient_country_code`가 CN 외 국가면 `recipient_state_province` 미입력이어도 정상 제출 가능(회귀 방지)
- **되돌리기 검증 필수**
