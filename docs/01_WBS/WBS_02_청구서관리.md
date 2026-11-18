# 청구서관리 WBS (오더정산 · 청구서 생성/관리)

> 작성: Jaison (Team B) | 작성일: 2026-11-18 | 상태: **확정(2026-11-18) — 에픽 #1364 / Task #1363·#1365~#1369 발령**
> 근거: [An_17_청구서관리_오더정산_청구서_설계.md](../02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md) (§3 모델, §5 API, §6 화면·메뉴, §10 확정 사항)
> 화면 설계: https://claude.ai/artifact/BqwRMAu3ixcrVQ8EjMQaKv
> R-01: 모든 작업에 수행 주체(Worker)와 검증 주체(Auditor)를 표기. 공수는 1인 기준 추정(일)이며 구현 에이전트 편차로 ±30% 가능.

---

## 0. 요약

| 구분 | 내용 |
|:--|:--|
| 목표 | UPS 최종 청구서 기반 **오더정산**(원가 확정) 후, 대상·월 차수별 **청구서 생성→발행→입금확인·마감**, Excel(A4) 저장 |
| 범위 | UPS 오더만 신규 방식. 기존 UPS 인보이스·비UPS 오더는 유지(Q4 확정) |
| 총 공수 | 약 **53일** (수기 화주 R11 반영 +3.2일, v0.3) (설계 3 + 구현 약 42 + 통합·전환 약 5, 구간 소계 합) |
| 임계 경로 | 1 설계 확정 → 2 오더정산 → 3 청구서 DB → 4 청구서 액션 → 5 화면·메뉴 → 8 통합 검증 |
| 병행 가능 | 6 PDF·메일은 4 이후 5와 병행. 3의 DB 설계는 2 구현과 병행 가능(마이그레이션 번호 충돌만 주의) |
| 외부 의존 | Resend 도메인 인증(#1189), DEF-150(#1356) 권한 가드 수정, 컷오버일 결정 |

Worker 후보: Dave / Baker / Mike (할당은 Task 발령 시 JSJung 확인). Auditor: Jaison. 머지(→TeamB_Dev): Jaison, TeamB_Dev→develop/main: Aiden 전속.

---

## 1. 설계 확정 (Phase A)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 1.1 | TASK-B-358(#1363) 설계 의견: 현행 실측(원가 입력 2경로, 컬럼 의미, 환율 조회) + 통합 대안 + 권장안 1개 | Dave | Jaison | 1.5 | — | task file `[설계 의견]`, 실측 근거, src/messages/migration diff 없음 |
| 1.2 | 설계 의견 검토·`[설계 확정]` 기재 | Jaison | JSJung | 0.5 | 1.1 | 확정 사항 기록, status:draft 해제 승인 |
| 1.3 | 추가 사항 3건 + 메뉴 설계를 #1363에 코멘트 전달 | Jaison | JSJung | 0.2 | 지금 | 이슈 코멘트(조회 권한, Excel A4, UPS 기간 조회, 메뉴) |
| 1.4 | DEF-150(#1356) 1.1·1.2 반영 여부 확인 | Jaison | Aiden | 0.3 | — | 구현 착수 전 충돌 없음 확인 |
| 1.5 | Ds-11 선반영(R-11/R-12): 신규 액션·RPC 명세 | Jaison 설계 → 구현 Worker가 PR에 반영 | Aiden | (3·4에 포함) | 1.2 | `docs/02_Analysis/Ds_11_API_상세_명세서.md` 갱신 |
| 1.6 | 설계 문서 `docs/02_Analysis/` 승격 여부 결정 | JSJung | Aiden | — | 1.2 | 승격 시 R-13/문서 링크 점검 |

마일스톤 **M1: 설계 확정** — 1.1~1.4 완료.

---

## 2. 오더정산 (Task 1)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 2.1 | 원가 계산 단일 순수 함수 `computeUpsActualCostKrw` (+7% 기본운임만, 상수 `UPS_COST_SURCHARGE_RATE`) | 구현 Agent | Jaison | 1.5 | M1 | 두 입력 경로(`recordActualCostAndFinalize`, `recordUpsActualCost`) 모두 이 함수 사용, 1.07 리터럴 제거 |
| 2.2 | 컬럼 의미 정리·원본 UPS 금액+적용 환율 스냅샷 저장 마이그레이션 | 구현 Agent | Jaison | 1.5 | 2.1 | 기존 행 데이터 보존, KRW가 `*_hkd`에 들어가던 혼용 해소, R-08-2 확인 |
| 2.3 | 오더 `cost_settlement_status`(NOT_SETTLED/SETTLED, settled_at/by) 컬럼 | 구현 Agent | Jaison | 0.5 | 2.2 | 마이그레이션, 기본값 NOT_SETTLED |
| 2.4 | 액션: `getOrdersForCostSettlement`, `markOrderCostSettled`, `unmarkOrderCostSettled` (DELIVERED만, 청구서 포함 전만 되돌리기) | 구현 Agent | Jaison | 2 | 2.3 | Ds-11 반영, logger 관측성(R-04 v1.2), 권한 Admin만 |
| 2.5 | 매출 재계산 검증: 청구중량 변경 시 기본운임·유류할증·급증 재계산, 기타 부가운임 그대로 전가 | 구현 Agent | Jaison | 1.5 | 2.4 | 기존 `recomputeRevenue` 정합성 점검, 불일치는 DEF 등록(R-18) |
| 2.6 | 화면 S1 오더정산 목록·S2 상세 + UPS 청구서 PDF 첨부 | 구현 Agent | Jaison | 3 | 2.4 | 화면 설계 준수, i18n 4로케일, R-10 증적 |
| 2.7 | 회귀 테스트 + 회귀 맵 갱신(R-09) | 구현 Agent | Jaison | 1.5 | 2.1~2.6 | `test:regression` 전체 PASS, LIVE_REGRESSION_TEST_MAP |

소계 약 11.5일. 마일스톤 **M2: 오더정산 머지**.

---

## 3. 청구서 DB (Task 2)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 3.1 | 마이그레이션: `zen_billing_statements`, `zen_billing_statement_items`(`UNIQUE(order_id, tier)`, 취소 시 cascade로 오더 해제) | 구현 Agent | Jaison | 1.5 | M1 | 항목은 금액 스냅샷 보관, `supabase db reset` 통과 |
| 3.2 | 채번 RPC: 청구서 번호·월 내 차수 순번 자동 | 구현 Agent | Jaison | 1 | 3.1 | 동시 생성 시 중복 없음 테스트 |
| 3.3 | RLS: 관리=발행자만, SELECT 3경로(본인 생성, 청구받은 발행·마감, Admin의 대리점 감독) | 구현 Agent | Jaison | 2 | 3.1 | 자기완결 fixture RLS 테스트(타 생성자 접근 불가, 화주 DRAFT 비노출, 감독 읽기 전용) |
| 3.5 | **수기 화주(R11)**: 헤더 `billed_party_type`·nullable `billed_org_id`·`billed_name/biz_no`·`billed_key` + CHECK, 채번 유일키를 `billed_key` 기준으로, 수기 대상 RLS(발행자·Admin 감독만) | 구현 Agent | Jaison | +0.7 | 3.1 | CHECK 위반·수기 청구서 타 대리점 접근 불가 RLS 테스트 |
| 3.4 | 마이그레이션 번호 충돌 점검(`next-task-number.sh` 등) 및 DB 최신화(R-08-2) | 구현 Agent | Jaison | 0.3 | 3.1 | 충돌 없음 증적 |

소계 약 4.8일. 마일스톤 **M3: 청구서 DB 머지**.

---

## 4. 청구서 액션 (Task 3)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 4.1 | `listBillableOrders` (대상·조회 기준·기간 필수, 정산완료·미포함·UPS만, 미정산 제외 건수) | 구현 Agent | Jaison | 1.5 | M2, M3 | 기간 누락·역전 거부, 대상 소속 검증 |
| 4.1b | **수기 화주(R11)**: `listAdhocShipperNames`, `listBillableOrders`의 `billedTarget`(ORG/ADHOC) — ADHOC은 `shipper_id=발행 대리점`·화주명 정규화 일치·사업자번호 선택 | 구현 Agent | Jaison | +1.5 | 4.1 | `agency_org_id` NULL 오더 포함 테스트, 표기 변형·타 대리점 오더 혼입 방지 테스트 |
| 4.2 | `createBillingStatement` (DRAFT 저장, 항목 스냅샷, 차수 자동) | 구현 Agent | Jaison | 2 | 4.1 | UNIQUE 충돌·동시성 테스트 |
| 4.3 | `cancelBillingStatement` (생성자·DRAFT만), `issueBillingStatement` (발행=확정, 이후 변경 불가) | 구현 Agent | Jaison | 1.5 | 4.2 | 상태 전이 위반 거부, 서버 강제 |
| 4.4 | `confirmStatementPayment` (전액만, 불일치 시 저장 안 함 → 마감) + 오더 `billing_status` 연동 | 구현 Agent | Jaison | 1.5 | 4.3 | 입금액 불일치 테스트 |
| 4.5 | `getBillingStatements`, `getBillingStatementDetail` (RLS 범위, 타 생성자는 존재 비노출) | 구현 Agent | Jaison | 1 | 4.2 | 조회 범위 3경로 테스트 |
| 4.6 | `exportBillingStatementExcel` (A4 세로, 너비 1페이지 맞춤, 좁은 여백, 제목행 반복, 인쇄영역, 시트2개) | 구현 Agent | Jaison | 2.5 | 4.5 | 라이브러리 선정(현행 의존성·Context7 확인), 출력 파일 인쇄 설정 검증 테스트 |
| 4.7 | Ds-11 반영(R-12), 회귀 테스트·맵 갱신 | 구현 Agent | Jaison/Aiden | 1.5 | 4.1~4.6 | `check:ds11` baseline 밖 신규 미반영 0 |

소계 약 11.5일. 마일스톤 **M4: 청구서 액션 머지**.

---

## 5. 화면·메뉴 (Task 4)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 5.1 | S3 청구서 목록(조회 범위 필터·범위 배지·Excel 버튼) | 구현 Agent | Jaison | 2 | M4 | 화면 설계 준수 |
| 5.2 | S4 청구서 생성(대상·월·UPS 오더 조회 기간·후보 선택·합계) | 구현 Agent | Jaison | 2.5 | M4 | 기간 필수 검증 UI |
| 5.2b | **수기 화주(R11)**: S4 청구 대상 방식 선택(등록/수기), 자동완성·유사명 칩·후보의 화주명 열, 청구서 표시명 스냅샷 입력 | 구현 Agent | Jaison | +1.0 | 5.2, 4.1b | 대리점 계정 수기 화주로 후보 조회·생성 스크린샷 |
| 5.3 | S5 청구서 상세(상태별 작업, 조회 전용 모드, Excel) | 구현 Agent | Jaison | 2 | M4 | 발행 시 확인 창, 발행 후 취소 버튼 없음 |
| 5.4 | 3개 경로 재사용 구성: `/finance/statements`, `/agency/statements`, `/shipper/statements` | 구현 Agent | Jaison | 1 | 5.1~5.3 | 서버에서 역할로 범위 결정 |
| 5.5 | 메뉴 추가(NaviSidebar), 경로 허용 목록(rbac·proxy·권한 화면) | 구현 Agent | Jaison | 1 | 5.4 | R-20 영향도 분석(인덱스 최신성 확인), `detect_changes` |
| 5.6 | i18n 4로케일(ko·en·zh·ja), Errors 키 | 구현 Agent | Jaison | 1 | 5.1~5.3 | 키 누락 0 |
| 5.7 | R-10 증적(역할별 스크린샷), `/admin/error-logs` 신규 오류 없음 확인 | 구현 Agent | Jaison | 1 | 5.5 | "에러 로그 확인 — 無" 명시 |

소계 약 10.5일(5.5~5.7 일부는 병행). 마일스톤 **M5: 화면·메뉴 머지**.

---

## 6. PDF·메일 (Task 5)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 6.1 | 청구서 PDF 생성·다운로드 | 구현 Agent | Jaison | 2 | M4 | A4 레이아웃, 마감 상태 포함 |
| 6.2 | 발행 시 이메일 발송 | 구현 Agent | Jaison | 1.5 | 6.1, **#1189 Resend 도메인 인증** | 도메인 미인증이면 착수 보류(블로커 라벨) |

소계 3.5일. 5와 병행 가능.

---

## 7. 레거시 정리·컷오버 (Task 6)

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 7.1 | 컷오버일 결정(출고확정일 기준 적용 시점) | JSJung·Aiden | Jaison | 0.2 | M2 | 결정 기록 |
| 7.2 | 기존 UPS 인보이스 화면·"UPS 사후 청구 관리"·일일청구 병행 정책 반영(메뉴 "(기존)" 표기, 숨김 시점) | 구현 Agent | Jaison | 1.5 | M5, 7.1 | 기존 데이터 변경 없음 |
| 7.3 | 컷오버 후 비UPS·기존 오더 영향 점검 | 구현 Agent | Jaison | 0.8 | 7.2 | 회귀 PASS |

소계 2.5일.

---

## 8. 통합 검증·릴리스

| WBS | 작업 | Worker | Auditor | 공수 | 선행 | 산출물·DoD |
|:--|:--|:--|:--|:-:|:--|:--|
| 8.1 | 전 구간 E2E(UPS 오더 정산 → 청구서 생성 → 발행 → 입금확인 → Excel) | 구현 Agent | Jaison | 1.5 | M5 | 로컬 Supabase(R-14), 결과물 `docs/99_Manual/` 하위(R-13) |
| 8.2 | 권한 교차 시나리오(Admin·대리점·화주, 타 생성자 접근 불가) 수동 검증 | 구현 Agent | Jaison | 1 | M5 | 역할별 증적 |
| 8.3 | R-04 LIVE 체크리스트 자가 점검 + 전체 회귀 | 구현 Agent | Jaison | 0.5 | 8.1 | `test:regression` 전체 PASS |
| 8.4 | TeamB_Dev → develop 병합 | Aiden | Aiden | — | 8.3 | Aiden 전속, 머지 전 실제 CI 확인 |

소계 3일.

---

## 9. 일정 (설계 확정일 W0 기준, 구현 Agent 1명 순차 시 / 2명 병행 시)

| 단계 | 공수 | 순차 | 2명 병행 안 |
|:--|:-:|:-:|:--|
| A 설계 확정 | 3 | W0 | W0 |
| 2 오더정산 | 11.5 | W1~W3 | A: W1~W3 |
| 3 청구서 DB | 4.8 | W3~W4 | B: W1~W2 (2와 병행) |
| 4 청구서 액션 | 11.5 | W4~W6 | B: W2~W4 후반(2 머지 대기 구간 있음) |
| 5 화면·메뉴 | 10.5 | W6~W8 | A·B: W5~W6 |
| 6 PDF·메일 | 3.5 | W8~W9 | B: W5 병행 |
| 7 레거시 정리 | 2.5 | W9 | W7 |
| 8 통합 검증 | 3 | W9~W10 | W7 |
| **합계** | **약 50일** | **약 10주** | **약 7주** |

※ 합계는 구간 소계의 합입니다. 실제 일정은 Worker 투입 인원·검수 대기 시간이 좌우하므로 **설계 확정 후 Task 발령 시점에 재산정**합니다.

---

## 10. 리스크·선행 조건

| # | 리스크 | 영향 | 대응 |
|:-:|:--|:--|:--|
| 1 | DEF-150(#1356)이 같은 파일(`ups-actual-cost.ts` 등)의 권한 가드 수정 중 | 2.x 머지 충돌 | 1.4에서 반영 순서 확정, 충돌 시 DEF-150 선머지 |
| 2 | 마이그레이션 번호 충돌(다중 에이전트) | 3.x·2.2 지연 | 착수 직전 번호 확인 |
| 3 | 기존 두 입력 경로의 저장 값 의미 혼용 | 2.2 데이터 정정 복잡 | 1.1 실측에서 기존 행 분포 확인 후 정정 전략 확정 |
| 4 | Resend 도메인 미인증(#1189) | 6.2 보류 | 6.1 선행, 메일은 도메인 완료 후 |
| 5 | 3개 경로 재사용 시 권한 우회(UI 숨김만) | 타 생성자 청구서 노출 | 서버 RLS와 액션에서 이중 차단, 5.7·8.2 교차 검증 |
| 6 | 구현 Agent 반려 반복(과거 위반 이력) | 일정 지연 | Task 배정 시 담당자별 위반 이력 사전경고·착수+완료 체크리스트 포함(기존 정책) |
| 7 | GitNexus 인덱스 stale | 영향도 분석 신뢰도 | R-20 재검증 절차로 파일 직접 확인 |

---

## 11. 의사결정 필요 (JSJung)

1. Worker 할당: 구현 Agent 1명 순차 vs 2명 병행(2·3 병행) — 일정과 충돌 위험의 균형
2. 컷오버일(7.1) 결정 시점: 오더정산 머지 직전 권장
3. 설계 문서 `docs/02_Analysis/` 승격 시점(1.6)
4. GitHub Issue 발령 방식: Task 6개 + 에픽 1개(추적용) 권장

---

## 12. 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:--|:--|:--|:--|
| v0.1 | 2026-11-18 | Jaison | 초안 — 분석·설계(§3~§10) 기반 |
| v0.2 | 2026-11-18 | Jaison | 확정 — 에픽 #1364, Task: ①#1363(B-358) ②#1365(B-359) ③#1366(B-360) ④#1367(B-361) ⑤#1368(B-362) ⑥#1369(B-363). 담당(안): Dave/Mike/Dave/Baker/Gale/Mike. 컷오버일은 오더정산 병합 직전 결정 |
