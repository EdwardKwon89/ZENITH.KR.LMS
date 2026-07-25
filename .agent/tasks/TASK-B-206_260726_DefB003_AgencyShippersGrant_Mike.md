# TASK-B-206: DEF-B-003 — zen_agency_shippers authenticated GRANT 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 |
| **상태** | 🔄 |

## 개요

상세: `.agent/defects/DEF-B-003_zen_agency_shippers_GRANT_누락_CI_FAIL.md`

`zen_agency_shippers` 테이블에 `authenticated` 롤 SELECT GRANT가 어떤 마이그레이션에도 없어, TeamB_Dev 위 모든 신규 PR의 CI(`supabase db reset` fresh 환경)가 계속 FAIL 중(PR#844에서 발견). 로컬 dev DB는 누적 GRANT로 우연히 통과해왔음. IMP-153과 동일 계열.

## 조치안

새 마이그레이션 추가:
```sql
GRANT SELECT ON public.zen_agency_shippers TO authenticated;
```

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인 (본 파일은 TASK-B-206으로 이미 채번됨)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] 마이그레이션 파일 추가 (파일명에 `defb003` 포함)
- [ ] 로컬 DB에 직접 적용(`docker exec ... psql`) 후 `npm run test:regression`으로 `tests/unit/finance/shipper-invoices-agency-rls.test.ts` 실제 PASS 확인
- [ ] 전체 회귀 실행, 정확한 결과 기재
- [ ] `npm run build` 실행

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-206-... → TeamB_Dev`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
