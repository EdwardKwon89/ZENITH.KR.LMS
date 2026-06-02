# TASK-108 — DEF-039 CARRIER RLS 추가 + 미스테이지 파일 커밋 + 신원 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-108 |
| **생성일** | 2026-06-01 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **관련 결함** | DEF-039 |
| **상태** | ⬜ |

---

## 목표

1. DEF-039: CARRIER role이 `zen_route_network` · `zen_rate_cards` · `zen_carriers` SELECT RLS 정책에 누락되어 CARRIER 계정의 경로/요율 조회가 항상 빈 배열을 반환하는 문제를 수정한다.
2. 미스테이지 파일 4건(`20260601020000` migration · `tisa.ts` · `OrderTisaDashboard.tsx` · `post_launch_improvements.md`)을 정상 커밋한다.
3. UAT_DEFECT_LOG.md의 신원 오기재("Noah (OpenCode)")를 `D_Kai (OpenCode)`로 수정한다.

---

## 배경

### DEF-039 원인

TASK-074(IMP-080) zen_route_network 스키마 확장 및 TASK-075(IMP-081) DatabaseRouteAdapter 구현 시, 생성된 RLS 정책에 CARRIER role이 포함되지 않음:

- `zen_route_network`: ADMIN/MANAGER SELECT 전용 → CARRIER 조회 시 빈 배열
- `zen_rate_cards`: org member SELECT 전용 → CARRIER 미포함
- `zen_carriers`: ADMIN/MANAGER SELECT 전용 → CARRIER 미포함

### 미스테이지 파일

D_Kai가 DEF-036/037 수정 과정에서 작성하였으나 커밋되지 않은 파일 4건:

| 파일 | 내용 |
|:----|:----|
| `supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql` | §1 fn_get_best_matching_rate currency 캐스트 수정 · §2 zen_order_rate_snapshots FK 수정 · §3 RLS INSERT/UPDATE 추가 · §4 carrier_id backfill |
| `src/app/actions/operations/tisa.ts` | getTotalWeight() + TisaSnapshotResult totalWeight/totalFreight 필드 |
| `src/components/orders/OrderTisaDashboard.tsx` | Total Freight UI 섹션 추가 |
| `scratch/post_launch_improvements.md` | IMP-094 요율 관리 워크플로우 고도화 |

### 신원 오기재

UAT_DEFECT_LOG.md 개정이력 및 DEF-038/039/040 수정담당란에 "Noah (OpenCode)" 기재 → `D_Kai (OpenCode)` 수정 필요.

---

## 작업 범위

### §1 — DEF-039 CARRIER RLS 추가

파일: `supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql`에 §5로 추가

```sql
-- §5 — DEF-039: CARRIER role SELECT RLS 추가
-- zen_route_network
CREATE POLICY "carrier_can_select_route_network"
  ON public.zen_route_network
  FOR SELECT
  USING (get_my_role() = 'CARRIER');

-- zen_rate_cards
CREATE POLICY "carrier_can_select_rate_cards"
  ON public.zen_rate_cards
  FOR SELECT
  USING (get_my_role() = 'CARRIER');

-- zen_carriers
CREATE POLICY "carrier_can_select_carriers"
  ON public.zen_carriers
  FOR SELECT
  USING (get_my_role() = 'CARRIER');
```

> 기존 SELECT 정책과 중복 여부 확인 후, 필요시 기존 정책에 `OR get_my_role() = 'CARRIER'` 조건 추가 방식으로 처리.

### §2 — 코드 커밋

아래 파일을 단일 코드 커밋으로 묶어 커밋:

- `supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql` (§1~§5 포함)
- `src/app/actions/operations/tisa.ts`
- `src/components/orders/OrderTisaDashboard.tsx`

커밋 메시지: `[D_Kai] fix: DEF-039 CARRIER RLS + TISA totalWeight/totalFreight + carrier_id backfill`

### §3 — 문서 수정 및 Doc commit

다음 파일 수정 후 단일 doc commit:

1. `UAT_DEFECT_LOG.md`:
   - DEF-038/039/040 담당란 `Noah (OpenCode)` → `D_Kai (OpenCode)` 전량 수정
   - DEF-039 상태: 미수정 → 수정완료, 커밋 해시 기재
2. `scratch/post_launch_improvements.md`: IMP-094 내용 유지
3. Task file `[작업 결과]` 섹션 기재 + 상태 🔔 변경
4. `ACTIVE_TASK.md` 상태 🔄→🔔 반영

커밋 메시지: `[D_Kai] docs: TASK-108 완료 보고 — DEF-039 해소 + 신원 수정 + task file 🔔`

---

