# [TASK-B-399 PR1] shipper_company DB·RPC·타입·Ds-11 (Issue #1566)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-399 PR1 / [#1566](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1566) |
| **팀 / 작성일** | Team B / 2026-11-27 (검토 반영) |
| **대상 모듈** | `supabase/migrations/20261127090000_task_b399_shipper_company.sql`, `supabase/migrations/20261127090100_task_b399_create_order_atomic_v8.sql`, `src/types/supabase.ts`, `docs/02_Analysis/ds11/Ds_11_03_Orders_Warehouse.md` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-27, Baker** — 발송인 회사명을 `zen_orders.shipper_company`(nullable)에 저장하고 `create_order_atomic` v8이 값을 기록하도록 했습니다. 내 정보 사용은 NULL(화주명 결정값 전송), 수기 입력은 앞뒤 공백 제거된 입력 원문 저장이며 모드 구분은 값 유무로 추론합니다. **UI·Zod·payload·환경변수 제거는 PR2, SHXK 외부 실호출은 PR3 범위**입니다. RPC 자체의 실DB 검증은 본 PR의 실DB 테스트가 담당합니다(Jaison·Aiden 검토 반영).

## 정적 보조 검사 (파일 검사 — DB 동작을 증명하지 않음)

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-B399-01 | 줄·인라인·블록 주석 제거 본문의 nullable 컬럼 정의 전체, COMMENT, DEFAULT·백필 없음 | 정의 문구 일치 / UPDATE 0건 | `tests/unit/migrations/taskb399-shipper-company.test.ts` |
| TC-B399-02 | 주석 제거 본문에서 시그니처·RETURNS·DEFINER·search_path 불변 | 4개 값 일치 | 동일 |
| TC-B399-03 | INSERT 컬럼/VALUES 목록 개수·인덱스 일치, 공백 확장 정규화, 기존 컬럼 위치 | 각 인덱스·값 일치 | 동일 |
| TC-B399-04 | v8 롤백 주석 + 컬럼 롤백 3단계(앱 → v7 복구 → DROP COLUMN) 순서·컬럼 잔존 | 각 단계 인덱스 `> -1` 후 3단계 순서 일치 | 동일 |
| TC-B399-05 | Row(필수)·Insert/Update(선택) 타입 구분 | 각 1건 | 동일 |
| TC-B399-06 | Ds-11 PR1 현행/PR2 적용 시 구분·구조 방어 이관·v8 경로·PR1 현행 환경변수 주입 서술 유지 | 각 문구 존재 단언과 일치 | 동일 |

## 실DB 값 단언 (로컬 Supabase, `supabase db reset` 후 CI 실행)

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-B399-DB-01 | 컬럼 nullable, 함수 `public` 네임스페이스·시그니처·DEFINER·반환형 `jsonb`·`search_path`, 주석이 아닌 본문의 `NULLIF(BTRIM(...))` | `YES` / `public` / 문구 일치 / `true` / `jsonb` / `{"search_path=public, auth"}` / `true` | `tests/integration/task-b399-shipper-company-db.test.ts` |
| TC-B399-DB-02 | 앞뒤 공백 제거 + 가운데 공백 보존 | 앞뒤만 제거된 원문 저장 | 동일 |
| TC-B399-DB-03 | 공백만 — ASCII·TAB·LF·CR·NBSP·전각 공백·`chr(160)`·`chr(12288)`(8종) | 모두 NULL | 동일 |
| TC-B399-DB-04 | 키 없음 / JSON null | 모두 NULL | 동일 |
| TC-B399-DB-05 | 기존 3컬럼 값 보존 + 패키지·아이템·트래킹·상태이력 부속 행 | 각 값 일치 / 각 1행, 총 11케이스 | 동일 |

- 픽스처는 런타임 난수 UUID·이메일을 쓰고 단일 psql 세션 `BEGIN…ROLLBACK`으로 잔여 행을 남기지 않으며 `afterAll`에서 방어적 정리를 한다. `skipIf` 없음. 결과는 `jsonb_agg` 한 줄 JSON으로 파싱해 저장값에 개행이 들어가도 행이 쪼개지지 않는다.
- **R-09 증적**: 마이그레이션 적용 전(컬럼 부재) 동일 실행(2026-11-27 15:10:40 KST) → 정적 파일 `6 tests | 1 failed`(TC-B399-06), 실DB 파일 `5 tests | 5 skipped`(`ERROR: column o.shipper_company does not exist`), 합계 `1 failed | 5 passed | 5 skipped`. `supabase db reset` 적용 후 2 files / **11 passed**(2026-11-27 15:13:07 KST). 증적은 저장소 밖 세션 임시 파일에 보관.

## 되돌리기 검증 (로컬 DB, 저장소 파일 미변경 · 임시 SQL · `BEGIN…ROLLBACK`)

| 단계 | 실행 | 결과 |
| :-- | :-- | :-- |
| RST-1 | v7 전문 재적용(컬럼 잔존) 후 RPC 호출 | 성공, `shipper_company` NULL 저장(컬럼은 잔존), `column_after_v7=1` |
| RST-2 | v7 복구 후 `DROP COLUMN` → RPC 호출 | 성공, `column_after_drop=0` |
| RST-3 | 역순(v8 잔존 상태에서 `DROP COLUMN` 먼저) → RPC 호출 | `column "shipper_company" of relation "zen_orders" does not exist` — 순서 위반 시 실패 확인 |
| 복구 | 트랜잭션 `ROLLBACK` 후 현재 상태 | 컬럼 1건·함수 본문에 `shipper_company` 존재(v8 유지) |

**회귀·정적 검사**: `npm run test:regression` 및 `check:ds11`·`check:lrtm`·`check:doc-links`·`check:evidence` 통과(값은 task file 참조). 실제 오더 식별자·계정·요청/응답 본문·절대경로는 R-21에 따라 기재하지 않는다. 운영 DB·운영 호출은 범위 밖(R-14).
