# TASK-B-324: Issue #1190 — 오더 화주명 수기입력값이 SHXK(UPS) 실제 배송 등록에 미반영 (DEF-B-144)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1190](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1190) |
| **DEF** | [DEF-B-144](../defects/DEF-B-144_SHXK수기입력화주명_배송등록미반영.md) |
| **배경** | JSJung — 오더 등록 시 화주명을 수기입력해도 실제 UPS(SHXK) 시스템에 등록되는 정보에는 반영되지 않는 것 같다고 문의 → Jaison 분석으로 원인 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-09-13 |
| **우선순위** | P2 |
| **상태** | 🔄 진행 중 |

## 현재 상태 (Jaison 분석 완료)

- `src/lib/ups/label-mapping.ts:122` `buildCreateOrderPayload()`의 `shipper_company` 매핑:
  ```ts
  shipper_company: (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
  ```
  `order.shipper_name`(TASK-B-295/Issue #1100에서 신설된 수기입력 오버라이드 컬럼)을 전혀 읽지 않음.
- TASK-B-295는 오버라이드 적용 대상을 "서류/라벨 생성 지점 4곳"(CI/PL/UPS Invoice PDF·화주 정보 카드·Shipping Label PDF)으로 명시적으로 한정했고, 나머지 30여 곳은 "실소속 조직명 유지가 정상"이라 의도적으로 제외했음. `buildCreateOrderPayload()`는 그 "4곳"에도 "제외 대상 30여 곳"에도 속하지 않는 **사각지대**였음 — 당시 스코프 분석([TASK-B-295 task file](TASK-B-295_260813_Issue1100_OrderShipperNameOverride.md) §14~16, §54~62)에서 아예 언급되지 않음.
- 결과: 내부 생성 서류(CI/PL/UPS Invoice/Shipping Label PDF)에는 수기입력값이 정상 표시되지만, **UPS/SHXK에 실제 등록되는 화주 정보는 여전히 조직명** — 서류와 실제 등록 정보 불일치.
- `buildCreateOrderPayload()` 호출 지점 2곳(둘 다 영향받음):
  - 실제 등록: [`src/app/actions/operations/ups-labels.ts:172-189`](../../src/app/actions/operations/ups-labels.ts#L172-L189) `placeShxkOrder()`
  - 미리보기: [`src/app/actions/operations/ups-labels.ts:664-689`](../../src/app/actions/operations/ups-labels.ts#L664-L689) `previewShxkPayload()`
- `gitnexus_impact` 확인 결과 `buildCreateOrderPayload` 사용처는 위 2곳뿐 — 수정 범위 좁음.
- `shipper.shipper_name`(SHXK 필드, `order.shipper_contact_name`=담당자명 매핑)은 이번 결함과 무관, 정상 동작 — 혼동 금지.

## 수정 방향 (단순 Task — 설계 의견 절차 불요)

### ① `src/lib/ups/label-mapping.ts` `buildCreateOrderPayload()` — `shipper_company` 폴백 순서 수정

```ts
shipper_company: (order.shipper_name as string) || (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
```

TASK-B-295가 4개 문서 빌더에 적용한 `order.shipper_name || order.shipper?.name` 폴백 패턴과 동일 원칙. `shipper_org`는 이 파일 기준 필드명이므로 그대로 사용(문서 빌더 쪽 `order.shipper?.name`과 별칭이 다를 수 있음 — 혼동 주의).

**주의**: `shipper.shipper_name`(담당자명, `order.shipper_contact_name`)은 건드리지 않는다 — 이번 수정 대상은 `shipper_company`(회사/화주 표시명) 1개 필드뿐.

### ② 회귀 테스트 신설 (필수, R-09 — 실제 동작 기반)

- `buildCreateOrderPayload()`에 `order.shipper_name`이 설정된 order 객체를 넘겼을 때 결과 `shipper.shipper_company`가 수기입력값과 일치하는지
- `order.shipper_name`이 없는(레거시) order 객체를 넘겼을 때 기존대로 `shipper_org?.name`으로 폴백하는지
- 가능하면 `previewShxkPayload()` 또는 `placeShxkOrder()` 경로까지 통합 테스트로 확인(mock SHXK 호출) — 최소한 `buildCreateOrderPayload()` 단위 테스트는 필수

### ③ `LIVE_REGRESSION_TEST_MAP.md` 갱신 (R-09)

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-324-shxk-shipper-name-override` 브랜치 생성(전용 워크트리, R-17 §0) — **`./scripts/next-task-number.sh B` 재확인 필수**(2026-09-13 기준 스크립트가 TASK-B-318을 반환했으나 GitHub Issue에 이미 TASK-B-318~323이 선점되어 있어 실제로는 TASK-B-324가 맞음 — 착수 시점에 다시 한번 GitHub Issue 제목까지 직접 검색해 확인할 것, 스크립트 결과만 맹신 금지)
- [ ] `label-mapping.ts` `shipper_company` 폴백 수정(①)
- [ ] 회귀 테스트 신설(②) — mock 기반, 실제 함수(`buildCreateOrderPayload`) 호출·반환값 검증. `toContain` 소스 문자열 검사나 `typeof fn === 'function'` 존재 확인 금지
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 갱신(③)
- [ ] **독립 되돌리기 검증**: 폴백 순서를 원복해서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 브라우저에서 실제로: 오더 등록 화면에서 "수기입력" 모드로 화주명(예: "Test Shipper XYZ") 입력 → 등록 → 해당 오더의 SHXK payload(미리보기 기능이 있으면 그 화면, 없으면 `zen_shxk_api_logs`의 실제 전송 payload 또는 `previewShxkPayload()` 서버 액션 직접 호출 결과)에서 `shipper.shipper_company`가 "Test Shipper XYZ"로 나가는지 확인, 스크린샷/로그 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-324 SHXK createorder shipper_company 수기입력값 미반영 수정 (DEF-B-144)` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `gh issue edit 1190 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR 생성(`feature/* → TeamB_Dev`, `Closes #1190`)

## 담당자 위반 이력 사전 경고

**Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수.
- task file 미생성(완료 보고 절차 위반) 누적 **13회** — 최다. 이번 Task는 착수 시점에 이미 task file이 준비되어 있으므로, 완료 시 **`[작업 결과]` 섹션 작성 + 상태 🔔 전환**을 반드시 코드 커밋과 같은 세션에서 처리할 것.
- 채번 절차 누락/중복 **6회**(+CI 자체보고와 실제 결과 불일치 포함) — 이번 Task 자체가 스크립트 결과(TASK-B-318)와 실제 정답(TASK-B-324)이 다른 사례이므로, 착수 전 `next-task-number.sh` 결과를 GitHub Issue 제목 검색으로 반드시 재검증할 것(위 착수 체크리스트 1번 항목 참조).
- 요청된 검증을 무관한 절차로 대체 제출(자가검증 위조에 준함) 1회 — 이번 Task의 R-10 검증은 "실제 SHXK로 나가는 payload에 수기입력값이 반영되는지"가 핵심이므로, 코드 경로를 거치지 않은 별도 확인(DB 직접 조회/삽입 등)으로 대체하지 말 것.
- 위 이력에도 불구하고 JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지, [[project_dave_r17_assignment_policy]]).

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