## DoD (완료 기준)

- [ ] DEF-039: zen_route_network CARRIER SELECT 정책 추가 ✅
- [ ] DEF-039: zen_rate_cards CARRIER SELECT 정책 추가 ✅
- [ ] DEF-039: zen_carriers CARRIER SELECT 정책 추가 ✅
- [ ] migration `20260601020000` §5 포함 커밋 완료 ✅
- [ ] `tisa.ts` getTotalWeight + totalWeight/totalFreight 커밋 완료 ✅
- [ ] `OrderTisaDashboard.tsx` Total Freight UI 커밋 완료 ✅
- [ ] 회귀 테스트 전체 PASS (`rtk npm run test:regression`) ✅
- [ ] UAT_DEFECT_LOG.md 신원 오기재 전량 수정 (`D_Kai (OpenCode)`) ✅
- [ ] DEF-039 UAT_DEFECT_LOG.md 수정완료 갱신 ✅
- [ ] 코드 커밋 완료 (코드 커밋 선행 필수)
- [ ] task file `[작업 결과]` 섹션 기재 + 상태 🔔로 변경 ✅
- [ ] ACTIVE_TASK.md 상태 🔄→🔔 반영 ✅

---

## 참조 문서

- `supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql` — §5 추가 대상
- `src/app/actions/operations/tisa.ts` — 커밋 대상
- `src/components/orders/OrderTisaDashboard.tsx` — 커밋 대상
- `docs/91_FinalTest/UAT/UAT_DEFECT_LOG.md` — DEF-039 상태 + 신원 수정
- `scratch/post_launch_improvements.md` — IMP-094 커밋

---

## [설계 의견]

(단순 Task — 설계 결정 불필요, ⬜ → 🔄 직행)

---

## [작업 결과]

### §1 — DEF-039 CARRIER RLS ✅
`supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql`에 §5 추가:
- `DROP/CREATE POLICY zen_route_network_select` — ARRAY에 `'CARRIER'` 추가
- `DROP/CREATE POLICY zen_carriers_select` — ARRAY에 `'CARRIER'` 추가  
- `DROP/CREATE POLICY zen_rate_cards_select` — ARRAY에 `'CARRIER'` 추가

기존 `20260529150000` SELECT 정책의 role array에 CARRIER만 추가. 중복 정책 없음.

### §2 — 코드 커밋 ✅
커밋 `4cc88d8` — `[D_Kai] fix: DEF-039 CARRIER RLS + TISA totalWeight/totalFreight + carrier_id backfill`
- `supabase/migrations/20260601020000_fix_tisa_shipper_visible.sql` (신규)
- `src/app/actions/operations/tisa.ts` (수정)
- `src/components/orders/OrderTisaDashboard.tsx` (수정)

### §3 — 문서 수정 ✅
- UAT_DEFECT_LOG.md: 신원 `Noah`→`D_Kai` 전량 수정 (DEF-036~041 수정담당 + 개정이력 4건)
- DEF-039: `미수정`→`수정완료`, 커밋 해시 `4cc88d8` 기재
- 현황 요약 갱신: 기능오류 미수정 4→3, 수정완료 12→13

### 회귀 테스트 ✅
**229/229 PASS** (47 test files, 43.57s)

### 완료 기준 (DoD) 체크
- [x] DEF-039: zen_route_network CARRIER SELECT 정책 추가 ✅
- [x] DEF-039: zen_rate_cards CARRIER SELECT 정책 추가 ✅
- [x] DEF-039: zen_carriers CARRIER SELECT 정책 추가 ✅
- [x] migration `20260601020000` §5 포함 커밋 완료 ✅
- [x] `tisa.ts` getTotalWeight + totalWeight/totalFreight 커밋 완료 ✅
- [x] `OrderTisaDashboard.tsx` Total Freight UI 커밋 완료 ✅
- [x] 회귀 테스트 전체 PASS (`rtk npm run test:regression`) ✅
- [x] UAT_DEFECT_LOG.md 신원 오기재 전량 수정 (`D_Kai (OpenCode)`) ✅
- [x] DEF-039 UAT_DEFECT_LOG.md 수정완료 갱신 ✅
- [x] 코드 커밋 완료 (코드 커밋 선행 필수) ✅
- [x] task file `[작업 결과]` 섹션 기재 + 상태 🔔로 변경 ✅
- [x] ACTIVE_TASK.md 상태 🔄→🔔 반영 ✅

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:----|:----:|:----|
| 2026-06-01 | Aiden (Claude) | v1.0 — TASK-108 발령. DEF-039 CARRIER RLS + 미스테이지 커밋 + 신원 오기재 수정. D_Kai 배정. |
