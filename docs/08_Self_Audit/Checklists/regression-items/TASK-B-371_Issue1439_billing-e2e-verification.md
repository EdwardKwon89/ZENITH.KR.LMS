# TASK-B-371 회귀 항목 — 청구서관리 전 구간 통합 검증 (Issue #1439)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1439 (WBS 8.1 전 구간 E2E · 8.2 권한 교차 · 8.3 전체 회귀) |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 산출 스펙 | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` + fixture `tests/e2e/b371-fixture.ts`·`b371-login.ts` (**CI 미실행/수동** — Playwright) |
| 실행 환경 | **로컬 Supabase + 실제 Chromium(Playwright)** — R-09 v3.10에 따라 **CI 미실행/수동** |
| 검증 차원 (231 D1~D9) | `D1(정합성), D5(권한/RLS), D6(상태 전이), D8(동시성·차단)` |

> **CI 미실행(수동)**: `tests/e2e/` 스펙은 vitest 회귀에 포함되지 않는다(R-09 v3.10). 실행은
> `npx playwright test tests/e2e/e2e-31-billing-flow-verification.spec.ts`(로컬 dev 서버 + 로컬 Supabase) — **CI 미실행(수동)**.

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-371-01 | **A1** Admin 오더정산 S1→S2 입력·임시저장·정산 완료 | 확인 모달 통과 후 `cost_settlement_status='SETTLED'`(실DB 단언) | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | **CI 미실행(수동)** |
| TC-371-02 | **A2-1** 대리점 후보 조회 — 정산 오더 **포함** + **미정산 제외** + 안내문 + 등록 대상 청구서 생성 | 후보 4건(미정산 1건 제외) · `선택 1건/후보 4건` · 합계 126,000원 · DRAFT 헤더 126,000.00 | 동일 | **CI 미실행(수동)** |
| TC-371-03 | **A2-2** 수기 화주명(R11) 오더 포함 청구서 생성 | `billed_party_type='ADHOC'`, `billed_name` 일치, DRAFT | 동일 | **CI 미실행(수동)** |
| TC-371-04 | **A2-3** 타 생성자 차단용 청구서(대리점 B) 생성 | `issuer_org_id = agencyB` | 동일 | **CI 미실행(수동)** |
| TC-371-05 | **A3** 발행 → 화주 RECEIVED 읽기전용 → 입금확인 | DRAFT→ISSUED(CONFIRM 모달)→CLOSED · 화주 화면 `조회 전용` + **변형 버튼 0개** · Excel 링크는 남음 · `paid_amount=126000`, `paid_date=오늘(KST)` | 동일 | **CI 미실행(수동)** |
| TC-371-06 | **A4-1/A4-2** Excel **실제 다운로드** → **exceljs 재파싱** → DB 대조 (대리점·화주) | 시트 `['청구서','오더별 상세']` · 요약 공급가액=헤더 총액(센트) · 항목 행 수=DB · 합계 행 숫자·굵게 · 오더번호 매칭 · 두 파일 바이트 동일 | 동일 | **CI 미실행(수동)** |
| TC-371-07 | **A5** 정산 되돌리기 3케이스 | ① 미포함 → 성공(`NOT_SETTLED`) ② 청구서 포함 → **alert 차단 + 상태 불변** ③ DRAFT 포함 → 차단 → 청구서 취소 → **성공** | 동일 | **CI 미실행(수동)** |
| TC-371-08 | **B1/B2** 타 생성자 상세·Excel 차단 | 목록 미노출 · 상세 `청구서를 찾을 수 없습니다.` · Excel **HTTP 404** (존재 비노출) | 동일 | **CI 미실행(수동)** |
| TC-371-09 | **B3** **서버 액션 직접 호출 거부** (UI 숨김 무관) | 화주가 `cancelBillingStatement` 직접 POST → `권한이 없습니다.` · 타 생성자 → `청구서를 찾을 수 없습니다.` | 동일 | **CI 미실행(수동)** |
| TC-371-10 | **B4** 대리점·화주 `/finance/order-settlement`(S1·S2) 직접 입력 | 8회 전부 소속 라우트로 차단(`/ko/agency`, `/ko/orders`) — 실측 기록 파일 | 동일 | **CI 미실행(수동)** |
| TC-371-11 | **B5** Admin AGENCY 발행분 감독 | `감독 조회` 배지 + `조회 전용` + 변형 버튼 0개 + Excel **200** | 동일 | **CI 미실행(수동)** |
| TC-371-12 | **B6** 역할×화면 매트릭스 40셀 실측 | JSON 증적 `B6_역할x화면_매트릭스.json` (5역할×8화면) | 동일 | **CI 미실행(수동)** |

**회귀 검증 (2026-11-23, 실측)**:
- **E2E 전체**(**CI 미실행/수동**): `npx playwright test tests/e2e/e2e-31-billing-flow-verification.spec.ts` → **14/14 PASS (4.4분)** · B6 매트릭스 **40셀 error 0**
- **전체 회귀**: `npm run test:regression` → **293 files / 2,248 tests 전부 PASS** (중간1회2파일 일시 실패 → 단독 재실행 63/63, 최종 전체 PASS — 공유 로컬 DB 병렬 접촉으로 판단)
- **빌드**: `npm run build` → **exit 0** (`✓ Compiled successfully in 22.8s`) — 본 결함 유형은 회귀가 아니라 build에서만 잡히므로 별도 기재
- 점검: `check:ds11` OK · `check:lrtm` OK · `check:doc-links` OK · `check:audit` OK · `check:vendor` OK · `tsc` 관련 0건
- **R-04 Runtime Console Audit**(LIVE_PHASE_3 `[SAR-2026-04-19-001]`): 40셀 콘솔 수집 → **`pageerror` 0건** · `console.error` 100건은 전부 React 중복 key 경고이고 **`/ko/dashboard`에서만** 발생(청구서·정산 화면 0건) → **DEF-B-163 등록**
- **R-04 Link Integrity**(SAR-001): `check:doc-links` OK

**되돌리기 검증 (조건별, 2026-11-23 실측 — 임시 변경 → 측정 → 원복 + `git diff` 빈 출력 확인)**:
| 조건 | 되돌리기 내용 (로컬만, 커밋 금지) | 결과 |
|:--|:--|:--|
| **R-P** | `proxy.ts`의 비-PLATFORM `/finance` 허용 **+** `order-settlement` 2페이지의 `ADMIN_ROLES` 가드 제거 | **FAIL** — `Expected "/ko/agency"` / `Received "/ko/finance/order-settlement"` |
| **R-S** | Excel 데이터 로더의 미존재 404 가드 → 500 | **FAIL** — `Expected 404` / `Received 500` (B1 존재 비노출 단언 붕괴) |
| (참고) | `proxy.ts`만 허용 | **FAIL 안 함** — 페이지 가드→`/ko/dashboard`→대시보드가 `/ko/agency`로 정규화해 최종 경로가 같아짐 → **두 게이트를 함께 되돌려야 차별력 발생**(실측) |
| (원복) | `git diff src/lib/auth/proxy.ts "src/.../order-settlement/" src/lib/finance/billing/statement-excel-data.ts` → **빈 출력** + B4·B1/B2 재실행 PASS | ✅ |

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
