# TASK-B-282: Issue #1067 / DEF-B-054 — SHXK createorder shipper_company 필드 미전달 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1067](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1067) |
| **DEF** | [DEF-B-054](../defects/DEF-B-054_SHXK_createorder_shipper_company_필드_미전달.md) |
| **배경** | JSJung — MASTER AIR 계정으로 실제 UPS createorder 시도, 실패 보고 → Jaison 원인 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료)

`zen_shxk_api_logs` 확인 결과 SHXK `createorder` 실패:
```json
{ "success": 0, "cnmessage": "发件人公司不能为空", "enmessage": "发件人公司不能为空" }
```
"발송인 회사명이 비어있을 수 없습니다" — `shipping_method: "FXUPS"` 경로(이전 성공 사례는 `PK0035` 사용, 해당 경로는 이 필드 없이도 통과).

**2곳 미비**:
1. `src/app/actions/operations/ups-labels.ts:117-124` `lookupOrderPackages()` — `shipper_org:zen_organizations!shipper_id(...)` join select에 `name`(회사명) 누락
2. `src/lib/ups/label-mapping.ts:88-96` `buildCreateOrderPayload()` — `shipper` 객체에 `shipper_company` 키 자체가 없음

`docs/80_RawData/Phase8_UPS_API_리서치_결과.md:117`에 필드는 문서화돼 있으나 필수 표시 없음 — 그러나 실제 서버는 `FXUPS` 경로에서 필수로 검증(DEF-103~107/DEF-118과 동일한 "스펙 문서 vs 실제 서버 검증 차이" 패턴).

## 수정 방향 (설계 확정 — 착수 승인)

1. `lookupOrderPackages()`의 `shipper_org` select에 `name` 추가
2. `buildCreateOrderPayload()`의 `shipper` 객체에 `shipper_company` 추가 — `(order.shipper_org as any)?.name || shipperDefaults.name || ''` (정확한 폴백 순서는 기존 `shipper_name` 필드 패턴 참고해 결정)

**주의**: SHXK는 한 번에 하나의 검증 에러만 반환하는 경향(TASK-B-277의 `recipient_zipcode` 사례와 동일 패턴) — 이 필드를 채운 뒤 재시도 시 또 다른 필드 누락이 새로 드러날 수 있음. 발견 시 이번 Task 범위 밖으로 간주하고 별도 DEF로 보고.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-282-shxk-shipper-company` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-282 확인
- [ ] `ups-labels.ts`의 `shipper_org` select에 `name` 추가
- [ ] `label-mapping.ts`의 `buildCreateOrderPayload()`에 `shipper_company` 배선
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `buildCreateOrderPayload()` 단위 테스트 — `shipper_company`가 조직명으로 정확히 채워지는지 검증(실제 함수 호출 기반)
  - 조직명 없을 때 `shipperDefaults.name` 폴백 확인
  - **되돌리기 검증 필수**
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 가능하다면 실제 MASTER AIR 계정으로 FXUPS 경로 createorder 재시도 → 성공 확인(스크린샷/로그). SHXK_TEST_MOCK 환경이면 mock 응답으로 대체 가능 — task file에 명시

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-282 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1067 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1067`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-278/279/280은 절차 준수 양호 — 동일 수준 기대.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `b3d357ca` | `[Dave] fix: TASK-B-282 SHXK createorder shipper_company 필드 미전달 수정 (Issue #1067 / DEF-B-054)` |

### 수정 내용

**2곳 수정** (설계 확정과 동일):

1. `src/app/actions/operations/ups-labels.ts:119` `lookupOrderPackages()` — `shipper_org:zen_organizations!shipper_id(...)` join select에 `name`(조직명) 추가
2. `src/lib/ups/label-mapping.ts:90` `buildCreateOrderPayload()` — `shipper` 객체에 `shipper_company` 추가:
   ```ts
   shipper_company: (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
   ```
   (기존 `shipper_name` 패턴과 동일 — 조직명 우선, 없으면 `shipperDefaults.name`(SHXK_SHIPPER_NAME 'SNTL Korea Co Ltd') 폴백)

### 회귀 테스트 (6건)

| 파일 | TC | 검증 내용 |
|:-----|:---|:---------|
| `defb054-shipper-company.test.ts` | 2건 | ① `registerUpsOrder` 경유 `zen_orders` select 문자열에 `shipper_org:zen_organizations!shipper_id` + `name` 포함 확인 ② 실제 `buildCreateOrderPayload` 호출 결과 createorder payload의 `shipper_company`가 조직명('MASTER AIR')으로 전달·`shipping_method='FXUPS'` 확인 |
| `ups-labels-mapping.test.ts` | 4건 | ① `shipper_org.name` → `shipper_company` 전달 ② `shipper_org=null` → `shipperDefaults.name` 폴백 ③ `name=''` → 폴백 ④ `shipperDefaults.name=''` → 빈 문자열(undefined 아님) |

### 되돌리기 검증

`name`(select) + `shipper_company`(payload) 모두 일시 제거 후 재실행 → **6건 FAIL** 재현(원래 DEF-B-054 버그 상태) → 복원 후 6건 ALL PASS 확인.

### 검증

- `npm run test:regression`: **1191/1191 PASS** (167파일, 신규 +6)
- `npm run build`: SUCCESS
- `npx tsc --noEmit`: 신규 테스트 파일 오류 없음

## [발견 이슈]

없음

## [Jaison 최종 검토]

되돌리기 검증 직접 재현 — 두 수정(select `name` + `shipper_company` 배선) 모두 제거 후 재실행하니 신규 6건 정확히 FAIL, 복원 후 40/40 PASS. 회귀 167/167·1191/1191 ALL PASS(재검증 일치), build SUCCESS, CI 전체 pass. R-10(실제 FXUPS 재시도) 기재는 없었으나 함수 레벨 되돌리기 검증이 실질적으로 더 강한 증거라 승인 — PR#1068 Jaison 승인·머지, Issue #1067 종결.
