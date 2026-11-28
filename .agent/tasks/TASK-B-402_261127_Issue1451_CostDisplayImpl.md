# TASK-B-402 — B-377 구현 PR-A: 원가 열람 가드·부가운임 표시·라벨 중립화 (Issue #1451)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) (TASK-B-377 구현) · 담당 Mike(Jaison 배정, JSJung 지시) · 검증 Jaison · p1 |
| 브랜치 | `feature/teamb-task-b402-iss1451-cost-display-impl` (base `origin/TeamB_Dev` `b9e0254f1`) |
| 상태 | ✅ PR-A 완료 → `status:review` (PR #1586, 2026-11-28 15:50 KST) |
| 선행 | `[설계 확정]`(Aiden·Edward, PR #1557 `dd6d9c801`) · B-382(#1511)·B-381 PR-3·4a·**4b(#1568, 13:42 병합)** 병합 · Aiden `status:ready` 부여(14:16) |
| 문서 기준 | `TeamB_Dev`의 설계 task file `:140` `[설계 확정]` 섹션 + §3-1·§5·§6·§8-1 |
| 원칙 | R-21 §2(현재 정책의 역할별 결과를코드 주석·문서·PR에 쓰지 않음) · R-14(마이그레이션 적용은 Aiden만 — 본 Task는 파일 작성·로컬 검증까지) · 새 커밋(force-push 금지) |

## 채번 확인 (이중 확정 — 스크립트만 믿지 않음)

```bash
./scripts/next-task-number.sh B   # → TASK-B-402
# 교차 확인: Issue 제목 최대 = TASK-B-401 → 402 = 그 다음 번호와 일치
# 무충돌: 원격 브랜치 최대 task-b400(0건 of b402) · .agent/tasks 파일 최대 TASK-B-399(0건 of 402)
date                              # Thu Nov 27 14:23:17 KST 2026
```

## 착수 절차 실측

```bash
① 전용 워크트리 확인 (init 미실행) · git fetch · TeamB_Dev 최근3(b9e0254f1 = B-399 설계 확정 병합 포함)
② 번호 이중 확정(위) → feature/teamb-task-b402-iss1451-cost-display-impl 신규 분기
③ ./scripts/check-db-freshness.sh → OK (pending 0)
④ gh issue edit 1451 --add-label status:in-progress --remove-label status:ready → 전환 OK
```

## PR 분할안 (Jaison 승인 2026-11-27 12:49 + 보완 4건 + 재측정 3경로 반영)

| PR | 범위 | 비고 |
|:--|:--|:--|
| **PR-A (앱) — 본 task file의 대상** | ① `getUpsActualCost` 가드 문구 정합(§6 1번 — 허용 집합 표현, `SUB_ADMIN` 포함 여부는 **현행 접근 기준 코드 확인** 후 반영) ② 가드 조회 서버 액션 `getOrderAdditionalCharges(orderId)` — 소유·admin 검증 · 최신 `version` · 자기 tier · `run_charges` DTO만 · **원가 미반환** · **실패 관측성(반환 전 `logger.warn`/`error`)** ③ 라벨: 화주·대리점 경로 전체 "부가운임"(`getCostTypeLabel` audience + **ko/en/zh/ja 4로케일 키 동기화**, `errors-key-sync` 포함) ④ 조정 행: **안 2 라벨**(ko `운임 조정분` / en `freight adjustment` / zh `运费调整` / ja `運賃調整分`), 0원 비표시, 음수 부호 `-1,234`, **행 합 = `line_total`**, 합계는 저장값 사용·역산 금지 ⑤ `ups-detail` 판매가 구성만 표시·원가 계열 미전달, 원가 조인 경로 원가 미반환 ⑥ **Ds-11(R-12) 갱신 + `regression-items/TASK-*.md` 등재** ⑦ 테스트: `run_charges` tier×역할 신규 매트릭스 · `SUB_ADMIN` 허용 케이스 + 수익금 조회/원가 관리 **비파괴 회귀** · 실DB 세션 테스트(`getOrderAdditionalCharges`) · 오더 상세 양성 대조 · **새 테스트가 수정 전 코드에서 실패하는지 확인 보고** | 라벨·표시·가드는 DB 정책과 무관 → 먼저 병합·배포 |
| **PR-B (마이그레이션)** | 정책 마이그레이션 ①(`zen_ups_actual_cost` 화주·대리점 SELECT 제거 — `SUB_ADMIN` 포함 관리자 정책 **유지**) · ②(`zen_ups_actual_other_charges` shipper·agency 읽기 거부 — 관리자 정책 유지) · 각 **롤백 SQL 포함**(기존 정의 복원 전 의도 대조 = **Aiden**) | **Aiden의 PR-A 운영 반영 확인 통보 후에만 병합**(Jaison 보완 3) · 파일명 시각은 착수 직전 **모든 예약 마이그레이션(#1510 포함)보다 뒤** + 근거 기재(Jaison 보완 4) · 운영 적용은 R-14·Edward + 211 런북 |

- **Jaison 보완 반영**: (1) Ds-11·회귀 항목은 PR-A 범위에 명시(위 ⑥) (2) 모든 새 반환 경로에 `logger.warn`/`error`(위 ②) (3) PR-B 병합 시점 = Aiden 통보 후 (4) 마이그레이션 시각 근거 = PR-B 착수 시 기재.
- **재측정 반영(2026-11-27 13:45, Jaison 수용 13:57)**: 청구서 상세 페이지 **3경로(`finance`·`agency`·`shipper`의 `statements/[id]`)** — 라벨·조정 행·합계는 `StatementDetail` 공통 컴포넌트·Excel·export route에 걸리므로 **3개 경로의 R-10 화면 확인과 역할별 테스트 대상에 모두 포함**. 재측정 수치: `getUpsActualCost` 실호출 1곳 · `getCostTypeLabel` 사용 1곳 · `getOrderAdditionalCharges` 0건(충돌 없음) · 청구서 관련 10파일.
- **확정 조건 처리**: (1) 가드 문구 정합 = 구현 중 현행 접근 기준 적용 (2) DEF-B-165/166 잔존 = **이 Task 범위 제외**(Jaison 제외 판단 확정) (3) 안전 뷰 `breakdown` = **별도 경로**(Aiden 판단).

## [DoD]

- [x] PR-A 범위 ①~⑦ 전부 반영(각 항목 위치·결과 기재 — 아래 [작업 결과])
- [x] 새 테스트가 **수정 전 코드에서 실패**하는지 확인·보고(src·messages만 stash → unit import fail·렌더 2 failed·integration import fail 확인 후 복원)
- [x] 반환값 불변 + `npm run build` exit 0 · `npm run test:regression` **314파일/2,386테스트 PASS** (2026-11-28 15:30 KST, exit 0)
- [x] Ds-11 §4.3 갱신 · regression-items 등재(TC-402-01~20) · `check:ds11`/`check:lrtm` OK
- [x] R-21 §2 준수 · 보고는 지시·코멘트 읽은 뒤 + 직전 재조회 (`gh pr checks`는 아래 인용)

## [작업 결과]

- **커밋**: 착수 `04801f569` · 정정 `1c7cb3dc7` · **구현 커밋 `7a6669b4a`**(25파일: src 12 + messages 4 + docs 5 + tests 4)
- **PR**: [#1586](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1586) — base `TeamB_Dev`, `Refs #1451`, 라벨 `status:review` (2026-11-28 15:50 KST)
- **범위 ①~⑦ 위치·결과**:
  - ① `src/app/actions/finance/ups-actual-cost.ts` — `GET_UPS_ACTUAL_COST_ROLES`(admin 3 + SUB_ADMIN) 가드, `logger.warn` + `permission_denied`
  - ② `src/app/actions/finance/additional-charges.ts`(신규) — 소유·admin·최신 version·DTO 항목만(`line_no/name/amount/currency/tier`)·원가 미반환·실패 시 `logger.warn/error`
  - ③ `src/lib/finance/settlement/cost-type-labels.ts` audience(`admin`/`neutral`) + `messages/{ko,en,zh,ja}.json` Finance 2키
  - ④ `StatementDetail.tsx`(3경로 공통) 조정 행(안2·0원 비표시·음수·행합=line_total) + 부가운임 sub-rows · `statement-excel*.ts`(요약 +1행·상세 +3열·동적 printArea)
  - ⑤ `orders/[orderId]/ups-detail/page.tsx` select `invoice_id`만
  - ⑥ `Ds_11_04` §4.3 `getOrderAdditionalCharges` 항목 · `regression-items/TASK-B-402`(TC-402-01~20) · 부록A v1.1 · TC-360-31 printArea 정정
  - ⑦ 테스트 22건: 단위 9(`task-b402-cost-display`) + 렌더 2(`statement-detail`) + Excel 1(`task-b360-excel-data`) + 실DB 10(`task-b402-additional-charges-rls`)
- **수정 전 실패 확인**: src·messages stash + 신규 소스 격리 → unit import fail / 렌더 2 failed / integration import fail (전부 기대대로, 복원 OK)
- **전체 회귀**: `npm run test:regression` **314 passed / 2,386 tests PASS**, `npm run build` exit 0, `check:ds11`·`check:lrtm` OK, tsc src·내 테스트 0건
- **공유 DB 인시던트(외부 원인)**: 공유 로컬 DB에 타 Task의 미커밋 마이그레이션이 선적용되어 일부 실DB 테스트가 영향받음 → R-08-2 `supabase db reset`으로 복구 후 전체 회귀 통과, 타 Task 작업 복원. CI는 fresh DB라 영향 없음. 상세는 Aiden에게 비공개 전달.
- **`gh pr checks`(2026-11-28 15:51 KST, Regression Tests만 진행 중)**:
```
Task File Check (advisory, non-blocking)	pass	8s
Type Check (advisory, non-blocking)	pending
Dependency Audit (advisory, non-blocking)	pass	10s
Docs Sync Check (advisory, non-blocking)	pass	14s
Evidence Escape Check (advisory, non-blocking)	pass	14s
Vendor Integrity (advisory, non-blocking)	pass	14s
LRTM Sync Check (advisory, non-blocking)	pass	12s
Regression Tests	pending
```
