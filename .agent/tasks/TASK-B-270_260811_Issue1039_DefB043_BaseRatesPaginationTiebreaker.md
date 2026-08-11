# TASK-B-270: Issue #1039 / DEF-B-043 — UPS 기준요금 페이지네이션 tiebreaker 부재로 행 중복/누락 (PR#1036 후속 회귀)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1039](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1039) |
| **DEF** | [DEF-B-043](../defects/DEF-B-043_UPS기준요금_페이지네이션_tiebreaker없어_행_중복누락.md) |
| **배경** | JSJung이 "master air"로 Expedited 12kg 행에서 Zone5 이후 미표출 보고 → Jaison이 Playwright+브라우저 콘솔 계측으로 원인 확정. PR#1036(TASK-B-268)에서 도입된 `fetchAllRows` 페이지네이션의 후속 회귀 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1** |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 근본 원인 (Issue #1039 / DEF-B-043 참조 — 재현 완료)

`src/lib/ups/paginate-all.ts`의 `fetchAllRows()`가 `.range(from, to)`로 나눠 여러 REST 요청을 보내 병합. 호출부 2곳(`src/app/actions/ups/rates-public.ts`의 `getPublicBaseRates()`, `src/app/actions/ups/rates.ts`의 `getUpsBaseRates()`) 둘 다 `.order('weight_kg')`만 사용하고 **동률(tie-breaker) 컬럼이 없음**.

`zen_ups_base_rates`는 동일 `weight_kg`을 가진 행이 매우 많음(중량당 최대 10개 Zone). PostgREST의 두 페이지 요청은 **별도 HTTP 요청 = 별도 쿼리 실행**이라, 동일 `weight_kg` 그룹 내 행들의 상대 순서가 두 요청 간 항상 동일하다는 보장이 없음(Postgres 내부 비결정성 — 병렬 워커 스캔 순서 등). 결과적으로 페이지 경계에 걸친 동률 그룹에서 일부 행이 양쪽에 중복 포함되거나 양쪽 모두에서 누락됨. 전체 행 수(1,560)는 중복=누락 건수라 우연히 맞아떨어져 겉보기엔 정상이지만, 실제로는 매번 다른 행이 사라질 수 있는 **비결정적 버그**.

**실측**: 브라우저 콘솔 계측으로 재현 — `matrixRates.length=1560`(정상)인데 `uniqueIds=1544`(16개 중복), Expedited @ 12kg에서 Zone5~10(6개) 완전 누락 확인. 반면 raw REST 직접 반복 호출(3회)에서는 매번 우연히 중복/누락 0건이었음 — 간헐적으로만 발생.

**[중요] PR#1036 리뷰 방법의 한계**: 당시 Jaison이 psql 세션 내 순차 쿼리로 페이지 경계 무결성을 검증했으나, 이는 실제 프로덕션 경로(PostgREST를 통한 별도 HTTP 요청 2회)와 다른 검증 방법이었음 — 검증 자체가 불충분했던 리뷰 실수. 이번 Task 완료 시 반드시 **실제 REST 엔드포인트를 통한 별도 HTTP 요청 반복**으로 되돌리기 검증할 것(psql 세션 내 검증으로 대체 금지).

## 수정 방향 (설계 확정 — 착수 승인)

1. `getPublicBaseRates()`(`rates-public.ts`)와 `getUpsBaseRates()`(`rates.ts`) 양쪽의 `.order('weight_kg')`에 **`.order('id')` 2차 정렬 추가**:
   ```ts
   .order('weight_kg')
   .order('id')   // 신규 — 동률 시 결정적 순서 보장, id는 UUID PK라 유일성 보장
   .range(from, to)
   ```
