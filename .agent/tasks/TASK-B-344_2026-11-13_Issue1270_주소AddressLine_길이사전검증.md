# TASK-B-344 — UPS/SHXK 주소 AddressLine 길이 사전검증 (#1268 분리)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1270](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1270) |
| 담당 | Mike (Team B) |
| 브랜치 | `feature/teamb-task-b344-iss1270-address-length-validation` (base: `origin/TeamB_Dev`) |
| 배정 | 2026-11-13, JSJung (배정 코멘트 기준, TASK-B-344 지정) |
| 예상 공수 | 2~3h |
| 선행 | #1268(TASK-B-343) 머지 완료 ✔ |
| 한도 확정 | Jaison(배정 코멘트): `SHIPPER_STREET_MAX=70` / `CONSIGNEE_STREET_MAX=105`(가정, 주석 명시) |

## [목표]

UPS/SHXK로 나가는 `shipper_street`·`consignee_street`가 UPS AddressLine 한도를 넘으면, **SHXK 호출 이전에** 명확한 한글 오류로 차단한다 (현재는 `Invalid ShipFrom AddressLine3` UPS 거부로 늦게 드러남 — DEF-B-145/146).

1. `shxk-limits.ts`에 상수 2개 추가(한 줄씩, 근거 주석).
2. `validateShxkPayload()`에서 **최종 전송 payload**의 street 길이 검사(`checkPhone` 패턴小型 헬퍼, 함수 50줄 이하).
3. zod/폼 검증은 **추가하지 않음**(조립 후 길이만 확정 — 필요 시 [발견 이슈]에 제안).
4. 테스트: 경계(70/71·105/106) + DEF-B-146 실측 fixture(87/58/49자) + `buildCreateOrderPayload`→`validateShxkPayload` 통합1건 + 되돌리기 검증.

## [DoD]

- [x] 상수 `SHIPPER_STREET_MAX=70`·`CONSIGNEE_STREET_MAX=105` 추가 — 근거: `src/lib/validation/shxk-limits.ts:22-23`, 근거 주석 `:12-15`(ShipFrom 실측49/58 성공·87 실패 / ShipTo3줄×35 **가정**·실패 실측 없음, Jaison 확정2026-11-13 잠정값 명시)
- [x] 검증 헬퍼·`validateShxkPayload` 통합 — 근거: `src/lib/shxk/validate-payload.ts:36`(checkStreetLength 헬퍼) + `:53`(발송인)·`:62`(수취인, `else` 분기로 빈값은 누락 검사만 처리→중복 없음). 함수 전체47줄(≤50 유지, `awk` 실측)
- [x] 경계 테스트 — 근거: `tests/unit/shxk/task-b344-address-line-length.test.ts` TC-344-1(`:41`70자 `toEqual([])` / `:47`71자 오류 `toEqual`), TC-344-2(`:55`105자 통과 / `:61`106자 오류) — 전건 `validateShxkPayload` 실제 호출 반환값 단언
- [x] 실측 fixture — 근거: TC-344-3(`:69-97`) — DEF-B-146 문자열 원문 복사, **실제 `.length`87/58/49 를 `toBe`로 고정**(문서 표기88/61 아님, 파이썬 검산 일치),87자 shipper 차단·58/49 통과·87자 consignee 통과(105 잠정값 비차단 고정)
- [x] 통합 `buildCreateOrderPayload`→`validateShxkPayload` — 근거: TC-344-5(`:153` 한도 초과 시 발송인→수취인 순서 `toEqual` + 조립 후 길이 `toBeGreaterThan`로 고정 / `:171` 한도 이내·쉼표 제거 반영 `toEqual([])`)
- [x] 되돌리기 검증 — `checkStreetLength` 호출2줄 제거 → **4 failed / 11 passed**(71자·106자·87자·통합 FAIL) → 복구 후 **15/15 PASS**. (※ 미커밋 파일이라 `git checkout`이 HEAD까지 되돌린 뒤4곳 편집 재적용 후 재확인 — 최종 diff는 무변경 범위 유지)
- [x] `placeShxkOrder` logger 확인 — **추가 전: 오류 반환 분기(`ups-labels.ts:261-264`)에 logger 호출 없음(로그 미기록)** → 지시된 해당 분기에 `logger.warn` **1줄**만 추가 `:262` (그 외 `ups-labels.ts` 수정 없음 — diff +1줄)
- [x] `validateShxkPayload` 호출처 전수 — `grep -rn "validateShxkPayload" src`: 실사용 **1곳** `ups-labels.ts:260`(import `:12`), 정의 `validate-payload.ts:33`, 주석 `label-mapping.ts:169`. **GitNexus는 세션 도구 목록에 없어 불가** — grep/직접 Read로 대체
- [x] 핵심 지점 실시간 알림 판정 — 아래 "알림 판정" 기재 (의도적 판단)
- [x] `npm run test:regression` 전체 PASS — **Test Files 239 passed (239) / Tests 1734 passed (1734)** (487초, `check-db-freshness.sh` OK 선행)
- [x] `LIVE_REGRESSION_TEST_MAP.md` **§80** 등재 — 근거: `:1133` + 헤더 갱신(1,734/239) (R-09)
- [x] `git diff origin/TeamB_Dev --stat` 범위 대조 — `shxk-limits.ts(+7)`·`validate-payload.ts(+15/-1)`·`ups-labels.ts(+1)`·회귀맵(+20/-2) + untracked 테스트·task file **뿐, 무관 파일0건**
- [x] 발견 범위 밖 결함 → DEF — **결함 없음(DEF 미생성)**. 단 제안1건은 [발견 이슈] 기재(구현하지 않음)

