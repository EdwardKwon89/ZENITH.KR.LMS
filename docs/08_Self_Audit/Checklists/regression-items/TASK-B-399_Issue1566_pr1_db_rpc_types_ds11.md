# [TASK-B-399 PR1] shipper_company DB·RPC·타입·Ds-11 (Issue #1566)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-399 PR1 / [#1566](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1566) |
| **팀 / 작성일** | Team B / 2026-11-27 |
| **대상 모듈** | `supabase/migrations/20261127090000_task_b399_shipper_company.sql`, `supabase/migrations/20261127090100_task_b399_create_order_atomic_v8.sql`, `src/types/supabase.ts`, `docs/02_Analysis/ds11/Ds_11_03_Orders_Warehouse.md` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-27, Baker** — 발송인 회사명을 `zen_orders.shipper_company`(nullable)에 저장하고 `create_order_atomic` v8이 값을 기록하도록 했습니다. 내 정보 사용은 NULL(화주명 결정값 전송), 수기 입력은 원문 저장이며 모드 구분은 값 유무로 추론합니다. **UI·Zod·payload·환경변수 제거는 PR2, 회귀 실측·로컬 실호출은 PR3 범위**입니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-B399-01 | nullable 컬럼 추가·COMMENT, DEFAULT·백필 없음 | 구문 존재 / DEFAULT·UPDATE 0건 | `tests/unit/migrations/taskb399-shipper-company.test.ts` |
| TC-B399-02 | v8 시그니처 불변 — `jsonb, uuid, uuid`, `RETURNS jsonb`, `SECURITY DEFINER` | 4개 구문 존재 | 동일 |
| TC-B399-03 | RPC 저장 — 컬럼·`NULLIF(BTRIM(...), '')`·기존 `recipient_company` 유지 | 3개 구문 존재 | 동일 |
| TC-B399-04 | 롤백 주석 — v7 경로·컬럼 잔존 명시 | 3개 구문 존재 | 동일 |
| TC-B399-05 | 생성 타입 Row·Insert·Update 반영 | `zen_orders` 블록에서 3건 | 동일 |
| TC-B399-06 | Ds-11 — 신규 컬럼·모드 전달·v8 경로, 환경변수 주입 문구 제거 | 값 일치 / 금지 문구 0건 | 동일 |

**R-09 증적**: 구현 전 동일 테스트 실행 결과 6 failed(2026-11-27 14:24:43, 세션 임시 파일에 보관), 구현 후 6/6 PASS — CI 로그에 `date` 및 `gh pr checks` 원문 인용 예정.

**실DB 호출**: PR3에서 로컬 Supabase만 사용(R-14). 운영 DB·운영 호출은 범위 밖이며 별도 승인 절차를 따른다. 실제 오더 식별자·계정·요청/응답 본문은 R-21에 따라 문서에 기재하지 않는다.
