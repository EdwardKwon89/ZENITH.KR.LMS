# TASK-B-268: Issue #1034 / DEF-B-041 — UPS 기준요금 조회 PostgREST 1000행 제한 잘림

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1034](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1034) |
| **DEF** | [DEF-B-041](../defects/DEF-B-041_UPS기준요금_PostgREST_1000행_제한_잘림.md) |
| **배경** | JSJung이 "master air" 대리점으로 Express NON_DOC 기준요금이 12kg에서 끊긴다고 보고 — Jaison이 Playwright 실측으로 PostgREST 1000행 제한 잘림임을 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 근본 원인 (Issue #1034 본문 전체 참조 — 재현 완료)

`zen_ups_base_rates` 활성 행 1,560건. 아래 두 함수가 상품 필터 없이 전체 조회하며 페이지네이션 없음:

1. `src/app/actions/ups/rates-public.ts` — `getPublicBaseRates()` (→ agency/shipper 화면)
2. `src/app/actions/ups/rates.ts` — `getUpsBaseRates()`(productId 미지정 시, → admin 화면이 필터 없이 호출)

PostgREST 기본 1,000행 제한에 걸려 나머지 560건이 에러 없이 조용히 잘림 — `weight_kg` 전역 오름차순 정렬이라 1,000번째 행(weight_kg=12.0)에서 전 상품 공통으로 끊김.

**실측 확인(Jaison)**: REST API 직접 호출 `Content-Range: 0-999/*`, Playwright 실 로그인 렌더링 결과 Express NON_DOC 0.5~12kg(24행)만 표시, 실제 DB는 0.5~20kg(40행) 존재.

## 수정 방향 (설계 확정 — 착수 승인)

`getPublicBaseRates()`와 `getUpsBaseRates()`(productId 미지정 시)에 페이지네이션 루프 추가:

```ts
async function fetchAllRows(buildQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}
```
동일 필터 조건으로 매 페이지 새 쿼리를 구성해 `.range(from, to)`만 바꿔가며 반복 호출 후 결과 병합. 두 함수 각각에 적용(공용 헬퍼로 추출해도 되고, 각 파일에 개별 구현해도 무방 — 구현자 재량, 단 로직은 동일해야 함).

**화면 구조 변경 없음** — 최소 침습 수정. 지연 로딩(상품 선택 시에만 조회) 방식으로의 근본 전환은 이번 범위 밖(후속 IMP로 [발견 이슈]에 기재).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-268-base-rates-pagination` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-268 확인
- [ ] `getPublicBaseRates()` 페이지네이션 적용
- [ ] `getUpsBaseRates()` 페이지네이션 적용(productId 필터 있을 때는 결과가 애초에 1000행 미만이라 페이지네이션 루프가 1회만 돌고 끝나야 함 — 정상 동작 유지 확인)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - mock에서 1,000행 초과(예: 1,200행, 2페이지 분량)를 반환하도록 설정 시 함수가 전체 병합해 반환하는지(behavioral, `.range()` 호출 인자 캡처로 페이지네이션 동작 검증 — 실제 함수 import해서 검증, 그림자 테스트 금지)
  - 1,000행 이하인 경우 기존과 동일하게 동작하는지(회귀 방지, `.range()` 1회만 호출되는지)
  - **되돌리기 검증 필수** — 페이지네이션 로직 제거 시 1,000행 초과분 누락 증상이 실제로 재현되는지 확인 후 결과를 task file에 기재
  - (권장) 현재 로컬 DB(1,560행 실존)로 Playwright 실측 — Express NON_DOC 선택 후 20.0kg 행이 실제로 렌더링되는지 확인. 임시 테스트 스크립트는 커밋하지 말고 결과만 task file에 기재.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 `/agency/ups-rates`(또는 admin/shipper)에서 Express NON_DOC 선택 → 20.0kg 행까지 정상 표시 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-268 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1034 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1034`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①task file/ACTIVE_TASK.md 커밋 누락 ②채번 절차 미준수 ③무관한 과거 task file 오염(본인 전용 워크트리에서만 작업할 것). 직전 TASK-B-258/261/264/267은 절차 정확히 준수(특히 267은 RLS+앱레벨 동시 되돌리기 검증까지 정확) — 동일 수준 기대.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
