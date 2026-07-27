# TASK-B-224: DEF-B-018 — `/admin/ups-actual-charges` 오더 검색 500 에러(`dest_country_code` 컬럼 부재) 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#899](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/899) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

`/admin/ups-actual-charges`에서 오더번호로 검색하면 500 에러가 발생합니다. 원인: `src/app/actions/finance/ups-actual-charges.ts`의 `searchDeliveredUpsOrders()`가 `zen_orders.dest_country_code`를 select하는데, 이 컬럼은 존재한 적이 없습니다(실제 컬럼명 `recipient_country_code`). 오늘 Aiden이 발견·수정한 DEF-129(`agency-settlement.ts`)와 완전히 동일한 오타 패턴이 이 파일에 별도로 남아있던 것입니다. 상세: `.agent/defects/DEF-B-018_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

`src/app/actions/finance/ups-actual-charges.ts`의 `searchDeliveredUpsOrders()` 함수 내 **2곳**(약 313행, 358행) — `order_no` 검색 select문과 `tracking_no` 검색 select문 둘 다 동일하게 수정:

```ts
// 변경 전
.select(`
  id,
  order_no,
  status,
  transport_mode,
  shipper_id,
  dest_country_code,
  created_at,
  tracking_config:zen_tracking_configs(tracking_no)
`)

// 변경 후 — PostgREST 별칭으로 외부 계약(필드명) 유지, 클라이언트 코드 변경 불필요
.select(`
  id,
  order_no,
  status,
  transport_mode,
  shipper_id,
  dest_country_code:recipient_country_code,
  created_at,
  tracking_config:zen_tracking_configs(tracking_no)
`)
```

`src/app/[locale]/(dashboard)/admin/ups-actual-charges/ups-actual-charges-client.tsx`는 **수정 불필요**(외부에서 보이는 필드명 `dest_country_code`는 그대로 유지됨).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-224-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 224 나와야 정상)
- [ ] 위 스펙대로 2곳 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 로컬 DB 기반**(mock만으로는 이 유형의 버그를 못 잡는다는 게 오늘 DEF-129에서 이미 증명됨):
  - `tests/unit/finance/ups-actual-charges.test.ts`에 `searchDeliveredUpsOrders`를 실제로 호출하는 테스트가 현재 **0건**(import만 되어 있고 테스트 케이스 없음) — 반드시 신규 추가
  - `docker exec supabase_db_ZENITH_LMS_001 psql ...`로 실제 쿼리를 직접 실행해(`SELECT id, order_no, recipient_country_code FROM zen_orders WHERE transport_mode='UPS' LIMIT 1` 등) 컬럼이 실재하는지, 그리고 함수가 실제로 에러 없이 결과를 반환하는지 검증
  - 기존 mock 기반 테스트가 있다면 mock 데이터의 필드명도 실제 스키마와 일치하는지 재확인(DEF-129의 "버그와 mock이 서로 일치해 테스트가 항상 통과했던" 재발 방지)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges`에서 `ZEN-2026-000001` 검색 → 정상적으로 검색 결과가 나오는지 확인 → 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Mike] fix: TASK-B-224 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 899 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-018 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #899`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — `toContain` 소스 문자열 검사 누적 이력 있음. 이번 Task는 실제 DB 쿼리 실행 기반 검증이 필수입니다(소스 문자열 검사로 대체 금지).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