2. **화면 구조·타입 변경 없음** — 정렬 조건 한 줄만 추가하는 최소 침습 수정.
3. Jaison이 이미 직접 검증 완료: `order=weight_kg.asc,id.asc`로 실제 REST 반복 호출(3회) 시 매번 중복/누락 0건 확인.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-270-base-rates-pagination-tiebreaker` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-270 확인
- [ ] `getPublicBaseRates()`/`getUpsBaseRates()` 양쪽에 `.order('id')` 2차 정렬 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - mock에서 동일 `weight_kg`을 가진 행이 페이지 경계(예: 999~1013 인덱스)에 걸치는 시나리오를 구성해, `.order()` 호출 체인에 `weight_kg`뿐 아니라 `id` 2차 정렬이 실제로 포함되는지 검증(behavioral, `.order` 호출 인자 캡처)
  - **되돌리기 검증 필수** — `id` tiebreaker 제거 시 mock 시나리오에서 중복/누락이 실제로 재현되는지 확인
  - **[필수, psql 세션 검증 금지]** 실 DB(현재 1,560행, weight_kg 동률 다수)에서 **실제 REST API 엔드포인트로 별도 HTTP 요청을 최소 5회 반복** — 매회 `.range(0,999)`+`.range(1000,1999)` 두 요청의 병합 결과가 정확히 1,560개 unique id인지 확인(curl 또는 fetch 스크립트로 자동화 권장). 간헐적 버그라 1회 테스트로는 불충분.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `/agency/ups-rates`에서 Expedited 12kg 행 Zone1~10 전부 표시되는지 확인, 스크린샷 첨부. 가능하면 페이지 여러 번 새로고침(5회+)해서 매번 정상 표시되는지 확인(간헐적 버그 특성 고려)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-270 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1039 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1039`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-268(동일 파일 `paginate-all.ts`/`rates.ts`/`rates-public.ts` 원작업자)은 절차 정확히 준수 완료 — 본인이 만든 페이지네이션 로직의 후속 결함이므로 코드 맥락 숙지도가 높을 것으로 기대, 동일 수준 기대.

## [작업 결과]

**작성자**: Dave | **작성일**: 2026-08-11 | **상태**: 🔔 (검토 요청)

### 구현 (코드 커밋 `841b7e04`)

- `src/app/actions/ups/rates-public.ts` — `getPublicBaseRates()`의 `.order('weight_kg')`에 `.order('id')` 2차 정렬 추가
- `src/app/actions/ups/rates.ts` — `getUpsBaseRates()` 동일 적용 (productId/zoneId 필터 분기 후 공통 체인)
- `id`는 UUID PK로 유일성 보장 → 동일 `weight_kg` 그룹(중량당 최대 10 Zone) 내 결정적 순서 확보
- 화면 구조·타입 변경 없음 — 정렬 조건 1줄 추가만 하는 최소 침습 수정

### 회귀 테스트 (코드 커밋 — 3건 신설)

- `rates-actions.test.ts` — **TC-UPS-R-TIE-01/02**: `getUpsBaseRates`가 `weight_kg` 정렬 후 `id` 정렬을 순서대로 호출하는지(behavioral, `.order` 호출 인자 캡처) + productId 필터 시에도 유지
- `rates-public-pagination.test.ts` — **TC-UPS-R-PUBLIC-TIE-01**: `getPublicBaseRates` 동일 정렬 순서 검증

**되돌리기 검증 (2건)**
1. **단위**: `id` tiebreaker 제거 시 TC-UPS-R-TIE-01/02 + TC-UPS-R-PUBLIC-TIE-01 **3건 FAIL** 확인 후 복원
2. **실 REST API 반복 (psql 세션 아님, 체크리스트 요구 준수)**: Supabase REST 엔드포인트로 `.range(0,999)`+`.range(1000,1999)` 별도 HTTP 요청 반복
   - tiebreaker **없이** 30회 실행 → **16 dup + 16 miss 재현** (브라우저 실측과 동일 수치 16/16) — 비결정적 버그 확인
   - tiebreaker **적용 후** 30회 실행 → 전부 **0 dup / 0 miss** PASS

### 검증 수치

- 전체 회귀: `npm run test:regression` — **1106/1106 PASS** (158 파일)
- `npm run build` — Compiled successfully (14.1s)

### R-10 실브라우저 검증 (문서 커밋, 스크린샷 `docs/99_Manual/E2E_270_Result/`)

- AGENCY 역할 계정(`r10_agency_270@zenith.kr`) 실제 로그인 → `/ko/agency/ups-rates`
- "UPS WorldWide Express Expedited"(WW_EXPEDITED) 선택 → **12kg 행에서 Zone 셀 10개(Zone1~10) 전부 표시**
- **새로고침 5회 반복 모두 10개 확인** (간헐적 버그 특성 고려) — 각 run 스크린샷 5장
- 매트릭스 요약: "총 1560건 기준요금" 정상

### R-17 DoD 체크리스트

- [x] 코드 커밋 (`841b7e04`) — 두 함수 `.order('id')` + 테스트 3건
- [x] 문서 커밋 — R-10 증적
- [x] 회귀 1106/1106 PASS / build SUCCESS
- [x] R-10 실브라우저 (Expedited 12kg Zone1~10 × 5회)
- [x] 되돌리기 검증 2건 (단위 3건 FAIL + 실 REST 16dup/16miss 재현 → 적용 시 30회 0건)

## [발견 이슈]

없음


## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
