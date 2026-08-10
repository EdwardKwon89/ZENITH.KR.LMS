# TASK-B-272: Issue #1044 / DEF-B-044 (Critical) — 중국(CN) 목적지 UPS Zone 조회 전체 실패

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1044](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1044) |
| **DEF** | [DEF-B-044](../defects/DEF-B-044_중국_목적지_Zone매핑_CN코드불일치로_전체실패.md) |
| **배경** | JSJung 보고 "목적지 국가(CN)에 매핑된 Zone이 없습니다" → Jaison이 원인 확정, 중국행 오더 100% 실패 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1 (Critical)** |
| **상태** | ⬜ |

## 근본 원인 (Issue #1044 / DEF-B-044 참조 — 원인 확정 완료)

`resolveZoneByCountry()`(`src/lib/ups/pricing-engine.ts:61`)가 ISO 코드 `CN`으로 `zen_ups_zone_countries`를 조회하는데, 이 테이블엔 `CN`이 없고 UPS 공식 Zone 차트가 중국을 **CNN(북부)/CNS(남부)**로 분리해서 관리함(원본 PDF `docs/80_RawData/20260609 SNTL 자료/ups_zones_kr.pdf` 확인):
```
CNN   China Mainland (Excluding Southern China Mainland)   → EXPORT Zone 1 / IMPORT Zone 3
CNS   Southern China Mainland                                → EXPORT Zone 10 / IMPORT Zone 10
China South = Fujian, Hainan, Hunan, Yunnan, Jiangxi, Guangxi, Guangdong 성 + Chongqing 시(only)
China(=CNN) = 나머지 전체
```
DB에는 CNN/CNS 데이터가 정확히 존재(확인 완료)하지만, 앱 어디에도 CN→CNN/CNS 변환 로직이 없어 100% 실패.

## 설계 확정 (JSJung 확인 완료, 2026-08-11)

**JSJung 지시**: "중국은 별도 처리가 필요할 듯 — 분석해달라" → Jaison 분석 결과 아래로 확정:

1. `country-state-city` 라이브러리의 China State ISO 코드로 8개 남부 지역 매핑 확인 완료:
   ```ts
   // Fujian, Hainan, Hunan, Yunnan, Jiangxi, Guangxi Zhuang, Guangdong, Chongqing
   const CHINA_SOUTH_STATE_CODES = ['FJ', 'HI', 'HN', 'YN', 'JX', 'GX', 'GD', 'CQ'];
   ```
2. **주(성/직할시) 정보가 있으면** 위 목록으로 CNS/CNN 결정.
3. **주 정보가 없으면 조용히 추정(default)하지 않는다** — `src/lib/validation/order.ts:66` 확인 결과 `recipient_state_province`가 현재 전 국가 공통 `.optional()`이라 중국행 주문이 주 정보 없이도 제출 가능한 상태. Zone1/Zone10 요금 차이가 커서, 확인 안 된 상태로 default 추정하면 **에러 없이 잘못된 가격이 계산되는 더 위험한 결과**(현재의 "명시적 에러로 막힘"보다 나쁨). → **`recipient_country_code === 'CN'`일 때만 `recipient_state_province`를 폼 검증 단계에서 필수로 강제**.

## 구현 지점

