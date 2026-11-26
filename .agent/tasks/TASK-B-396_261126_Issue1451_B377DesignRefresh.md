# TASK-B-396 — B-377 설계 갱신본 (Issue #1451, Aiden 갱신 7항목 반영)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) (TASK-B-377) · 담당 Mike(Jaison 배정, JSJung 승인) · 검증 Jaison · **`[설계 확정]`은 Aiden 전속** |
| 브랜치 | `feature/teamb-task-b396-iss1451-b377-design-refresh` (base `origin/TeamB_Dev` `f76f17d17`) |
| 성격 | **문서·조사만** — 코드·마이그레이션 변경 0, 운영 DB 접속 0(R-14), 이슈 라벨 `status:draft` **유지**(변경은 Aiden) |
| 소유 예외 | 갱신 대상 `TASK-B-377_261123_Issue1451_CostDisplayDesign.md`는 Dave 소유 — **갱신 범위(요청 1~7) 한정으로 Mike 수정 승인**(Jaison 배정). PR #1454 브랜치는 미접촉, 원본에서 복사해 새 브랜치에서 갱신 |
| 갱신 범위 | 요청 **1·2·3·4·6·7** + **5는 잠정 표기만**(재측정은 병합 후) · 범위 밖 문장 미변경 |

## 채번·착수 확인 (실측)

```bash
./scripts/next-task-number.sh B   # → TASK-B-396 (origin/TeamB_Dev에 TASK-B-396 파일 부재 0건)
git rev-parse --show-toplevel     # 전용 워크트리 (init 미실행)
git log --oneline -3 origin/TeamB_Dev  # f76f17d17(B-395 병합) 확인 후 신규 분기
date                              # Thu Nov 26 23:12:04 KST 2026
```

## 근거 조사 (전부 2026-11-26 직접 확인 — 미확인은 별도 표기)

| 조사 대상 | 근거(파일·줄) | 결과 |
|:--|:--|:--|
| run 통화 | `20261126090000_task_b381_ups_settlement_run.sql` 16행·52행 | `currency` `CHECK (currency='KRW')` **고정** → 환산 불필요 |
| run 항목 저장 | 동 파일 44~52행 `zen_ups_settlement_run_charges` | `line_no`·`name`·`amount`·`currency` tier별 보존 |
| run amounts 컬럼 성격 | 동 파일 31~41행 `zen_ups_settlement_run_amounts` + `src/lib/ups/settlement/build.ts` 151~156·184~198행 | **(정정) `base_freight`·`fuel_surcharge`·`surge_fee`는 원가가 아니라 tier별 판매가 구성요소**(`baseSellingPrice` 계열 기반) — 원가는 `zen_ups_actual_cost` · 표시는 `run_charges` 한정(항목명 근거) |
| M1 tier RLS | 동 파일 106·134·167행 정책 3개 | 행·tier 접근 통제 **반환 DTO(컬럼) 미통제** |
| src의 run 조회 | `git grep zen_ups_settlement_run -- src/` | **0건**(RPC `finalize_ups_settlement_run` 호출만) → 표시 DTO 경로 부재 |
| `getUpsActualCost` 호출처 | `git grep` (src) | **2곳**(오더정산 상세 page·실비 조정 폼 79행) — PR-4a가 폼 제거하면 1곳(**잠정**) |
| `getCostTypeLabel` | `src/lib/finance/settlement/cost-type-labels.ts` | 사용 2곳(오더 상세·실비 조정 폼) · `FREIGHT_ADJUSTMENT` **미등재** → 영문 fallback, "운임 조정" 표기 src·messages **0건** |
| 오더 상세 구현 | `orders/[orderId]/page.tsx` 57~58·578행 | `zen_order_costs` → `OrderFinanceSummary(initialCosts)` — **run 미사용 구조** |
| 경로 파일 | `finance/order-settlement/[orderId]`, `finance/daily-billing`, `ShipperDailyBillingClient`, `finance/statements(/id)`, `statement-excel(-data)`, `invoice-generator` | 현행 경로 확인 |
| PR-3·PR-4a | #1549·#1553 | **둘 다 OPEN(병합 전)** → 항목5 값은 잠정 |
| b375 마이그레이션 | `20261123100000_task_b375_drop_shipper_agency_select_rls.sql` | **완료**(2026-11-23), 롤백=iss589 정책 재생성(파일 주석) |
| B-377 정책 마이그레이션 | `git grep zen_ups_actual_cost -- supabase/migrations/` | **제거 마이그레이션 미존재**(생성 파일만) → 미작성 |
| B-379 2/2 | #1453 `status:open` | 설계 미확정 → 마이그레이션 **미작성** |
| RLS 매트릭스 테스트 | `tests/integration/task-b381-settlement-run-db.test.ts`(+actions test) | 재사용 대상 확인 |
| 오더 상세 양성 대조 데이터 소스 | 위 오더 상세 구현 행 | `initialCosts`(`zen_order_costs`) — run 전환 대상 |

