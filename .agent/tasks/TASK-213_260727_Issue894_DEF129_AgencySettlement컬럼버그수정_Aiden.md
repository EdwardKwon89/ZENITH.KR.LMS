# TASK-213 — DEF-129: Agency 정산 조회 dest_country_code 컬럼 버그 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-213 |
| **GitHub Issue** | [#894](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/894) |
| **생성일** | 2026-07-27 |
| **할당 Agent** | Aiden (직접 처리 — 고객 시연 준비 중 발견, 단순 컬럼명 치환) |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **커밋 태그** | `[Claude]` |
| **상태** | 🔔 |

---

## [배경]

고객 시연을 위한 "정산 집계 Sample Data 추가" 작업 중, `/agency/settlements` 화면이 어떤 데이터를 넣어도 항상 빈 결과만 표시되는 것을 발견. 원인 추적 결과 존재하지 않는 컬럼을 참조하는 코드 버그로 확인. 상세: `.agent/defects/DEF-129_agency_settlement_dest_country_code_컬럼부재.md`

## [근본 원인]

`src/lib/actions/agency-settlement.ts`가 `zen_orders.dest_country_code`(실존하지 않음, 실제 컬럼명 `recipient_country_code`)를 5곳에서 참조 — PostgREST 42703 에러가 `withAction()`에 조용히 캐치되어 UI에 "0건"으로만 표시됨. `tests/integration/p7-agency-settlement.test.ts`도 동일한 잘못된 필드명으로 mock되어 있어 버그를 잡지 못했음.

## [조치]

`dest_country_code` → `recipient_country_code` 전역 치환:
- `src/lib/actions/agency-settlement.ts` 5곳
- `tests/integration/p7-agency-settlement.test.ts` 4곳(mock 데이터)

## [발견 이슈]

없음

---

## DoD

- [x] 프로덕션 코드 컬럼명 수정 (5곳)
- [x] 테스트 mock 데이터 정합화 (4곳)
- [x] `npm run build` PASS
- [x] `npm run test:regression` 전체 PASS (135 files/894 tests)
- [x] `tests/integration/p7-agency-settlement.test.ts` 15/15 PASS 개별 확인
- [ ] task file 최종 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

`dest_country_code` → `recipient_country_code` 전역 치환 완료. 회귀 135 files/894 tests 전체 PASS. 커밋 해시는 아래 참조.
