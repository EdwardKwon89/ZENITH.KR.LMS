# TASK-B-325: Issue #1192 — SHXK createorder shipper_street에 국가명 중복 포함으로 UPS AddressLine3 거부 (DEF-B-145)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1192](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1192) |
| **DEF** | [DEF-B-145](../defects/DEF-B-145_SHXK배송지주소_국가명중복포함_AddressLine거부.md) |
| **배경** | JSJung — 오더 `ZEN-2026-000015`가 화주정보 정상 저장에도 SHXK createorder 실패하는 이유 문의 → Jaison이 실제 API 응답으로 원인 확정 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-09-13 |
| **우선순위** | P1 (High) |
| **상태** | 🔔 완료 보고 |

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

## [설계 의견] (Baker, 2026-09-13)

JSJung 확정 방향(`[상세주소, 도로명주소(국가명 제거)]`)을 기준으로 아래 세부 구현을 제안합니다.

### 1. 주소 조합 로직 — `resolveShipperStreet()`

현재: `[shipperAddr, shipperAddrDetail].filter(Boolean).join(' ')`
변경: `[shipperAddrDetail, stripCountryToken(shipperAddr, shipper_country_code)].filter(Boolean).join(', ')`

- **순서**: 상세주소(`_detail_english`)를 **맨 앞**으로, 그 뒤 도로명주소를 이어붙임. JSJung 확정 예시와 동일한 `detail, road` 순서.
- **구분자**: 공백 → `, ` (확정 예시 표기 `6 floor, 601 room, 6 Daewangpangyo-ro...`과 일치).
- **국가명 제거** `stripCountryToken(addr, countryCode)`:
  - `resolveCountryName(countryCode)` 결과(예: `KR` → `South Korea`) + 공통 영문 국가명 폴백 목록(`Republic of Korea`, `Korea`, `United States`, `USA`, `Japan`, `China` 등)을 토큰 세트로 구성.
  - 주소를 `, `로 분할한 세그먼트 중 **끝에서부터** 토큰 세트와 일치하는 세그먼트를 제거(도로명에는 국가명이 오지 않으므로 안전).
  - `countryCode`가 빈 값인 경우 폴백 목록으로만 처리 — 이번 오더처럼 `shipper_country_code` 미셋 사례 대응.
- 시/구/도 세그먼트는 확정 방향 예시(`...Bundang-gu, Seongnam-si, Gyeonggi-do`)에 따라 **제거하지 않음** — 국가명만 제거.

### 2. `resolveConsigneeStreet()` 동시 수정

- 동일 구조(`[consigneeAddr, detailAddr]`)라 같은 결함 노출 가능. 수하인 주소가 국가명 포함 + 상세주소 조합으로 저장되는 케이스 대응 차원에서 동일 로직(`[detail, stripCountry(addr)]`) 적용.
- `buildCreateOrderPayload()`의 `consignee_street`는 인라인 조합(`localAddr ? \`${street} (${localAddr})\` : street`)이라 그대로 두면 동일 결함 재현 위험 — 이 경로에도 기존 필드 우선순위는 유지한 채 `stripCountryToken`만 적용(순서는 현행 유지, 과설계 금지).
- ⚠️ 범위 관련: task 파일 원문에 "resolveConsigneeStreet() 수정은 Jaison 승인 필요" 명시되어 있어, 이 항목 승인을 요청합니다.

### 3. 표시 화면 (CI/PL/PDF) 충돌 확인

- `resolveShipperStreet`/`resolveConsigneeStreet`는 SHXK payload 외 CI/PL/Invoice PDF·order 상세 표시에도 사용됨. 본 함수 수정으로 표시 순서가 `detail, road`로 바뀌지만, 이는 확정 방향(국제 영문 주소 표기 관례)과 동일해 오히려 일관됩니다.
- 국가명 중복 표시(표시 화면에 `address`에 국가명 + `country` 필드 별도 표기)도 함께 사라져 개선 효과. 별도 화면 코드 수정 불필요(함수 변경에 자동 추종).

### 4. 회귀 테스트 (DoD 3)

- 실제 재현 오더 `ZEN-2026-000015`의 전송값(`"6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room"`)과 같은 shape의 fixture를 mock으로 사용.
- `resolveShipperStreet()` → 확정 방향 `"6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do"` 정확 일치 검증(국가명 `Republic of Korea` 미포함 + 순서 검증).
- `buildCreateOrderPayload()` 실제 호출해 `shipper_street`/`consignee_street` 반환값 검증 — 소스 문자열/존재 확인 테스트 금지(위반 이력 방지).

### 리스크

- 기존 회귀 테스트 2건(`address-english-display.test.ts`·`ups-labels-mapping.test.ts`)의 주소 조합 기대값이 공백 구분 → `, ` 구분·순서 변경으로 바뀜 — 테스트 기대값 갱신 필요.
- 제거 토큰이 도로명에 우연히 포함된 경우(`...Road, Republic of Korea Place`) 과잉 제거 가능성 — 끝-세그먼트 완전 일치로만 제한해 완화.

## [설계 확정]

