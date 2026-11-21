# TASK-1169 — `create_order_atomic` v7 구버전 payload 호환 로컬 검증

| 항목 | 내용 |
|:--|:--|
| **Task-ID** | TASK-1169 |
| **Issue** | #1407 |
| **Worker / Auditor** | D_Kai / Aiden (R-01) |
| **우선순위** | p2 |
| **단계** | **검증 완료 → `status:review`** |
| **브랜치** | `feature/teama-task-1169-create-order-atomic-v7` |
| **작성일** | 2026-11-21 KST |

## 1. 목표

`create_order_atomic` v7(`20261113090100`, `recipient_company` 컬럼 매핑 추가)을 운영 적용하기 전에, **구버전 payload(해당 필드 없음)로 호출해도 정상 동작**하는지 로컬에서 검증한다. 운영 DB 접속은 금지(R-14)하며, 결함 발견 시 R-18(DEF 등록)로 보고하고 직접 수정하지 않는다.

## 2. 전제조건·범위

- **전제**: 로컬 DB가 develop 최신 스키마와 일치해야 한다(DEF-128 재발 방지).
  - `scripts/check-db-freshness.sh` → `OK — pending 마이그레이션 없음` (PATH에 `node_modules/.bin` 주입 후 실행. 전역 `supabase` 바이너리 미설치 환경).
- **범위**: 로컬 Supabase(`127.0.0.1:54321`/`54322`, 컨테이너 `supabase_db_ZENITH_LMS_001`)에서 (a) 구버전 payload (b) 신버전 payload (c) null/빈 문자열 호출 결과 비교 + 회귀 테스트 1건.
- **변경 없음**: 마이그레이션·앱 코드·운영 환경. 이 Task 는 검증 전용이며 산출물은 테스트·문서뿐이다.
- **참고**: v6→v7 함수 본문 diff 는 `recipient_company` 컬럼 매핑과 주석 문자열뿐이다(함수 시그니처·나머지 INSERT 경로 동일).

## 3. DoD 체크리스트

- [x] (a) 구버전 payload — 주문 생성 성공, `recipient_company` NULL, 부속 행(패키지·아이템·트래킹·상태이력) 정상
- [x] (b) 신버전 payload — 값 그대로 저장
- [x] (c) null / 빈 문자열 — NULL / `''` 구분 저장
- [x] (a)(b)(c) 결과표 task file 기재(§4)
- [x] 회귀 테스트 1건 추가 — `tests/integration/task-1169-create-order-atomic-v7-payload.test.ts` (TC-1169-01~05)
- [x] `regression-items/` 등재 + `npm run check:lrtm` 통과 (회귀맵 인덱스 직접 수정 없음)
- [x] build·회귀 PASS 수치 기재(§6)
- [x] R-17 완료 보고(§7, 커밋 40자 해시)
- [x] 운영 DB 접속·변경 없음, 결함 미발견(R-18 불필요)

## 4. 검증 결과

### 4.1 (a)(b)(c) 결과표 — psql 트랜잭션(`BEGIN … ROLLBACK`)

| 케이스 | payload `recipient_company` | 주문 생성 | DB 저장값 | 패키지 | 아이템 | 트래킹 | 상태이력 |
|:--|:--|:--:|:--|:--:|:--:|:--:|:--:|
| (a) 구버전 | **키 없음** | 성공(`ZEN-2026-000285`) | **NULL** | 1 | 1 | 1 | 1 |
| (b) 신버전 | `ACME Logistics` | 성공 | `ACME Logistics` | 1 | 1 | 1 | 1 |
| (c1) null | JSON `null` | 성공 | **NULL** | 1 | 1 | 1 | 1 |
| (c2) 빈 문자열 | `''` | 성공 | `''` (빈 문자열) | 1 | 1 | 1 | 1 |

- 함수 시그니처 불변: `create_order_atomic(jsonb,uuid,uuid)`, `RETURNS jsonb`, `SECURITY DEFINER=true`.
- 컬럼 제약: `zen_orders.recipient_company` — `text`, **nullable**(제약 위반 없음).
- 픽스처(조직·auth 사용자·프로필)는 트랜잭션 안에서만 생성되어 `ROLLBACK` 으로 제거된다.

### 4.2 실경로(PostgREST) 확인 — 구버전 payload

`shipper@zenith.kr` 실제 로그인 세션으로 `/rest/v1/rpc/create_order_atomic` 에 **`recipient_company` 키를 넣지 않은 payload**를 전송했다.

| 확인 항목 | 결과 |
|:--|:--|
| HTTP/RPC 결과 | 성공 — `ZEN-2026-000285`, `status=REGISTERED` |
| 응답 JSON | `recipient_company: null` (키는 존재, 값은 null) |
| 검증 후 정리 | 해당 주문 + 부속 행 삭제 완료(잔여 0건) |

### 4.3 관찰 사항 (결함 아님)

- 빈 문자열 `''` 은 NULL 로 정규화되지 않고 그대로 저장된다. 표시·SHXK 전송 경로(`label-mapping.ts`)는 falsy 처리로 빈 값을 무시하므로 기능 영향이 없고, v6 이전에도 동일한 동작이었다. **결함 등록 대상 아님.**

### 4.4 판정

**구버전 payload 호환 — 이상 없음.** v7 운영 적용 시 구버전 클라이언트/캐시된 앱 번들의 payload로도 주문 등록이 실패하지 않는다.

## 5. 회귀 테스트

| 구분 | 내용 |
|:--|:--|
| 신규 | `tests/integration/task-1169-create-order-atomic-v7-payload.test.ts` — **5 케이스** (TC-1169-01 정적 + TC-1169-02~05 실DB) |
| 실DB 격리 | 단일 psql 세션 `BEGIN … ROLLBACK` — CI fresh DB(시드 없음)에서도 자기완결, 잔여 행 0 |
| 공용 헬퍼 | `tests/integration/helpers/db.ts` 의 `psql()` 사용(로컬 전용 가드 포함) |
| 등재 | `docs/08_Self_Audit/Checklists/regression-items/TASK-1169_Issue1407_create-order-atomic-v7-payload.md` |

## 6. 검증 수치

| 항목 | 결과 |
|:--|:--|
| 신규 테스트 | 5/5 PASS |
| 전체 회귀 | `npm run test:regression` — **269 files / 1979 tests 전부 PASS** (EXIT=0) |
| 프로덕션 빌드 | `npm run build` — **EXIT=0** (Next.js 16.4.6 Turbopack) |
| 회귀맵 정합성 | `npm run check:lrtm` — 유령 경로 0 · E2E 표기 누락 0 · 허용 목록 밖 미등재 0 |

## 7. R-17 완료 보고

- 코드 커밋: `1af180b6d94d5d2cc69c9595d0e53e472625fbe9`
- 커밋 내용: 회귀 테스트 5케이스 + `regression-items/` 등재 — **`src/` 변경 없음**(검증 전용 Task)
- **문서 커밋 (완료 보고)**: `2ddac1d04b72e195674daae75f8ecdf93d712c8a` — `[D_Kai] docs: TASK-1169 v7 payload 호환 검증 결과 및 R-17 완료 보고 (#1407)`
- **브랜치**: `feature/teama-task-1169-create-order-atomic-v7` → `develop` (PR)
- **Issue 라벨**: `status:open` → `status:in-progress` → `status:review`
- **실배포/운영 DB**: **미수행** — 로컬/CI 검증만
