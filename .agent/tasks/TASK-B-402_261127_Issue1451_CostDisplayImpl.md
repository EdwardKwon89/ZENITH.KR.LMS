# TASK-B-402 — B-377 구현 PR-A: 원가 열람 가드·부가운임 표시·라벨 중립화 (Issue #1451)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) (TASK-B-377 구현) · 담당 Mike(Jaison 배정, JSJung 지시) · 검증 Jaison · p1 |
| 브랜치 | `feature/teamb-task-b402-iss1451-cost-display-impl` (base `origin/TeamB_Dev` `b9e0254f1`) |
| 상태 | 🔄 진행 중 (`status:in-progress` 전환 2026-11-27 14:23 KST) |
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

- [ ] PR-A 범위 ①~⑦ 전부 반영(각 항목 위치·결과 기재)
- [ ] 새 테스트가 **수정 전 코드에서 실패**하는지 확인·보고
- [ ] 반환값 불변(가드 추가 외 기존 동작 회귀 없음) + `npm run build` · `npm run test:regression` 전체 PASS
- [ ] Ds-11 갱신 · regression-items 등재 · `check:lrtm` OK
- [ ] `gh pr checks` 출력 그대로 인용 · R-21 §2 준수 · 보고는 지시·코멘트读后 + 직전 재조회

## [작업 결과]

- 커밋: `b9e0254f1e8876391c98415f0f3981e0b751f5df`
- PR: `<PLACEHOLDER_PR>`
