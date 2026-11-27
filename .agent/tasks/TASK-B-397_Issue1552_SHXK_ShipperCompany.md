# TASK-B-397 (Issue #1552) — SHXK `createorder` 발송인 회사명 재전송 (DEF-B-172)

| 항목 | 내용 |
|:--|:--|
| **Issue / DEF** | [#1552](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1552) / `DEF-B-172` |
| **Worker / Auditor** | Baker(구현·보고) / Jaison(검증·병합) |
| **우선순위** | p1 (운영 UPS 오더 등록 차단) |
| **착수 근거** | Jaison 2026-11-27 09:39 KST 배정 코멘트(값은 환경변수, 전 경로 전송) |
| **채번 정정** | Jaison 09:50 KST 지시로 `TASK-B-394` → `TASK-B-397`. `./scripts/next-task-number.sh B`는 현재 브랜치에서 B-396을 반환했으나 `origin/TeamB_Dev` 기준 원격 브랜치 `feature/teamb-task-b396-iss1451-…`(PR #1557)가 이미 B-396 사용 중 → B-397 확정. 브랜치·task file·신규 테스트 파일명·DEF 보고서·회귀 항목·IMP 이슈 본문에 반영 |
| **범위** | `TeamB_Dev` 임 PR까지. 운영 DB·운영 환경변수·배포는 범위 밖(R-14) |

## [목표·결정]

1. JSJung 결정에 따라 **모든 SHXK 서비스 코드**에서 `shipper_company`를 다시 전송한다. TASK-B-345(#1277)의 "키 자체 미전송"은 번복한다.
2. 값은 소스에 적지 않고 신규 환경변수 `SHXK_SHIPPER_COMPANY`에서 읽는다. 미설정 시 빈 값 전송을 막기 위해 기존 `SHXK_SHIPPER_NAME` 값으로 대체하고 `logger.warn`으로 설정 누락을 남긴다.
3. 발송인 구성 2경로(`placeShxkOrder`, `previewShxkPayload`)와 순수 매핑(`buildCreateOrderPayload`)에 동일 계약을 적용한다.
4. `FXUPS`는 이 필드를 실제 서버가 필수 검증한다는 근거 주석을 남긴다(DEF-B-054 실측, #1552).
5. 실제 SHXK 호출은 Jaison의 조건부 승인 범위에서만 1회 실행하고, 조건 미충족 시 미실행 사유를 보고한다.

## [TASK-B-345 번복 근거]

- **원래 결정(2026-11-12, JSJung)**: SHXK 명세상 `shipper_company`가 선택 필드라서 키 자체를 보내지 않음(TASK-B-345 / #1277 / PR #1282).
- **반증(DEF-B-054 실측, #1067)**: 같은 거절 문구가 `shipping_method: FXUPS`에서 확인됨. 명세와 달리 실제 서버는 이 경로에서 발송인 회사명을 필수 검증한다. `PK0035` 경로에서는 미발현だった 경로 의존 결함이다.
- **재발(DEF-B-172 / #1552)**: B-345 상태가 그대로 배포된 뒤 운영 `createorder`가 동일 사유로 거절됐다. 사전검증(`validate-payload.ts`)에는 이 필드 검사가 없어 키 누락이 SHXK 호출까지 통과했다.
- **현 결정(2026-11-26~27, JSJung/Jaison)**: 명세의 선택 표기보다 실서버 검증을 우선해 **전 경로 재전송**으로 번복한다. 값은 코드에 적지 않고 환경변수로만 주입한다(R-21).

## [DoD]

- [x] R-18 DEF 보고서 채번·작성(값·계정·식별자 0) — `DEF-B-172`
- [x] `config.ts` 환경변수 추가 + 미설정 폴백·warn
- [x] `label-mapping.ts`·`ups-labels.ts` 2경로에 `shipper_company` 전송
- [x] 기존 30개 `not.toHaveProperty` 단언을 키 존재·값 단언으로 전환(5개 파일)
- [x] 신규 테스트: 환경변수 설정값 전송 / 미설정 폴백+warn / `FXUPS` 경로
- [x] 수정 전 코드에서 신규 테스트 실패 확인(3/3 FAIL → 구현 후 3/3 PASS)
- [x] Ds-11 payload 계약 갱신(같은 PR) + 회귀 항목 파일 등재 + `check:lrtm`/`check:ds11` OK
- [x] IMP 건의 Issue 1건 — [#1560](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1560) (`type:imp,team:b,priority:p3,status:open`)
- [x] `npm run test:regression` 전체 PASS — 312/313 파일, 2357/2373 테스트 (exit 0)
- [x] R-21 점검(값·계정·경로·오더번호 0), 라벨 `status:review`, 병합은 Jaison
  - `gh pr checks` verbatim 인용 — PR 생성 후 #1552 최종 보고(`issuecomment-7207478702`)와 아래 [CI 인용]에 기재 완료.

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:--|:--|:--|:--|
| DEF-B-172 | SHXK `createorder` 발송인 회사명 누락 거절 재발 (B-345 번복 여파) | High | `.agent/defects/DEF-B-172_SHXK_createorder_shipper_company_재발.md` |

## [작업 결과]

| 항목 | 결과 |
|:--|:--|
| 코드 커밋 | `60e48f5872b4216757dcb044ea50686e31e626ae` — `[Baker] feat: TASK-B-397 SHXK createorder shipper_company 환경변수 재전송 (Refs #1552, DEF-B-172)` (33 files, +297/−131) |
| 구현 | `config.ts`: `SHXK_SHIPPER_COMPANY` 주입·미설정 시 `SHXK_SHIPPER_NAME` 대체 + `logger.warn` 1회. `label-mapping.ts`: `shipperDefaults.company?` 추가(기존 호출자 호환) + `shipper_company` 항상 매핑. `ups-labels.ts`: `placeShxkOrder()`·`previewShxkPayload()` 2경로에 환경변수 값 주입 |
| 단언 전환 | 5개 파일 30개 `not.toHaveProperty('shipper_company')` → `toHaveProperty('shipper_company', 'TEST SHIPPER CO')` (더미 값) |
| 신규 테스트 | `tests/unit/shxk/task-b397-shipper-company-env.test.ts` 3건 — 설정값 그대로 전송 / 미설정 폴백 + warn 1회 / `FXUPS` payload 값 단언 |
| 되돌리기 검증 | 구현 전 신규 3건 **3/3 FAIL**(config export 2건 + payload 키 누락 1건) → 구현 후 **3/3 PASS** |
| 대상 테스트 | 관련 6개 파일 **78/78 PASS**; 실패 수정 후 3개 파일 **44/44 PASS** |
| 전체 회귀 | `npm run test:regression` **exit 0** — `Test Files 312 passed | 1 skipped (313)`, `Tests 2357 passed | 16 skipped (2373)`, `Duration 727.53s` |
| 정적·동기화 | `npx tsc --noEmit` 변경 파일 신규 오류 0건(기존 advisory 오류는 범위 외). `check:lrtm` OK(313 / 등재 215 / 허용 98 / 유령 0), `check:ds11` OK(305 / 미반영 123 / 허용 123, baseline 125→123 축소) |
| R-21 | 추가 줄·신규 파일 스캔에서 민감 값·계정·키·절대경로·운영 식별자 **0건**. 테스트는 `TEST SHIPPER CO` 더미만 사용 |
| 에러 로그 확인 | 無 — 로컬 전체 회귀에서 신규 오류 0. 운영 `/admin/error-logs`는 R-14 및 Jaison의 "운영 DB·호출 일체 범위 밖" 지시로 미열람 |
| 실경로 SHXK 호출 | **미실행** — 지시 6의 전제("요청 본문의 오더·화주 식별 값이 테스트용임을 확인")를 충족할 픽스처·확인 절차가 없어 `createorder` 1회도 보내지 않음. 계정·키·값·오더 식별자를 로컬 환경변수 외에 기록하지 않았으며, 삭제 확인 대상 오더도 생성되지 않음. 추가 승인 요청 없이 사유만 보고 |

### 회귀 실패 경위(최종 PASS까지)

1. **1차**(수정 전 시작분, 중단): `task-b395-ups-labels-logging.test.ts` 2건 — `vi.mock('@/lib/shxk/config')`에 `SHXK_SHIPPER_COMPANY` 미정의. 22개 config mock에 더미 값 추가.
2. **2차**(`/tmp/b397-regression.log`, exit 1): ① `agency-warehouse-scoping.test.ts`·`ups-pickup-inbound.test.ts` 2개 suite — logger mock에 `warn` 부재로 `config.ts` 모듈 로드 시 `TypeError`. 두 mock에 `warn: vi.fn()` 추가. ② `ups-trade-documents.test.ts` 1건 — `shipperDefaults` 시그니처 문자열 단언이 구 계약을 기대. 새 계약 + `shipper_company` 매핑 단언으로 갱신.
3. **3차**(`/tmp/b397-regression2.log`, exit 0): 전체 PASS(위 표).

### 자가 검증·절차 메모

- `check-R17-DoD` 실행 파일이 이 워크트리 PATH에 없어(`command -v` 미검출) **명령 실행 불가** → R-17 DoD 항목을 수동 동치 점검(전 항목 체크·`TBD`/빈 값 0·커밋 해시 기재)으로 대체했으며, PR diff 포함 여부는 PR 생성 시 확인한다. 스크립트 미설치 환경 정비는 Jaison 확인 필요.
- 채번 근거: `./scripts/next-task-number.sh B`를 현재 브랜치에서 재실행해 B-396을 확인했으나, `origin/TeamB_Dev` 기준 원격 브랜치(PR #1557)가 B-396 사용 중 → Jaison 지시대로 **B-397** 확정(09:50 정정 코멘트 반영).
- PR: **#1561**(`feature/teamb-task-b397-iss1552-shxk-shipper-company` → `TeamB_Dev`), 본문 `Refs #1552`만 기재(`Closes` 미사용). PR diff 추가 줄 R-21 스캔 0건 확인. 병합·✅ 전환은 Jaison/Aiden 권한이며 본 에이전트는 수행하지 않는다.
- #1552 최종 보고: `issuecomment-7207478702` (지시 1~8번 항목별 회신 포함).

### [CI 인용] — verbatim (2026-11-27 10:39:31 KST)

```
$ date
Fri Nov 27 10:39:31 KST 2026

$ gh pr checks 1561
Dependency Audit (advisory, non-blocking)	pass	11s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463733	
Docs Sync Check (advisory, non-blocking)	pass	9s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463718	
Evidence Escape Check (advisory, non-blocking)	pass	10s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463472	
LRTM Sync Check (advisory, non-blocking)	pass	15s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463834	
Regression Tests	pass	12m42s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463759	
Task File Check (advisory, non-blocking)	pass	10s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463694	
Type Check (advisory, non-blocking)	pass	1m8s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463725	
Vendor Integrity (advisory, non-blocking)	pass	11s	https://github.com/EdwardKwon89/ZENITH.KR.LMS/actions/runs/45922574362/job/140256463722	
```
