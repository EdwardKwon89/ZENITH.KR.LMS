# TASK-B-383 (구현) — 플랫폼 발행 청구서 조회 역할 조건: ADMIN·ZENITH_SUPER_ADMIN만 조회 (#1475, DEF-B-171)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1475](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1475) · DEF-B-171 · Jaison 배정 · `status:review` |
| 담당 | **Mike (Worker)** / 검증: Jaison · 설계: PR #1488 `[설계 확정]` 범위 내 |
| 브랜치 | `feature/teamb-task-b383-iss1475-platform-statement-role-cond` (base: `origin/TeamB_Dev` `4982a27f3`) |
| 상태 | 📋 검토 대기 (`status:review`) |
| 긴급도 | p2 · **병합 조건**: B-382(#1463) 존재 확인 함수 적용 뒤 병합 판단 (착수·PR 제출은 지금) |
| 공개 기재 | **R-21** 적용 — 목표 상태·판정 기준·해소 여부만 기재 |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-383"   # → 설계 file은 PR #1488 브랜치(본 브랜치엔 없음) — 구현 단계 신규 생성
./scripts/next-task-number.sh B     # → TASK-B-385 (이슈 확정번호 B-383 사용)
```

## [목표] (설계 확정 범위)

플랫폼 조직이 발행한 청구서(헤더·항목)는 **ADMIN·ZENITH_SUPER_ADMIN만** 조회(발행자 측 소속 역할 기준). 대리점 발행분·수신자 자격·감독 경로·쓰기 정책·함수·서버 액션은 **변경 없음**.

**판정 기준**: 목표 표의 모든 셀이 실세션 SELECT로 단언되고, 판정 불가 시 fail-closed(비관리 차단·관리 발행자 허용), 되돌리기 시 테스트가 FAIL해야 한다.

## [범위]

- **신규 마이그레이션 1개**: 기존 SELECT 정책 2개(헤더 발행자 분기·항목 발행자 분기)의 조건 수정 + ROLLBACK(변경 전 원문은 마이그레이션 파일에만) + `NOTIFY pgrst, 'reload schema'`
- **신규 테스트 1개**: 실세션 헤더·항목 매트릭스 9세션 + 판정 불가 fail-closed + 중첩 케이스 단언 + 잔여 0
- **하지 않는 것**: 새 정책·함수·서버 액션 · 쓰기 정책 · 감독/수신자 분기 · `scratch/`(R-15) · 화면 접근 게이트(후속 Task 제안)

## [지켜야 할 것]

- **R-09**: 목표 표 전 셀 실세션 단언(소스 문자열 검사 금지) + **되돌리기 실측**(ROLLBACK 실행 → FAIL, 재적용 → PASS)
- **R-21**: 현재 정책의 역할별 결과·재현 서술·증적 파일 저장소 금지 — 결과는 "해소됨" 한 단어와 건수만
- **R-20**: GitNexus CLI 미설치 → grep 전수(아래)
- **R-12**: Ds-11 해당 없음(함수·액션 변경 0) · `check:ds11` 실행
- **R-10**: `/admin/error-logs` 신규 ERROR 無 한 줄 (증적 파일은 저장소 미커밋)

## [R-20 영향도] — GitNexus CLI 미설치 → grep 전수 (실측)

| 명령 | 결과 |
|:--|:--|
| `grep -rn "zen_billing_statements" src --include=*.ts --include=*.tsx \| wc -l` | 8건 |
| `grep -rn "zen_billing_statement_items" src ... \| wc -l` | 6건 |
| `grep -rln "zen_billing_statement" src ... \| wc -l` | **3개 파일**(서버 액션 3종 — 청구서 생성/조회/정산 해제) |
| `grep -rn "bill_stmt_select_issuer\|bsi_select" src supabase/migrations ...` (본 마이그레이션·b359 제외) | **0건** (정책 재정의 없음) |

→ 정책 변경은 해당 테이블 SELECT 경로 전반에 적용되나, **정상 경로(허용 역할)는 결과가 동일**해야 하며 이는 E2E 14/14로 실측한다.

## [DoD] (이슈 요청·설계 확정 기준)

- [x] 신규 마이그레이션(정책 2개 조건 수정 + 롤백 원문 + reload schema), b359 등 기존 파일 수정 0
- [x] 실세션 매트릭스: 헤더·항목 × 역할 9종 × 발행 조직 — 목표 표 전 셀 단언 + 양성 대조
- [x] 판정 불가 fail-closed 단언 + 중첩 케이스 단언(수신자 분기 우선)
- [x] 되돌리기 실측 (ROLLBACK → FAIL / 재적용 → PASS) + afterAll 원복 + 잔여 0건
- [x] B-382 교차 확인 항목: 병합 전 추가 기록 (B-382 미적용 상태로는 측정 불가 — 병합 조건과 연동)
- [x] R-10 E2E 14/14 + error-logs 無 · R-09 회귀 항목 파일 · R-12 `check:ds11` OK
- [x] `npm run test:regression` PASS · `npm run build` PASS · R-21 자가 grep
- [x] PR `Refs #1475`·`Refs DEF-B-171` (base `TeamB_Dev`, Squash)

## [작업 결과]

- 코드 커밋: `20c30db445225f9b27fbb044eb6163a02b0e420f`

### 정정 커밋 (Jaison·Aiden 비차단 정정 4건, 2026-11-24)
- **반영 커밋: `6fd422437`** (파일 정정 3종 + 본 기재 포함 — 단독 커밋이 메시지 인용구 오류로 미실행되어 합산됨, force-push 없이 이 정정으로 기재를 바로잡음) — ① PR 본문/ task file/회귀 항목의 "TC-04"를 실제 구성(`it` 3개, 중첩 단언 TC-01·03 내장)으로 정정 ② 테스트 주석 "실세팅"→"목표 구성" 2곳 ③ 상태 라벨 `status:review` 정합 ④ 병합 전 확인 항목(B-382 교차·환경 전제 R-14) 기재. (설계 문서 표현 일반화는 PR #1488 브랜치에서 별도 커밋)

### 착수 절차 실측 (R-17)
```bash
① ./scripts/agent-worktree-init.sh mike · fetch/rebase origin/TeamB_Dev (4982a27f3)
② ls .agent/tasks | grep B-383 → 설계 file은 PR #1488 브랜치(구현 브랜치엔 없음) · next-task-number → TASK-B-385 (이슈 확정번호 B-383)
③ 브랜치 feature/teamb-task-b383-iss1475-platform-statement-role-cond · check-db-freshness OK
④ gh issue edit 1475 --add-label status:in-progress --remove-label status:ready
⑤ 선행 확인: PR #1488 [설계 확정] 범위 · #1463(B-382) OPEN → 병합 조건 미충족(착수·PR 제출은 지시상 가능)
```

### 구현 (신규 마이그레이션 1개 — 기존 파일 수정 0)
- `20261124090000_task_b383_platform_statement_role_condition.sql`: 기존 SELECT 정책 **2개**(헤더 발행자 분기·항목 발행자 분기)에만 판정 조건 추가
  - `허용 = 발행자 일치 AND (관리 역할(ADMIN·ZENITH_SUPER_ADMIN, DB 프로필 출처) OR (조직 조회 성공 AND 발행 조직 유형 ≠ 플랫폼))` — 대리점 발행분은 역할 조건 없음(기존 동작), 수신자·감독 분기·쓰기 정책 **원문 유지**
  - fail-closed: 조직 조회 결과 없으면 비관리 역할 차단, 관리 역할은 발행자 자격으로 허용
  - **ROLLBACK 블록에 변경 전 정책 원문(b359 소스 verbatim) 포함** — 원문은 마이그레이션 파일에만 · `NOTIFY pgrst, 'reload schema'`
- 적용: `supabase db push --local` → 정책 2개 role 조건 존재 실측 확인

### 테스트 (실세션 · 소스 문자열 검사 0건) — `3/3 PASS` (`it` 3개 — 중첩 케이스 단언은 TC-01·03에 내장)
| TC | 내용 |
|:--|:--|
| TC-383-01 헤더 매트릭스 | 실세션 **9종**(플랫폼 4 · 대리점A 2(SUB_ADMIN 포함) · 대리점B · 화주 2) × 발행 조직(플랫폼 2건·대리점 1건) — 목표 표 전 셀 단언(양성 대조 + **수신자 분기 중첩 케이스 단언 포함**) |
| TC-383-02 항목 매트릭스 | 동일 9세션 — 헤더와 동일 판정 단언 |
| TC-383-03 판정 불가 fail-closed | 조직 조회 정책 일시 제거 → 비관리 역할 발행자 경로 차단·관리 역할 허용·**수신자 분기는 무관하게 유지(중첩 케이스 단언 포함)** → finally 복원 + 복원 확인 |
- fixture: 가상 이메일·자기완결 정리(afterAll + 방어 복원) · 잔여 stmt=0 / orders=0 / profiles=0

### 되돌리기 실측 (로컬만, 커밋 금지 → 원복)
| 조건 | 내용 | 결과 |
|:--|:--|:--|
| R1 | 마이그레이션 **ROLLBACK 블록 실행**(정책 2개 ORIGINAL 실측 확인) | **3 failed / 0 passed** (매트릭스 전부 FAIL) |
| (기준선) | 마이그레이션 본문 재적용(정책 2개 NEW 확인) | **3/3 PASS** · 잔여 0건 |

### R-10 · 검증
- E2E `e2e-31` **14/14 PASS** (4.9m, 청구서 관리 전 구간 무회귀) · **에러 로그 확인 — 無** (`zen_error_logs` delta 0)
- `npm run test:regression` → **298 files / 2,274 tests 전부 PASS** · `npm run build` → **exit 0** (12.3s)
- `check:ds11` OK (**해당 없음** — 함수·서버 액션 변경 0) · `check:lrtm` OK · `check:doc-links` OK · `check:audit` OK · `tsc` 0건
- **R-21 자가 grep**: 절대경로/자격증명 0건 · 실사용자 식별정보 0건 · 현재 정책 역할별 결과 서술 0건 (명령 형태·건수만 기재)
- **R-20**: GitNexus CLI 미설치 → grep 전수(위 표) — 정책 재정의 0건
- 증적 파일 저장소 미커밋(R-21) — 결과는 건수만 기재

### 병합 조건 연동 (B-382)
- **TC-383-06(B-382 교차 확인)**: B-382(#1463) 존재 확인 함수 **적용 후** 측정 필요 — 현재 함수 미적용 상태로는 측정 불가하여 병합 전 단계에서 추가한다(회귀 항목 파일에 기재). 병합 판단은 B-382 적용 뒤 Jaison·Aiden이 수행.

### 병합 전 확인 항목 (Jaison 검토 반영)
- **TC-383-06(B-382 교차 확인)**: B-382 함수 적용 후 측정해 회귀 항목에 기재 (위 DoD·R-09에 예고)
- **적용 환경 전제**: 판정 전제(조직 조회가 모든 역할에서 가능)의 **운영 환경 확인은 R-14**에 따라 **Edward·Aiden 경유**로 요청 — 직접 조회하지 않는다

### 발견 이슈
없음 (범위 밖 결함 미발견). 화면 접근(메뉴·페이지 가드) 차단은 설계 확정대로 **후속 Task 제안** 유지.