## 요청 항목 1~7 대응 ( 어느 절·줄이 바뀌었는지 )

| # | 요청 | 반영 위치(갱신본 절) | 요약 |
|:-:|:--|:--|:--|
| 1 | 단일 원천 run + 신규 함수·환산 필요 여부 결정 | **§3-1 신설**(61~66행, §3 권장문 뒤) | 단일 원천 run 확정 · **환산 제거**(KRW CHECK 근거) · **가드 조회 함수 필요**(근거 3: src 조회 0건·**항목명은 `run_charges`에만**·반환 DTO 통제 — amounts 원가 전제 문장은 **정정 반영**) |
| 2 | §2 경로 표 현재 구조 교체 | **§2 표 전면 교체**(30~43행) + 확인 주석 3줄(45~47행 · 후속보완: ups-detail 행·`zen_ups_actual_charges`/`other_charges` 행 분리·원가 조인 경로 목표 1줄) | 오더정산 상세·오더 상세(현재 `zen_order_costs`→run 전환)·일별 청구·인보이스 PDF·**청구서 화면·Excel(Edward 결정)**·가드 조회·초안 저장소·PR-3/4a 반영 |
| 3 | §6 4번 관리자 초안 저장소 admin 전용 | **§6 4번 교체**(89행) | `zen_ups_actual_other_charges` = **admin 전용 입력·조회**, 표시는 run 경로가 담당(기존 "소유·admin으로 화주 표시" 서술 폐기) |
| 4 | §5 라벨 범위 재정의 + `freight_adjustment` 확인 | **§5 2줄 추가**(79~81행) + 후속보완 값 성격 1줄(82행) | 범위 = §2 "허용" 행 전체(청구서 화면·Excel 포함)·남는 경로(기존 행·비UPS·확인 필요) / `FREIGHT_ADJUSTMENT` 미등재·영문 fallback·"운임 조정" 0건 → **규칙 5 충돌 없음**(원가 거부 대상), 관리자 영문 fallback은 남는 경로에 포함 |
| 5 | DEF-B-165/166 재측정(**나중**) | **§7 잠정 1줄 추가**(96행) | **잠정 표기만 반영**: 호출처 2곳→PR-4a 후 1곳(잠정) · 재측정 **미실시(사유: PR-3·PR-4a 병합 전, Jaison 알림 시점 대기)** |
| 6 | 3건 적용 순서·롤백 한 표 | **§8-1 신설**(103~111행, §8 뒤) + 후속보완 **§8-2 정책 목표 상태 표**(114~123행) | b375(완료)·B-377(미작성, **앱 배포 뒤 마지막** 본체)·B-379 2/2(미작성) — 상태·롤백·순서 표 |
| 7 | 테스트 계획 | **§6 5번 교체**(90행) | RLS 매트릭스 재사용(`task-b381-settlement-run-db.test.ts`)·신규 가드 실DB 세션 테스트·**오더 상세 양성 대조(Edward)**·R-10 UI 대상에 오더 상세 포함 |

- **미작성 없음**(5는 "재측정"만 미실시 — 잠정 표기 자체는 반영). 요청하지 않은 정리·통일은 **0건**.

## 범위 밖 미변경 검증

- 원본(PR-1454 브랜치) 대비 diff = **8 hunk 전부 위 7개 항목 위치**(30·32~39·40·52·63·70~71·76·81행) — 헤더·**확정 규칙(JSJung)**·§1·§4·§9는 원본과 **md5 동일**.
- PR #1454 브랜치 **미접촉**(새 브랜치에서 원본 복사 후 갱신) · `src/`·마이그레이션 변경 **0건** · 이슈 라벨 `status:draft` **유지**.

## [보완 반영] Jaison 비차단 3건 (2026-11-26 23:36 검토)

| # | 요청 | 반영 위치 |
|:-:|:--|:--|
| 1 | `freight_adjustment` **표시 라벨** 확인 대상 정정 — 청구서 스냅샷(`zen_billing_statement_items`의 `freight_adjustment`·`charge_details`, M2)의 화주·대리점 표시 목표·라벨 택일 | **§2 1줄**(청구서 스냅샷 컬럼 표시 — 확정 필요) + **§5 선택지 1줄**(a 숨김 / b "부가운임" 합산 / c 별도 라벨 — **Aiden·JSJung 확정 필요**, 확정 전 `charge_details` 항목 한정 해석) · 근거: M2 12~13·92·258행, 화면 표시 코드 0건 직접 확인 |
| 2 | `zen_ups_actual_other_charges` admin 전용화의 적용 마이그레이션 표 누락 | **§8-1 행 추가**(B-377 정책 마이그레이션 ②) — **정책 변경 필요(근거): `shipper_agency_select_other_charges` 정책 존재 확인**(`20260817100000_task_b317_actual_cost_schema.sql` 56행 직접 확인) |
| 3 | 오타 2곳 + `getOrderAdditionalCharges`의 run 버전 한 줄 | §3-1 `이 갱신`·§5 `규칙 5와 충돌` 정정 + **§3-1 "읽는 run 버전" 한 줄**(최신 `version` — M3 119~123·153행 멱등 근거, `run_id`·`tier` 기준) |