1. **`src/lib/ups/pricing-engine.ts`** — `resolveZoneByCountry()`에 5번째 파라미터 `destStateProvince?: string` 추가. 함수 시작부에서 `code === 'CN'`이면 `CHINA_SOUTH_STATE_CODES.includes(destStateProvince?.toUpperCase())` 결과로 `code`를 `'CNS'` 또는 `'CNN'`으로 정규화한 뒤 기존 로직 그대로 진행. `destStateProvince` 미전달 시(폼 검증으로 이 케이스가 없어야 하지만 방어적으로) `CNN` 기본 처리 + 로그 경고 권장.
2. **`src/app/actions/ups/freight.ts`** — `EstimateUpsFreightInput`에 `destStateProvince?: string` 추가, `estimateUpsFreight()`가 `resolveZoneByCountry` 호출 시 전달.
3. **`src/components/orders/UpsFreightEstimateSection.tsx`** — `destStateProvince` prop 추가, `estimateUpsFreight` 호출부에 포함.
4. **`src/components/orders/OrderRegistrationForm.tsx`** — `UpsFreightEstimateSection` 호출부(1374행 부근)에 `destStateProvince={watch('recipient_state_province')}` 추가.
5. **`src/lib/validation/order.ts`** — `recipient_state_province`(66행)를 zod `superRefine`(또는 `.refine`)으로 조건부 필수화: `recipient_country_code === 'CN'`이면 `recipient_state_province` 비어있음을 막고 명확한 에러 메시지("중국 배송은 지역(성/직할시) 선택이 필수입니다 — UPS Zone이 지역에 따라 달라집니다") 반환.
6. **UI 안내**: `AddressInput`을 사용하는 recipient 섹션(`OrderRegistrationForm.tsx` 1090행 부근)에 중국 선택 시 안내 문구 표시 검토(country_code === 'CN'일 때만 조건부 표시 — 기존 `AddressInput` 공용 컴포넌트 수정 없이 `OrderRegistrationForm` 쪽에서 조건부 렌더링으로 처리 권장, 컴포넌트 자체 변경은 다른 사용처 영향 검토 필요해 최소화).
7. **기존 저장 데이터 확인**: `zen_orders`/관련 테이블에 이미 `recipient_country_code='CN'`이면서 `recipient_state_province`가 빈 값인 기존 레코드가 있는지 실 DB로 확인 — 있으면 재계산/재조회 시 동일하게 막히는 게 맞는지 판단 필요(이번 Task 범위 밖일 수 있음 — 있다면 `[발견 이슈]`에 기재하고 Jaison에게 별도 보고).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-272-china-zone-mapping` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-272 확인
- [ ] `pricing-engine.ts`의 `resolveZoneByCountry()`에 CNS/CNN 정규화 로직 추가
- [ ] `freight.ts`/`UpsFreightEstimateSection.tsx`/`OrderRegistrationForm.tsx`에 `destStateProvince` 전달 배선
- [ ] `order.ts` 검증 스키마에 CN 조건부 필수 검증 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `resolveZoneByCountry('CN', ..., 'GD')` → CNS(Zone10) 확인, `resolveZoneByCountry('CN', ..., 'BJ')`(목록 외) → CNN(Zone1) 확인
  - 8개 남부 지역(FJ/HI/HN/YN/JX/GX/GD/CQ) 개별 케이스 확인 권장
  - CN 외 국가(US/JP 등)는 기존 동작 그대로 유지되는지 회귀 확인
  - 폼 검증: `recipient_country_code='CN'` + `recipient_state_province` 빈 값 → 제출 차단(수정 전엔 통과 → 수정 후 차단으로 전환되는 것 확인)
  - 폼 검증: CN 외 국가는 `recipient_state_province` 미입력이어도 정상 제출(회귀 방지)
  - **되돌리기 검증 필수** — 정규화 로직 제거 시 원래 에러(중국 전체 실패)가 재현되는지 확인
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 오더 등록 화면에서 수하인 국가=중국, 성=Guangdong 선택 → 예상운임이 정상 계산되는지(Zone10 요율 적용) 확인. 성 미선택 상태로 제출 시도 → 명확한 에러로 차단되는지 확인. 성=Beijing(목록 외) 선택 → Zone1 요율 적용되는지 확인. 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-272 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1044 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1044`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-268/270(동일 UPS pricing 영역)은 절차 정확히 준수 완료 — 동일 수준 기대. 이번 Task는 신규 폼 검증 로직(zod superRefine)이 추가되므로, 기존 CN 외 국가 주문 흐름이 전혀 영향받지 않는지 회귀 테스트로 반드시 확인할 것.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
