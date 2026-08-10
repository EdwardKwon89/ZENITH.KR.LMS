# TASK-B-273: Issue #1046 / DEF-B-045 — 중국(CN) 급증 긴급 수수료 미계산 (DEF-B-044 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1046](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1046) |
| **DEF** | [DEF-B-045](../defects/DEF-B-045_중국_급증수수료_CN코드불일치로_미계산.md) |
| **배경** | JSJung — 중국행 예상운임 계산 후 급증 수수료 미계산 보고. DEF-B-044(TASK-B-272)와 동일 원인이 다른 쿼리(급증 수수료)에도 있었음 — Jaison이 원 설계 시 놓친 부분 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 근본 원인 (Issue #1046 / DEF-B-045 참조 — 확정 완료)

`src/app/actions/ups/freight.ts:197-206`의 급증 수수료 조회:
```ts
const { data: surgeFeeRows } = await supabase
  .from('zen_ups_surge_fees')
  .select('*')
  .eq('destination_country_code', input.destCountryCode)   // 'CN' 원본 그대로
  ...
```
`zen_ups_surge_fees`도 `zen_ups_zone_countries`와 동일하게 중국을 `CNN`/`CNS`로 분리 관리(DB 확인: CNN=143.00원/kg, CNS=143.00원/kg, `CN` 자체는 0건). TASK-B-272에서 Zone 조회는 정규화했지만 이 급증 수수료 조회는 그대로 남아있어, 중국행 오더는 급증 수수료가 항상 0으로(항목 자체 누락) 계산됨.

## 수정 방향 (설계 확정 — 착수 승인)

TASK-B-272에서 만든 `resolveChinaSubCode()`(`src/lib/ups/pricing-engine.ts`, 이미 export됨)를 재사용:
```ts
import { resolveChinaSubCode } from '@/lib/ups/pricing-engine';

const surgeFeeCountryCode = input.destCountryCode.toUpperCase() === 'CN'
  ? resolveChinaSubCode(input.destStateProvince)
  : input.destCountryCode;

const { data: surgeFeeRows } = await supabase
  .from('zen_ups_surge_fees')
  .select('*')
  .eq('destination_country_code', surgeFeeCountryCode)
  .eq('is_active', true)
  .lte('effective_from', refDate)
  .or(`effective_until.is.null,effective_until.gte.${refDate}`)
  .order('effective_from', { ascending: false })
  .limit(1);
```
`estimateUpsFreight()`가 이미 `input.destStateProvince`를 받고 있음(TASK-B-272에서 추가) — 추가 배선 불필요, `freight.ts` 내부 로직만 수정하면 됨.

**범위 확인**(Jaison 1차 grep 완료): `freight.ts` 내 `destination_country_code` 조회는 이 한 곳뿐. `rates.ts`/`rates-mutation.ts`/`rates-public.ts`의 `destination_country_code` 사용은 전부 관리자 CRUD/목록조회용이라 원본 코드 그대로 노출하는 게 맞음(정규화 대상 아님) — 구현자가 재확인 권장.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-273-china-surge-fee` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-273 확인
- [ ] `freight.ts`의 급증 수수료 조회에 `resolveChinaSubCode()` 적용
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `destCountryCode='CN', destStateProvince='GD'` → 급증 수수료 정상 계산(0 아님) 확인
  - `destCountryCode='CN', destStateProvince='BJ'`(목록 외) → 정상 계산 확인
  - `destCountryCode='CN'`(주 정보 없음) → CNN 정규화로 정상 계산 확인(방어적 동작)
  - CN 외 국가는 기존 동작 그대로 유지(회귀 방지)
  - **되돌리기 검증 필수** — 정규화 제거 시 중국행 급증 수수료 0 재현되는지 확인
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 오더 등록 화면에서 중국+Guangdong 선택 → 예상운임 상세에 급증 수수료 항목이 0이 아닌 값으로 표시되는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-273 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1046 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1046`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-272(바로 이전 Task, 동일 파일 `freight.ts`/`pricing-engine.ts`)는 절차 정확히 준수 완료 — 코드 맥락 숙지도가 높을 것으로 기대, 동일 수준 기대. 이번 건은 수정 범위가 작으므로(기존 헬퍼 재사용) 간결하게 처리 가능.

## [작업 결과]

**작성자**: Dave | **작성일**: 2026-08-11 | **상태**: 🔔 (검토 요청)

### 구현 (코드 커밋 `b1d0ceba`)

`src/app/actions/ups/freight.ts`의 급증 수수료 조회에 `resolveChinaSubCode()`(TASK-B-272에서 export된 기존 헬퍼) 재사용:

```ts
const surgeFeeCountryCode = input.destCountryCode.toUpperCase() === 'CN'
  ? resolveChinaSubCode(input.destStateProvince)
  : input.destCountryCode;
```

`input.destStateProvince`는 TASK-B-272에서 이미 `EstimateUpsFreightInput`에 추가되어 있어 추가 배선 불필요 — `freight.ts` 내부 로직만 수정. DB 확인: `zen_ups_surge_fees`에 `CNN`/`CNS`(각 143.00원/kg) 존재, `CN`은 0건.

**범위 확인**: `freight.ts` 내 `destination_country_code` 조회는 이 한 곳뿐. `rates.ts`/`rates-mutation.ts`/`rates-public.ts`의 사용처는 전부 관리자 CRUD/목록조회용이라 원본 코드 그대로 노출이 맞음 — 정규화 대상 아님 재확인.

### 회귀 테스트 (코드 커밋 — 4건 신설, `tests/unit/ups/freight-actions.test.ts`)

| TC | 시나리오 | 결과 |
|:---|:---------|:-----|
| TC-UPS-FREIGHT-SURGE-CN-01 | CN+GD → `destination_country_code='CNS'` 조회 + surgeFeeSellingAmount > 0 | ✅ |
| TC-UPS-FREIGHT-SURGE-CN-02 | CN+BJ → `'CNN'` 조회 + > 0 | ✅ |
| TC-UPS-FREIGHT-SURGE-CN-03 | CN+주 정보 없음 → `'CNN'` 기본 정규화 + > 0 (방어적 동작) | ✅ |
| TC-UPS-FREIGHT-SURGE-CN-04 | CN 외(USA) → 원본 코드 조회, CNN/CNS 미호출 (회귀 방지) | ✅ |

**되돌리기 검증**: 정규화 제거(수정 전 코드) 후 실행 → **중국 급증 수수료 테스트 3건 FAIL**(surgeFee 0 재현) 확인 후 복원 → freight 32/32 PASS 재확인.

### 검증 수치

- 전체 회귀: `npm run test:regression` — **1128/1128 PASS** (159 파일)
- `npm run build` — Compiled successfully (15.5s)

### R-10 실브라우저 검증 (문서 커밋, 스크린샷 `docs/99_Manual/E2E_273_Result/`)

- SHIPPER 계정 실제 로그인 → 오더 등록 UPS Direct → 수하인 국가=중국 + 성=Guangdong(GD)
- **UPS 예상 운임 패널에 "급증 긴급 수수료 1,049.263 KRW" 표시 확인** — 수정 전엔 `CN` 코드 조회 실패로 항목이 통째로 누락되었음 (`01_china_gd_surge_fee.png`)

### R-17 DoD 체크리스트

- [x] 코드 커밋 (`b1d0ceba`) — freight.ts surge 조회 정규화 + 테스트 4건
- [x] 문서 커밋 — R-10 증적
- [x] 회귀 1128/1128 PASS / build SUCCESS
- [x] R-10 실브라우저 (중국 GD 급증 수수료 표시)
- [x] 되돌리기 검증 (정규화 제거 시 3건 FAIL 재현)

## [발견 이슈]

없음


## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
