# TASK-B-346: SHXK createorder consignee 전체 매핑 재점검 — PR① `'E2E Consignee'` 폴백 제거

**상태:** 🔔 검토대기
**담당:** Baker (Team B)
**배정 이슈:** #1278
**브랜치:** feature/teamb-task-b346-iss1278-consignee-pr1-name-fallback
**베이스:** origin/TeamB_Dev
**생성일:** 2026-11-12

## 목표
SHXK createorder payload의 `consignee.consignee_name`에 남아 있던 테스트용 폴백 `'E2E Consignee'`를 제거한다.
수취인 성명(`recipient_name`)이 비어 있으면 가짜 이름을 전송하지 않고, `validateShxkPayload()`의 기존 `'수취인 성명 누락'` 사전검증이 SHXK 호출 전에 차단하도록 만든다.

> JSJung 2026-11-12 확정: "`consignee_name` ← `recipient_name`(수취인 성명) 매핑 고정, 기본값(폴백) 없음. `'E2E Consignee'` 폴백은 제거."

## 범위 (이 Task = PR① 만)
- 포함: 폴백 제거 + 폴백 의존 테스트 갱신 + 사전검증 차단 증명 테스트 + 회귀맵 갱신
- **제외**: 수하인 회사명 입력란(`recipient_company`) 전 계층 구현 = PR② (PR① 병합 후 별도 브랜치), consignee 잔여 필드 감사 = PR③ (별도 지시)

## DoD
- [x] `src/lib/ups/label-mapping.ts` `buildCreateOrderPayload()`의 `consignee_name` 폴백 제거 — `(order.recipient_name as string) || ''`
- [x] `recipient_name: ''` 로 생성한 payload를 `validateShxkPayload()`에 통과시키면 `errors` 배열이 `['수취인 성명 누락']` 과 일치(`toEqual` 단언, vacuous 단언 금지)
- [x] `grep -rn "E2E Consignee" src tests` 결과 0건 (빌드 산출물 `.next/` 는 gitignore 제외)
- [x] `npm run test:regression` 전체 PASS (Test Files 236 / Tests 1689)
- [x] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 회귀맵에 §77 추가
- [x] R-17 절차 준수: 코드 커밋 → task file `[작업 결과]` → `status:review` → `check-R17-DoD` → 문서 커밋 → PR(`base=TeamB_Dev`, `Closes #1278`)

## 전제 / 주의
- 선행 조건 없음 (PR② 만 Ds-11 명세 선갱신 필요)
- `.agent/ACTIVE_TASK.md`·`scratch/IMP_PROGRESS.md` 는 폐지 파일 — 수정 금지
- SHXK 외부 HTTP 호출은 이 Task에서 발생하지 않음(순수 함수 + 사전검증 단위 테스트만)

## [작업 결과]
- **코드 커밋:** `26181fbdd` (`[Baker] fix: TASK-B-346 SHXK consignee_name 테스트용 폴백 제거 (Issue #1278 PR①)`) — 3 files changed, 51 insertions(+), 5 deletions(-)
  - `src/lib/ups/label-mapping.ts`: `consignee_name: (order.recipient_name as string) || 'E2E Consignee'` → `|| ''` (폴백 제거, 주석으로 차단 경로 명시)
  - `tests/unit/ups/ups-labels-mapping.test.ts`: 기존 폴백 기대 테스트 1건 제거 → `TASK-B-346` 중첩 describe 3건 신규 (빈 성명 → `''` / `validateShxkPayload` `toEqual(['수취인 성명 누락'])` / 정상 성명 → `toEqual([])`)
  - `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`: 회귀맵 **§77** (TC-346-1/2/3/GREP/RST) 추가
- **rebase:** 착수 후 `origin/TeamB_Dev`가 PR #1282(TASK-B-345, shipper_company 미전송)로 전진 → `git rebase origin/TeamB_Dev` 수행. 회귀맵 §76 충돌은 TASK-B-345 섹션을 §76으로 유지하고 본 Task를 **§77로 재번호**하여 해소. `label-mapping.ts`·`ups-labels-mapping.test.ts`는 자동 병합(충돌 없음). 최종 코드 커밋 해시는 rebase 후 값 `26181fbdd`.
- **폴백 잔존 점검:** `grep -rn "E2E Consignee" src tests` → 0건 (exit 1)
- **회귀 테스트 (rebase 후 최종 head 기준):** `npm run test:regression` → **Test Files 236 passed (236) / Tests 1689 passed (1689)**, Duration 411.74s
- **빌드 (rebase 후):** `npm run build` → **EXIT=0** (TypeScript 오류 0건, 라우트 테이블 정상 출력)
- **되돌리기 검증:** `consignee_name` 폴백을 `'E2E Consignee'`로 원복 후 해당 테스트 파일 재실행 → **2 failed / 40 passed**
  - `expected 'E2E Consignee' to be '' // Object.is equality`
  - `expected [] to deeply equal [ '수취인 성명 누락' ]`
  - 원복 후 재적용 → 42 passed 확인
- **vacuous 단언 점검:** 신규 테스트에 `toContain(`·`typeof`·`.toBeDefined()` 단독 단언 없음 (`toEqual`/`toBe`만 사용)

## [발견 이슈]
없음

## R-17 체크리스트
- [x] 코드 커밋 (`26181fbdd` — 코드·테스트·회귀맵만, task file 미포함)
- [x] task file `[작업 결과]` 작성 (실제 커밋 해시 기재)
- [x] GitHub Issue 라벨 `status:review` 전환
- [x] `check-R17-DoD` 전항목 통과
- [x] 문서 커밋 (task file만)
- [x] PR 생성 (`base=TeamB_Dev`, `Closes #1278`)
- [x] `gh pr checks <PR번호>` 실제 출력 보고 (이전 커밋 결과 인용 금지)

