# TASK-B-325: Issue #1192 — SHXK createorder shipper_street에 국가명 중복 포함으로 UPS AddressLine3 거부 (DEF-B-145)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1192](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1192) |
| **DEF** | [DEF-B-145](../defects/DEF-B-145_SHXK배송지주소_국가명중복포함_AddressLine거부.md) |
| **배경** | JSJung — 오더 `ZEN-2026-000015`가 화주정보 정상 저장에도 SHXK createorder 실패하는 이유 문의 → Jaison이 실제 API 응답으로 원인 확정 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-09-13 |
| **우선순위** | P1 (High) |
| **상태** | 🔄 진행 중 |

## 현재 상태 (Jaison 분석 완료)

- 실제 SHXK `createorder` 응답(`zen_shxk_api_logs` id `99804d2b-2d68-45d3-b57d-b3513d768a94`):
  ```json
  {"success": 0, "enmessage": "API创建并预报订单失败：创建预报失败!Invalid ShipFrom AddressLine3"}
  ```
  이때 실제 전송된 `shipper.shipper_street`:
  ```
  "6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room"
  ```
- 원인: [`resolveShipperStreet()`](../../src/lib/ups/label-mapping.ts#L64-L73)
  ```ts
  export function resolveShipperStreet(order, shipperOrg) {
    const shipperAddr = (order.shipper_address_english) || (shipperOrg?.address_english) || (shipperOrg?.address) || (order.shipper_address) || '';
    const shipperAddrDetail = (order.shipper_address_detail_english) || (shipperOrg?.address_detail_english) || (shipperOrg?.address_detail) || (order.shipper_address_detail) || '';
    return [shipperAddr, shipperAddrDetail].filter(Boolean).join(' ');
  }
  ```
  `order.shipper_address_english`에 이미 도로명+구+시+도+**국가명 전체**가 통째로 들어있는데, 여기에 상세주소를 단순 공백으로 이어붙여 국가명 뒤에 상세주소가 붙는 비정상 순서의 매우 긴 문자열이 만들어짐.
- SHXK가 이 문자열을 UPS 라벨 규격 AddressLine1/2/3(줄당 약 35자)으로 자동 분할하는 과정에서 "Republic of Korea"가 AddressLine3 구간에 걸쳐 포함됨 — UPS는 국가명이 `shipper_countrycode`(별도 필드)로 이미 전달되므로 AddressLine에 국가명이 중복되면 형식 위반으로 거부.
- **SHXK 자체 필드 검증(`validateShxkPayload`, `shipper_street` 최대 300자)은 통과** — 이 결함은 SHXK 검증 단계가 아니라 그 이후 **실제 UPS 라벨 생성 단계**에서만 드러나 로컬 mock 회귀 테스트로는 원천적으로 잡히지 않는다. 재현 조건 정의가 이번 Task의 핵심 난이도.
- 동일 구조의 [`resolveConsigneeStreet()`](../../src/lib/ups/label-mapping.ts#L77-L89)(수하인 측)도 같은 위험 존재 여부 확인 필요.
- TASK-B-324(Issue #1190, 화주명 수기입력 오버라이드)와는 **무관한 별개 결함** — 혼동 금지. 화주명·조직 연결 자체는 정상.

## 수정 방향 (JSJung 확인 반영, 2026-09-13 — 세부 구현은 여전히 Baker `[설계 의견]` 필요)

**JSJung 지적**: 국제 영문 주소 표기 관례상 상세주소(층/호수 등)는 도로명 주소 **앞**에 와야 한다(예: "Suite 601, 6F, 6 Daewangpangyo-ro..."). 현재 코드(`[shipperAddr, shipperAddrDetail].filter(Boolean).join(' ')`)는 도로명 주소 뒤에, 그것도 국가명 뒤에 상세주소를 붙이는 이중으로 잘못된 순서다.

Jaison이 실제 오더 데이터로 시뮬레이션해 아래와 같이 확정:

| 버전 | 결과 |
|---|---|
| 현재(버그) | `6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room` |
| **확정 방향** | `6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do` |

즉 조합 순서를 **`[상세주소, 도로명주소(국가명 제거)]`**로 변경 — 국가명 제거(AddressLine 거부 방지)와 순서 교정(주소 표기 관례 준수)을 함께 적용한다.

**Baker가 착수 전 `[설계 의견]`에서 확정해야 할 세부사항**(방향 자체는 위로 고정, 구현 디테일만 의견 제출):
- 국가명 제거 방식: `resolveCountryName(shipper_country_code)`로 실제 국가명을 구해 정규식 매칭할지, 하드코딩된 문자열 매칭으로 할지(이번 오더처럼 `shipper_country_code`가 빈 값인 경우의 폴백 처리 포함)
- `order.shipper_address_english`가 이미 DB에 "전체 조합 주소"로 저장돼 있다면, `label-mapping.ts`만 고쳐서는 근본 해결이 안 될 수 있음(다른 소비처 — CI/PL/Invoice PDF 등 — 는 이 필드를 그대로 "주소 표시"용으로 쓰고 있을 가능성, TASK-B-295/305/307 등 최근 영문주소 표출 관련 Task들과 충돌 여부 확인 필요) — 이 화면들도 순서를 맞출지, `label-mapping.ts`(SHXK 전송용)만 우선 고칠지
- `resolveConsigneeStreet()`도 동일 문제가 있는지 실제 데이터로 확인 후 동일한 `[상세주소, 도로명주소]` 순서로 같이 수정(범위 확대이므로 Jaison 승인 필요)
- 과설계 금지 — 전체 주소 파이프라인 재설계는 범위 밖, 위 확정 방향(순서 교정 + 국가명 제거) 안에서 구현

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-325-shxk-shipper-street-country-dup` 브랜치 생성(전용 워크트리, R-17 §0) — `./scripts/next-task-number.sh B` 재확인 + GitHub Issue 제목 검색으로 교차검증(2026-09-13 TASK-B-318 사례처럼 스크립트가 stale할 수 있음, 이번엔 확인 결과 325가 맞음)
- [ ] `[설계 의견]` 섹션 작성 후 `status:draft` 라벨 부여, Jaison 확정 대기
- [ ] (확정 후) `resolveShipperStreet()` 수정, `resolveConsigneeStreet()` 동일 위험 확인
- [ ] 회귀 테스트 신설(R-09): 실제 재현된 DEF-B-145 request_params를 fixture로 삼아 수정 전/후 `shipper_street` 결과에 국가명이 중복 포함되지 않는지 검증. mock 기반 실제 함수 호출 검증 — `toContain` 소스 문자열 검사·존재 확인 패턴 금지
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [ ] **독립 되돌리기 검증**: 수정 원복 시 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UPS 등록 시도로 "Invalid ShipFrom AddressLine3"가 더 이상 발생하지 않는지 확인 — **Sandbox 없음, 테스트 후 `removeorder`로 오더 삭제 의무**(Phase 8 제약)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-325 SHXK shipper_street 국가명 중복 포함 수정 (DEF-B-145)` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `gh issue edit 1192 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR 생성(`feature/* → TeamB_Dev`, `Closes #1192`)

## 담당자 위반 이력 사전 경고

**Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수.
- **채번 절차 누락/중복 3회** — 착수 전 `next-task-number.sh B` 실행 결과를 GitHub Issue 제목 검색으로 반드시 교차검증할 것(위 체크리스트 1번 참조).
- **stale 브랜치 재제출 4회**(3회 기준 초과 후에도 재발) — 매 Task 착수 시 로컬 워크트리를 `origin/TeamB_Dev` 최신으로 반드시 재동기화. 이전에 이미 병합된 타 Agent 커밋이 diff에 중복 포함되는 패턴이 반복됐으므로 각별히 주의.
- **vacuous test 계열 3회**(`toContain` 소스 문자열 검사 2회 + `typeof fn === 'function'` 존재확인 1회) — 이번 Task 회귀 테스트는 실제 SHXK 응답 fixture를 mock으로 사용해 `resolveShipperStreet()`/`buildCreateOrderPayload()`를 실제 호출·반환값 검증할 것, 절대 소스 문자열 검사나 함수 존재 확인으로 대체하지 말 것.
- **task file/ACTIVE_TASK 상태 전환 누락 계열 5회**(task file 완전 누락 포함) — 코드 커밋과 완료보고 문서 커밋을 반드시 분리하고, `[작업 결과]` 섹션과 상태 🔔 전환을 빠짐없이 작성할 것.
- 위 이력에도 불구하고 JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지, [[project_dave_r17_assignment_policy]] 동일 원칙 적용).

## [설계 의견]

_(담당자 작성 예정 — 착수 전 필수)_

## [설계 확정]

_(Jaison 작성 예정)_

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