## [후속 반영] Aiden 필수 3건 + 권고 4건 + 보류 (2026-11-27 00:46 지시)

| # | 요청 | 반영 위치(갱신본) |
|:-:|:--|:--|
| 필수1 | §3-1 ② 재작성 — `run_amounts`는 **판매가**임을 `build.ts` 줄 근거로, `run_charges` 한정 근거를 다시 세움, 원가 전제 문장 전부 정정(본 파일 포함) | **§3-1 ②**(65행): `build.ts` 151~156·184~198행 근거로 판매가 구성 확정 + 한정 근거를 ⓐ 항목명 `run_charges` 전용 ⓑ 규칙 4·청구 합계 정합 기준 재판단으로 교체 · 본 파일 26·44행 정정 |
| 필수2 | §2 경로 표 보완 3종 | **① ups-detail 행**(35행: `zen_order_costs` 68~71행 조회·`UpsOrderBreakdownCard` 160행) · **② 원가 조인 서버 액션 경로**: **목표 상태 1줄만**(46행, 전수 목록은 **Aiden 비공개 전달 대기 → 받은 뒤 반영, 미작성**) · **③ `zen_ups_actual_charges`/`zen_ups_actual_other_charges` 행 분리**(41~42행) |
| 필수3 | 정책 목표 상태 표 | **§8-2 신설**(114~123행): 2테이블 × 역할 허용/거부 표 — 허용 집합은 확정 규칙 1의 3역할과 정확히 일치, **현재 정책 서술 없음(목표 상태만)** |
| 권고4 | §8 (3)·§3 환산 문장에 대체 표기 | §8 본문(101행) "§8-1 표로 대체" · §3 권장문(57행) "환산 단계는 §3-1 결정으로 대체" |
| 권고5 | `run_charges` tier×역할 매트릭스 신규 | §6 5번 ①(90행): 기존 파일은 `run_charges` RLS 미단언 → **신규 추가**(Aiden 확인) 명시 |
| 권고6 | 줄 번호 인용 갱신 + §8-1 ② 롤백 조건 | 대응표 줄 번호 **6곳 갱신**(45~50행) · §8-1 ② 롤백셀에 **"기존 정의 복원 전 의도 대조(Aiden 비공개 상세)"** 명시 |
| 권고7 | 현재 상태 → 목표 상태 표현 | §3-1 ③(65행) "반환 DTO로 통제(목표)"로 교체 · §8-1 ② 비고(109행) "현재 정책 존재 확인" → **"목표: admin 3역할만 허용(§8-2)"** |
| 보류 | `freight_adjustment` 청구서 표시(결정 아님) | §5 선택지에 **값 성격 1줄 추가**(82행): **판매가 구성의 잔차(`target − 합계`, 음수 가능)** — Edward·JSJung 결정 대기 |

- **미작성**: 필수2 ②의 원가 조인 서버 액션 **전수 목록 반영**(사유: Aiden 비공개 상세 전달 대기 — 받은 뒤 공개 문서에는 목표 상태만 기재).
- 요청하지 않은 정리·통일 **0건**.

## [DoD]

- [x] 요청 1·2·3·4·6·7 반영 + 5 잠정 표기 (위 대응표 — 절·줄 대응)
- [x] 근거 없는 객체명·컬럼명 미기재 (전 항목 파일·줄 직접 확인, 미확인 0)
- [x] 범위 밖 문장 미변경(diff hunk 위치 + 미변경 섹션 md5)
- [x] 코드·마이그레이션 0 · R-14 · R-21(계정·운영값·절대경로 0)
- [x] `gh pr checks <PR>` 출력 인용 + 완료 절차 R-17 (문서 PR만, 병합 Jaison, `[설계 확정]`은 Aiden)

## [작업 결과]

- 갱신본 커밋: `e7de5717e9b24d1361a0eea8bc8a93a21fd67841`
- PR: [#1557](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1557) (`Refs #1451`·`Refs #1449`, base `TeamB_Dev`, 병합 Jaison, `[설계 확정]`은 Aiden) · head `6900d9fb1` · 이슈 라벨 `status:draft` 유지
