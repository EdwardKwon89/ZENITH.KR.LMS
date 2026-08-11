# TASK-B-283: Issue #1069 / DEF-B-055 (High) — SHXK createorder 수취인 도시 필드 미검증 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1069](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1069) |
| **DEF** | [DEF-B-055](../defects/DEF-B-055_SHXK_createorder_수취인도시_consignee_city_필드_미검증.md) |
| **배경** | JSJung — MASTER AIR로 실제 UPS createorder 반복 실패 보고 → Jaison 원인 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1 (High)** |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료)

`zen_shxk_api_logs` 확인 — SHXK 응답 `收件人城市不能为空`(수취인 도시 필수), 실제 request_params `consignee_city: ""`(빈 문자열).

**2곳 미비**:
1. `src/lib/validation/order.ts:67` — `recipient_city: z.string().optional()`, TASK-B-277(Issue #1052)의 UPS 조건부 필수 블록(`recipient_country_code`/`recipient_zipcode`/`shipper_contact_phone`)에 `recipient_city`가 포함되지 않음. 당시 "consignee_province/city/district — 조건부(국가별)"로 명시적으로 범위 밖 처리했던 항목이 실제 발현.
2. `src/lib/shxk/validate-payload.ts` — `validateShxkPayload()` consignee 체크(name/countrycode/street/postcode/telephone)에 `consignee_city` 누락.

**참고**: 중국 City select 옵션이 부실한 문제(`country-state-city` 라이브러리 한계, 상하이 4개뿐)는 JSJung과 이미 논의 후 현행 유지로 결정됨 — 이번 Task는 UI 개선이 아니라 **필수 검증 추가만** 다룸. "Shanghai"가 옵션에 실제 존재하므로 필수화만으로 해결 가능.

## 수정 방향 (설계 확정 — 착수 승인)

TASK-B-277과 동일 패턴:
1. `order.ts`의 `if (data.transport_mode === 'UPS')` 블록에 `recipient_city` 조건부 필수 추가(기존 country_code/zipcode/shipper_contact_phone과 병렬)
2. `validateShxkPayload()`의 consignee 체크에 `consignee_city` 추가

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-283-consignee-city-validation` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-283 확인
- [ ] `order.ts` UPS 조건부 필수 블록에 `recipient_city` 추가
- [ ] `validate-payload.ts`에 `consignee_city` 체크 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - UPS + `recipient_city` 누락 → 폼 검증 실패(TASK-B-277 order-validation.test.ts 패턴)
  - 비UPS(AIR 등)는 `recipient_city` 없어도 통과(회귀 방지)
  - `validateShxkPayload()` — `consignee_city` 누락 시 에러 메시지 반환 확인(TASK-B-277 shxk-payload-validation.test.ts 패턴)
  - **되돌리기 검증 필수**
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 가능하면 실제 MASTER AIR 계정으로 상하이 목적지 재시도 → 성공 확인, 또는 mock 대체 가능 시 명시

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-283 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1069 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1069`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-278/279/280/282는 절차 준수 양호 — 동일 수준 기대.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `fe6bfac2` | `[Dave] fix: TASK-B-283 SHXK createorder 수취인 도시(consignee_city) 필드 미검증 수정 (Issue #1069 / DEF-B-055)` |

### 수정 내용 (TASK-B-277 동일 패턴, 2곳)

1. `src/lib/validation/order.ts` — UPS 조건부 필수 블록(`if (data.transport_mode === 'UPS')`)에 `recipient_city` 추가 (기존 `recipient_country_code`/`recipient_zipcode`/`shipper_contact_phone`과 병렬, 에러 메시지 "UPS 배송은 수하인 도시가 필수입니다(SHXK API 요구사항)")
2. `src/lib/shxk/validate-payload.ts` — `validateShxkPayload()` consignee 체크에 `consignee_city` 추가(에러 "수취인 도시 누락")

### 회귀 테스트

| 파일 | 내용 |
|:-----|:-----|
| `order-validation.test.ts` | ① UPS + `recipient_city` 누락 → 검증 실패(신규) ② 비UPS(AIR)은 `recipient_city` 없이 통과(회귀 방지) ③ 기존 validUpsPayload에 `recipient_city` 추가 |
| `shxk-payload-validation.test.ts` | `consignee_city` 누락 → "수취인 도시 누락" 에러 반환(신규) + 정상 payload에 `consignee_city` 추가 |

**기존 UPS payload 사용 테스트 9개 파일 fixture 보정**(`recipient_city`/`consignee_city` 추가): `bulk-orders`·`direct-shipper-ups-snapshot`·`tracking-configs-provider-type`·`def123-tracking-no-sync`·`ups-labels-split`·`ups-labels-combined-doctype`·`ups-labels-agency-permission`·`warehouse-actions`·`shxk-payload-validation`

### 되돌리기 검증

`recipient_city`(order.ts) + `consignee_city`(validate-payload.ts) 모두 일시 제거 → **신규 테스트 2건 FAIL** 재현 → 복원 후 ALL PASS 확인.

### 검증

- `npm run test:regression`: **1192/1192 PASS** (167파일)
- `npm run build`: SUCCESS
- `npx tsc --noEmit`: 오류 없음

## [발견 이슈]

없음

## [Jaison 최종 검토]

되돌리기 검증 직접 재현 — 두 검증 블록 제거 시 신규 2건 정확히 FAIL, 나머지 28건 무관. 회귀 167/167·1192/1192 ALL PASS(재검증 일치), build SUCCESS, CI 전체 pass. PR#1072 승인·머지, Issue #1069 종결.
