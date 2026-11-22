# [TASK-B-370] DEF-157 후속 — zen_order_rate_snapshots 안전 뷰 전환 (Issue #1420)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-370 / [#1420](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1420) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `src/app/actions/operations/orders.ts`, `src/lib/orders/rate-snapshot-refresh.ts` |
| **검증 차원 (231 D1~D9)** | D1, D3, D8 |

**2026-11-23, Dave** — DEF-157 후속(안전 뷰 `zen_order_rate_snapshots_safe`, TASK-1168). Team B 소유 2파일의 스냅샷 **조회는 안전 뷰**, **쓰기는 소유 검증 후 admin client**로 전환했습니다. 오더 등록(`saveOrderRateSnapshot` INSERT), 수정(`refreshUpsRateSnapshot` UPDATE/INSERT), 실측 반영(`applyPackageMeasurements` UPDATE/INSERT) 경로를 함께 전환했고, 관리자 세션 base 읽기 등 범위 밖 호출처는 건드리지 않았습니다. **마이그레이션·base table 정책 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-370-01 | 안전 뷰 세션별 조회 | 화주(소유)·대리점·관리자 1행 / 비소유 화주 0행 | `tests/integration/task-b370-snapshot-safe-view.test.ts` |
| TC-370-02 | 안전 뷰 metadata 화이트리스트 | `metadata.platform.totalSellingPrice` 존재, `agency`·`shipper` 키 없음 | 동일 |
| TC-370-03 | 화주(소유) `refreshUpsRateSnapshot` UPDATE | 1행 유지, `applied_unit_price` 서버 추정값으로 갱신 | 동일 |
| TC-370-04 | 대리점 `refreshUpsRateSnapshot` UPDATE | 동일 | 동일 |
| TC-370-05 | 관리자 `refreshUpsRateSnapshot` UPDATE | 동일 | 동일 |
| TC-370-06 | 비소유 화주 `refreshUpsRateSnapshot` | 쓰기 0행·금액 불변·추정 함수 미호출 | 동일 |
| TC-370-07 | 등록 경로 `saveOrderRateSnapshot` | 소유 화주 INSERT(1행, metadata 전체 키), 비소유 INSERT 0행 | 동일 |
| TC-370-08 | 실측 경로 `applyPackageMeasurements` | 중량 변경 저장 + 스냅샷 1행 UPDATE + `newFreight` 반환 | 동일 |
| TC-370-09 | 기존 수정 통합 회귀 | UPS 수정 후 스냅샷 1행 유지·값 갱신 (Admin 세션 전환) | `tests/integration/ups-edit-before-registration.test.ts` |
| TC-370-10 | 소유 검증 헬퍼·읽기 테이블 단위 검증 | 안전 뷰 read/`is_manual` 유지/비소유·비활성 차단/추정 함수 전파 | `tests/unit/orders/rate-snapshot-refresh.test.ts` |
| TC-370-12 | 실측 경로 대리점·관리자 | 중량 변경 + 스냅샷 1행 UPDATE, `oldFreight` 111 유지 | `tests/integration/task-b370-snapshot-safe-view.test.ts` |
| TC-370-14 | 실측 경로 비소유 MANAGER | 패키지 SELECT/UPDATE는 가능하지만 스냅샷 불변(111) | 동일 |
| TC-370-11 | 등록 경로 직접 화주 회귀 | SHIPPER·CORPORATE·AGENCY_SHIPPER 스냅샷 생성(admin client) | `tests/unit/orders/direct-shipper-ups-snapshot.test.ts` |

**되돌리기 검증 (실측)**:

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-1 | 소유 검증 헬퍼를 항상 `true` | **2 failed / 15 passed** (등록 비소유·TC-SNAP-08) | 17/17 PASS |
| RST-2 | `refresh` 조회를 base table로 원복 | **2 failed / 8 passed** (TC-SNAP-01·03) | 10/10 PASS |
| RST-3 | `saveOrderRateSnapshot` 소유 검증 제거 | **1 failed / 6 skipped** (비소유 INSERT 1건) | 7/7 PASS |
| RST-4 | 실측 경로 가드(`L1167`)를 항상 true | **1 failed / 9 passed** (비소유 MANAGER가 스냅샷 404로 덮어씀) | 10/10 PASS |

**회귀 검증**: `npm run test:regression` → **293파일 / 2,248케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. `zen_error_logs` 최근 1일 신규 ERROR 0건.
**R-12 Ds-11**: 서버 액션 export 시그니처 변경 없음(lib 함수 `refreshUpsRateSnapshot` 파라미터 추가는 Ds-11 대상 아님) → 해당 없음.
**환경 메모**: 안전 뷰는 `auth.uid()` 기반 WHERE를 가지므로 **service_role/ admin client로 읽으면 0행**이다. 서버 액션 경로는 반드시 사용자 세션 client로 읽고, 쓰기만 admin client를 쓴다.
