# TASK-B-205: 화주(Shipper)용 청구서(인보이스) 조회 화면 신설

| 항목 | 내용 |
|:-----|:------|
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |
| **선행 참고** | TASK-B-204(부가요금 등록)와 함께 진행되나 독립적으로 착수 가능. 화면에는 TASK-B-204를 거쳐 발행된 인보이스도 함께 노출되어야 함 |

## 개요

사용자 요청: "이러한 실제 청구서는 admin, 담당 agency, 해당 화주가 조회할 수 있어야 한다. 이를 위해 청구서 조회 기능이 있어야 한다."

## 조사 결과 (Jaison 완료)

현재 청구서 조회 화면은 2개뿐:
- `/settlement`(`src/app/[locale]/(dashboard)/settlement/page.tsx`) — **ADMIN/ZENITH_SUPER_ADMIN 전용**
- `/agency/settlements`(`src/app/[locale]/(dashboard)/agency/settlements/`) — **AGENCY 전용**, 화주 목록별 정산 요약(`ShipperSettlementTable.tsx` 등)

**SHIPPER 역할이 본인 청구서를 조회하는 화면은 코드베이스 전체에 존재하지 않음**(전체 검색 확인 완료). 이번 Task는 이 화면을 신설.

`zen_invoices` 테이블에 `shipper_id` 컬럼이 이미 존재(`src/app/actions/finance/settlement.ts:155` 등에서 확인) — 화주 스코핑에 바로 사용 가능. 화주 계정의 `profile.org_id`가 곧 `zen_invoices.shipper_id`와 매칭되는 구조(프로젝트 전반의 기존 패턴과 일치).

## 조치안

### 1. 서버 액션 신설

`src/app/actions/finance/settlement.ts` 또는 신규 파일(`src/app/actions/finance/shipper-invoices.ts`)에 추가:
```ts
export async function getShipperInvoices(params?: { startDate?: string; endDate?: string }) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');
  if (profile.role !== USER_ROLES.SHIPPER) {
    throw new Error('화주 전용 기능입니다.');
  }

  let query = supabase
    .from('zen_invoices')
    .select('id, invoice_no, total_amount, currency, status, is_finalized, created_at, metadata')
    .eq('shipper_id', profile.org_id)
    .neq('status', 'CANCELED')
    .order('created_at', { ascending: false });

  if (params?.startDate) query = query.gte('created_at', `${params.startDate}T00:00:00Z`);
  if (params?.endDate) query = query.lte('created_at', `${params.endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) throw new Error(`청구서 조회 실패: ${error.message}`);
  return data;
}
```
RLS로 추가 방어가 되어 있는지 `zen_invoices` 정책도 함께 확인 — SHIPPER가 본인 `shipper_id` 행만 SELECT 가능한지 로컬 DB에서 실측 검증할 것(이번 세션에서 반복된 AGENCY RLS 결함 패턴 참고 — DEF-114/116/117/120과 유사하게 SHIPPER용 정책이 아예 없을 가능성 있음).

### 2. 신규 페이지

`src/app/[locale]/(dashboard)/shipper/invoices/page.tsx` 신설 — `/agency/settlements` 페이지 구조를 참고해 SHIPPER 역할 전용으로 단순화(화주는 본인 것만 보므로 화주 선택 드롭다운 불필요, 목록+상세만).

### 3. 사이드바 메뉴 추가

`src/components/layout/NaviSidebar.tsx`에 SHIPPER 역할일 때만 보이는 메뉴 항목 추가(기존 `finance_group`/`settlement` 메뉴가 역할별로 어떻게 분기되는지 먼저 확인 후 일관된 방식으로 추가). 4개 언어(`messages/{ko,en,ja,zh}.json`) 키 추가 잊지 말 것(오늘 DEF-B-001에서 이 부분 빠뜨린 전례 있음).

### 4. admin/agency 접근은 기존 화면 유지

admin은 `/settlement`, agency는 `/agency/settlements`로 이미 조회 가능 — 이번 Task는 SHIPPER 화면 신설에만 집중. TASK-B-204에서 등록된 부가요금이 반영된 인보이스가 이 3개 화면 모두에서 정상적으로 조회되는지는 통합 확인 필요(각 담당자가 로컬 DB에서 교차 확인 권장).

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조(toContain 소스 문자열 검사 5회 누적 — 가장 최근 PR#826 재작업에서는 완전한 behavioral 테스트로 잘 해결함, 그 방식 유지 필수). RLS 정책 관련 작업은 반드시 로컬 DB에 실제 적용 후 실제 SHIPPER 세션으로 REST 검증할 것(TASK-B-188/192/195 패턴).

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `getShipperInvoices()` 서버 액션 신설
- [ ] `zen_invoices` RLS에 SHIPPER SELECT 정책이 있는지 확인, 없으면 마이그레이션 추가(신규 DEF-B-NNN 채번 — `./scripts/next-def-number.sh B`)
- [ ] `/shipper/invoices` 페이지 신설
- [ ] 사이드바 메뉴(SHIPPER 전용) + 4개 언어 키 추가
- [ ] 실제 함수 호출/컴포넌트 렌더링 기반 회귀 테스트 추가 + RLS는 실제 DB 검증
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 SHIPPER 계정으로 로그인 → 본인 청구서만 보이는지, 타 화주 것은 안 보이는지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-205-... → TeamB_Dev`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