## [작업 결과]

### 코드 커밋
- 코드 커밋: `fa34ec7b86f2ae747cd31808585641f8d25f11ba`

### 구현 요약

1. **상수** `shxk-limits.ts:22-23` — `SHIPPER_STREET_MAX=70`(ShipFrom2줄×35, 실측과 모순 없음) / `CONSIGNEE_STREET_MAX=105`(ShipTo3줄×35 **가정** — 주석에 "가정·잠정값" 명시). 헤더 `:12-15`에 근거 명기.
2. **검증** `validate-payload.ts` — `checkStreetLength()` 헬퍼(`:36`, checkPhone 패턴·문구 `발송인/수취인 주소가 너무 깁니다(현재 N자, 최대 M자) — 상세주소를 줄여 주세요`), street 누락 검사와 `else` 연결(`:53/:62`)로 **빈값 중복 오류 없음**. 길이는 **조립·쉼표 치환 후 최종 전송 문자열 `.length`**.
3. **관측성** `ups-labels.ts:262` — 사전검증 실패 분기에 `logger.warn`1줄(추가 전 미기록 확인).
4. **zod/폼 검증은 지시대로 미추가** (최종 길이는 SHXK 호출 시점에 확정되므로).

### 알림 판정 (CLAUDE.md 핵심 지점4기준 — 의도적 판단 기재)

| 기준 | 판정 | 근거 |
|:--|:--|:--|
| ① 금전적 영향 | 미해당 | 검증 실패는 라벨 발급 차단이며 금액 계산·청구 직접 영향 없음 |
| ② 외부 SLA/고객 접점 | 흡수 | 라벨 발급 실패는 접점이나 **호출 전 한글 메시지로 화면에 즉시 전달**(placeShxkOrder 반환→사용자 화면) |
| ③ 침묵성 | **미해당** | 반환값 기반 실패가 즉시 화면 표시 — 조용히 넘어가지 않음 |
| ④ 과거 사사 | 흡수 | DEF-B-145/146의 "SHXK 호출 후 늦은 실패"가 본 검증으로 호출 전 차단됨 |

→ **2개 이상 충족 없음 → `logger.warn` 로깅만으로 충분.** 누락이 아닌 의도적 판단임을 기재.

### 회귀 검증 (R-08)

- `check-db-freshness.sh` → `OK — pending 마이그레이션 없음` (R-08-2)
- `npm run test:regression` → **Test Files 239 passed (239) / Tests 1734 passed (1734)** (2026-11-13, 487초)
- 되돌리기: **4 failed / 11 passed** → 복구 후 **15/15 PASS**

### check-R17-DoD 실행 결과

- **`check-R17-DoD` 명령은 본 환경에 없다** — 해당 이름은 OpenCode 커맨드(프롬프트 템플릿)로, 셸에서 실행 가능한 명령이 아님(지시의 "환경에 없으면 없다고 기재" 조항 적용).
- **수동 대조 결과**: 코드 커밋(`fa34ec7b8…`) → task file `[작업 결과]`+해시 → 라벨 `status:review` → (본 문서 커밋) → PR 순서 유지, DoD 전 항목 근거(파일:줄·테스트명) 기재, 플레이스홀더/미체크 0건, PR body에 DoD 체크리스트 예정.

### 비고

- GitNexus: 세션 도구 목록에 없어 **불가** — 호출처·영향도는 `grep -rn`/직접 Read로 전수 확인(위 DoD 참조). src 수정은3파일·심볼 신규1개(checkStreetLength)·기존 함수 시그니처 변경0건.
- 화면 변경 없음(검증 로직+로그 한정) → R-10 스크린샷 대상 아님 — 회귀 PASS + diff 정합으로 검증(2026-07-14 결정).

## [발견 이슈]

**결함: 없음** (DEF 미생성)

> **제안 (비결함, 후속 판단은 Jaison)**: 현 검증은 라벨 발급 시점(`placeShxkOrder`)에 개입하므로, 오더 등록 시점에는 길이 초과를 조기 안내할 수 없다. 등록 폼 단계의 UX 사전 안내가 필요해지면 별도 Task로 — 다만 폼 입력만으로는 조립 후 최길이를 확정할 수 없어(도로명 추출·현지어 병기·쉼표 치환) "최대 N자" 근사 안내가 필요하므로 범위 재검토가 전제.
