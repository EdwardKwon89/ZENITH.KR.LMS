# [TASK-B-361] 청구서관리 ④ 화면 — S3 목록·S4 생성·S5 상세·3경로 재사용 (Issue #1367)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-361 / [#1367](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1367) |
| **팀 / 작성일** | Team B / 2026-11-22 |
| **대상 모듈 (231 연동)** | `src/components/finance/statements/*`, `src/app/[locale]/(dashboard)/{finance,agency,shipper}/statements/*`, `messages/{ko,en,zh,ja}.json` |
| **검증 차원 (231 D1~D9)** | D1(업무 분기), D3-A(권한 라우팅·앱), D5(상태 전이), D9(UI·i18n) |

> ⒜ PR(`Refs #1367`) 범위. ⒝ PR(`Closes #1367`)에서 메뉴·경로 허용 목록·Excel 링크·R-10 역할별 스크린샷을 추가한다.

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-361-01 | 내 청구 DRAFT 행 렌더 | `보기`·`취소` 렌더, `입금확인` 미렌더, `내 청구`·`초안` 배지 | `tests/unit/components/statements/statements-list.test.tsx` | CI (vitest) |
| TC-361-02 | 내 청구 ISSUED 행 렌더 | `입금확인` 렌더, `취소` 미렌더, `발행` 배지 | 동일 | CI (vitest) |
| TC-361-03 | 나에게 청구된(읽기 전용) 행 렌더 | 변형 버튼 없이 `보기`만, 생성 링크 미렌더 | 동일 | CI (vitest) |
| TC-361-04 | Admin 감독 조회 DRAFT 행 렌더 | DRAFT가 조회되되 `취소`·`입금확인` 미렌더 | 동일 | CI (vitest) |
| TC-361-05 | 조회 범위 필터 | `감독 조회` 선택 시 감독 행만 잔류 | 동일 | CI (vitest) |
| TC-361-06 | 생성 버튼 노출 | `canCreate` true일 때만 `/new` 링크 렌더 | 동일 | CI (vitest) |
| TC-361-07 | 초안 취소 | `cancelBillingStatement(id)` 호출 후 해당 행 제거 | 동일 | CI (vitest) |
| TC-361-08 | 후보 조회 상한 | `truncated=true`이면 상한 경고 렌더 | `tests/unit/components/statements/statement-create.test.tsx` | CI (vitest) |
| TC-361-09 | 미정산 오더 안내 | `excludedUnsettled=3`이면 안내와 `/settlement` 링크 렌더 | 동일 | CI (vitest) |
| TC-361-10 | 후보 표 화주명 열 | 오더별 화주명·기준일 열과 값 렌더 | 동일 | CI (vitest) |
| TC-361-11 | 수기 화주 자동완성·유사명 칩 | 대리점에서 자동완성 호출, 유사명 칩 클릭 시 재조회 | 동일 | CI (vitest) |
| TC-361-12 | 읽기 전용 경로 수기 화주 옵션 | `allowAdhoc=false`이면 `수기 입력 화주` 옵션 미렌더 | 동일 | CI (vitest) |
| TC-361-13 | 초안 저장 페이로드 | `billedTarget`·기간·선택 오더만 서버 전달 후 상세로 이동 | 동일 | CI (vitest) |
| TC-361-14 | 내 청구 DRAFT 상세 | `발행`·`취소(삭제)` 렌더 | `tests/unit/components/statements/statement-detail.test.tsx` | CI (vitest) |
| TC-361-15 | 내 청구 ISSUED 상세 | `입금확인`만 렌더, 취소·재발행 미렌더 | 동일 | CI (vitest) |
| TC-361-16 | 나에게 청구된 상세 | 작업 영역 미렌더 + `조회 전용` 배지 | 동일 | CI (vitest) |
| TC-361-17 | Admin 감독 DRAFT 상세 | 작업 영역 미렌더 + `조회 전용` 배지 | 동일 | CI (vitest) |
| TC-361-18 | 발행 확인 모달 | 경고 문구 렌더 → 액션 호출 → 발행 버튼 소멸 | 동일 | CI (vitest) |
| TC-361-19 | 입금액 불일치 | 서버 호출 없이 전액 경고 렌더 | 동일 | CI (vitest) |
| TC-361-20 | 입금확인 성공 | `paidAt`·전액 전달 후 `마감` 상태 전이 | 동일 | CI (vitest) |
| TC-361-21 | 조회 실패 | 찾을 수 없음 화면 + 서버 error 문구 그대로 표시 | 동일 | CI (vitest) |
| TC-361-22 | 4로케일 `Statements` 키 일치 | ko/en/zh/ja 77키 동일, ICU 플레이스홀더 일치 | `tests/unit/i18n/errors-key-sync.test.ts`, `npm run check:i18n` | CI (vitest) + 수동 |
| TC-361-23 | R-09 인덱스 동기화 | `npm run build:lrtm` 후 `npm run check:lrtm` PASS | 본 문서 | CI (수동 실행) |
| TC-361-24 | 역할별 실제 로그인·네비게이션 | Admin/대리점/화주 계정으로 각 3경로 `page.goto()` 접근 — 조회 범위·버튼 노출 확인 | `tests/e2e/` (⒝ PR에서 추가) | CI 미실행 (수동 E2E) |
| TC-361-25 | `/admin/error-logs` severity=ERROR | 신규 오류 0건 | 수동 확인 | CI 미실행 (수동) |

## 되돌리기(Revert) 검증 결과

아래 5건은 2026-11-22 실제로 구현을 되돌려 `npx vitest run`을 실행한 뒤 즉시 복구하여 확인함(복구 후 21/21 재PASS, REVERT CHECK 잔존 0).

| 되돌릴 구현 (실제 조작) | 기대 실패 테스트 | 실제 결과 (실측) |
|:--|:--|:--|
| `StatementsList`의 `mine = row.scope === 'MINE'` → `true` | TC-361-03·04 (읽기 전용 행에 취소/입금확인 렌더) | **FAIL** — 2 failed / 5 passed (03·04) |
| `truncated &&` 경고 블록 → `false &&` | TC-361-08 | **FAIL** — 1 failed / 5 passed (08) |
| `StatementDetail` 작업 영역의 `mine &&` → `true &&` | TC-361-16·17 | **FAIL** — 2 failed / 6 passed (16·17) |
| `IssueConfirmModal`의 `{t('issueWarning')}` 제거 | TC-361-18 | **FAIL** — 1 failed / 7 passed (18) |
| `PaymentConfirmModal`의 전액 사전 검증 → `false &&` | TC-361-19 | **FAIL** — 1 failed / 7 passed (19) |