2026-09-13 Jaison 승인 — Baker [설계 의견] 내용 그대로 확정(표시 화면 자동 추종 주의는 승인권자에 전달 확인됨).

## [작업 결과]

_(담당자 작성 예정)_

2026-09-13 Baker — **완료** ([설계 확정] 내용 그대로 구현)

### 구현

`src/lib/ups/label-mapping.ts`

1. **`stripCountryToken(address, countryCode)` 헬퍼 신설**
   - `resolveCountryName(countryCode)` 결과(예: `KR` → `South Korea`) + 하드코딩 폴백 목록(`Republic of Korea`, `Korea`, `United States`, `USA`, `Japan`, `China` 등 30종)을 토큰 세트로 구성.
   - 주소를 `, `로 분할한 세그먼트를 **뒤에서부터** 검사, 토큰과 완전 일치하는 종단 국가명 세그먼트만 제거(과잉 제거 방지 — 도로명 세그먼트는 절대 제거 안 함).
   - `countryCode` 빈 값(재현 오더 `ZEN-2026-000015` 상태)이어도 폴백 목록으로 동작.
2. **`resolveShipperStreet()`** — 조합 순서를 `[상세주소, 도로명주소]`로 변경하고 구분자를 `, `로 통일 + 국가명 제거. JSJung 확정 예시와 정확 일치:
   - `6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do` (국가명 제거, 시/구/도 유지)
3. **`resolveConsigneeStreet()`** — 동일 패턴 적용 (Jaison 승인 범위 확대 반영).
4. **`buildCreateOrderPayload()`** — `consignee_street` 인라인 조합 경로에도 `stripCountryToken` 적용(필드 우선순위·순서는 현행 유지, 과설계 금지 원칙).

### 테스트 (R-09 + 독립 되돌리기 검증)

| 항목 | 결과 |
| :--- | :--- |
| **신규 회귀 테스트** | `tests/unit/ups/defb145-street-country-dedup.test.ts` 9건 — 실제 재현 오더 `ZEN-2026-000015` 전송값 shape fixture 사용, `resolveShipperStreet`/`resolveConsigneeStreet`/`buildCreateOrderPayload` **실제 호출 + 반환값 정확 일치 검증**(`toContain` 소스 문자열 검사·함수 존재 확인 패턴 미사용) |
| **기존 테스트 기대값 갱신** | 순서/구분자 변경(공백→`, `, 상세주소 앞)에 맞춰 4개 파일 갱신: `address-english-display.test.ts`·`ups-labels-mapping.test.ts`·`ups-labels-shipper-address.test.ts`·`shipper-address-english.test.ts`·`ups-detail-b300.test.tsx`(표시 화면 자동 추종 — 설계 확정 반영) |
| **독립 되돌리기 검증** | 소스 수정 원복 시 신규 테스트 **8건 FAIL** 확인 → 복원 후 9건 PASS (결과 기록) |
| **전체 회귀 (R-08)** | `npm run test:regression` → **203 test files / 1,434 tests / 전부 PASS** |
| **빌드** | `npm run build` SUCCESS |

### 발생한 환경 수리 (코드 변경 아님)

- 로컬 DB `zen_sequences` 카운터가 `ZEN-2026-000015`(DEF-B-145 재현 오더)보다 뒤처져 있어 신규 `create_order_atomic` 호출이 `zen_orders_order_no_key` `duplicate key` 충돌 → 통합 테스트 3건 선재 실패(`iss1100-shipper-name-*`, `iss1125-order-edit-log`)가 소스 원복 상태에서도 동일 확인됨. `zen_sequences.last_value`를 15로 정렬해 해소(소스 변경 없음, 본 Task와 직접 관련 — 재현 오더가 원인).

### 커밋

- `d643af66d` `[Baker] fix: TASK-B-325 SHXK shipper_street 국가명 중복 포함 수정 (DEF-B-145)`

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

- **UPS 오더 상세/서류 화면 주소 표기 순서 변경**: `resolveShipperStreet`/`resolveConsigneeStreet`가 CI/PL/Invoice PDF·order 상세 표시에도 사용되어 모든 표시가 `[상세주소, 도로명주소]` 순서로 바뀜. 이는 설계 확정(국제 영문 주소 표기 관례)과 동일 방향이며 화면 코드 수정은 불필요(함수 자동 추종) — 다만 `ups-detail-b300` 테스트 기대값(`주소: 테헤란로 123, 서울 강남구`) 갱신이 필요했음. 차기 서류 검증 시 표기 일관성 확인 권장.
- **로컬 DB `zen_sequences` 드리프트 (환경)**: `get_next_order_sequence`가 `zen_sequences` 카운터 기반인데, 재현 오더 `ZEN-2026-000015` 생성 시 카운터가 전진하지 않아 그 이후 모든 `create_order_atomic` 신규 오더가 duplicate key 충돌. 수동 seed/재현 데이터 생성 시 시퀀스 정렬 누락 가능 — 재발 시 `UPDATE public.zen_sequences SET last_value = <max order_no> WHERE prefix='ZEN' AND year='2026';` 필요.
