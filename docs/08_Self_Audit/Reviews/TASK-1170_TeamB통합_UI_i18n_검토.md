# TASK-1170 — TeamB_Dev 통합 사전 검토 ①: UI·페이지·i18n

- **검토 대상 커밋**: `origin/TeamB_Dev` (`83bb486f`) vs `origin/develop`
- **검토 범위**: 화면 컴포넌트 15개 · 페이지 11개 · i18n 4개 (총 30개 파일)
- **기준 문서**: `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md` (§6), `docs/01_WBS/WBS_02_청구서관리.md`
- **검토 일자**: 2026-11-23 | **검토자**: Riley (`[Gemini]`) | **검증자**: Aiden
- **검토 성격**: 읽기 전용 정적 코드 검토 (코드 실행 미수행, Team B 파일 수정 0건)

---

## 1. 종합 의견

`origin/TeamB_Dev` (`83bb486f`)의 UI·페이지·i18n 30개 파일을 전수 확인한 결과, **통합을 즉시 차단할 Blocker 결함은 발견되지 않았습니다.**
- `orders/[orderId]/page.tsx`, `BillingConfirmModal.tsx`, `ShipperDailyBillingClient.tsx`, `StatementDetail.tsx`, `StatementsList.tsx` 등에서 비관리자 원가·내부 계산(`+7%`) 노출 차단 및 서버 응답 `scope === 'MINE'` 기반 버튼 제어, 확인 모달의 되돌릴 수 없음 안내(`issueWarning`, `cancelWarning`, `markConfirmBody`)가 일관되게 적용되었습니다.
- `'use server'` 비async export를 클라이언트 컴포넌트에서 import하는 `DEF-B-162` 유형 위반도 0건입니다.
- 다만 **Major 3건**(① `/finance/statements` 라우트 가드의 `MANAGER` 역할 및 `/${locale}` 리다이렉트 prefix 누락, ② `An_17 §6-2·§6-3` 설계 대비 S1·S2 일부 UI 항목 간소화/미표시, ③ JSX·toast 내 `'차'`·`'원'` 한국어 하드코딩)과 **Minor 5건**을 확인했으며, 통합 전후 보완 여부 결정을 권장합니다.

---

## 2. 검토 대상 파일 목록 (30개 전수)

| # | 구분 | 파일 경로 | 상태 | 확인 방법 |
|:-:|:--|:--|:--|:--|
| 1 | i18n | `messages/ko.json` | 확인함 | `git show 83bb486f` + Node 키 대칭/플레이스홀더 전수 스크립트 |
| 2 | i18n | `messages/en.json` | 확인함 | `git show 83bb486f` + Node 키 대칭/플레이스홀더 전수 스크립트 |
| 3 | i18n | `messages/zh.json` | 확인함 | `git show 83bb486f` + Node 키 대칭/플레이스홀더 전수 스크립트 |
| 4 | i18n | `messages/ja.json` | 확인함 | `git show 83bb486f` + Node 키 대칭/플레이스홀더 전수 스크립트 |
| 5 | 페이지 | `src/app/[locale]/(dashboard)/agency/statements/page.tsx` | 확인함 | `git show 83bb486f` 전문(19줄) |
| 6 | 페이지 | `src/app/[locale]/(dashboard)/agency/statements/new/page.tsx` | 확인함 | `git show 83bb486f` 전문(40줄) |
| 7 | 페이지 | `src/app/[locale]/(dashboard)/agency/statements/[id]/page.tsx` | 확인함 | `git show 83bb486f` 전문(19줄) |
| 8 | 페이지 | `src/app/[locale]/(dashboard)/finance/statements/page.tsx` | 확인함 | `git show 83bb486f` 전문(20줄) |
| 9 | 페이지 | `src/app/[locale]/(dashboard)/finance/statements/new/page.tsx` | 확인함 | `git show 83bb486f` 전문(35줄) |
| 10 | 페이지 | `src/app/[locale]/(dashboard)/finance/statements/[id]/page.tsx` | 확인함 | `git show 83bb486f` 전문(19줄) |
| 11 | 페이지 | `src/app/[locale]/(dashboard)/shipper/statements/page.tsx` | 확인함 | `git show 83bb486f` 전문(20줄) |
| 12 | 페이지 | `src/app/[locale]/(dashboard)/shipper/statements/[id]/page.tsx` | 확인함 | `git show 83bb486f` 전문(19줄) |
| 13 | 페이지 | `src/app/[locale]/(dashboard)/finance/order-settlement/page.tsx` | 확인함 | `git show 83bb486f` 전문(36줄) |
| 14 | 페이지 | `src/app/[locale]/(dashboard)/finance/order-settlement/[orderId]/page.tsx` | 확인함 | `git show 83bb486f` 전문(161줄) |
| 15 | 페이지 | `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` | 확인함 | `git diff origin/develop...83bb486f` (632줄 파일 변경부 확인) |
| 16 | 컴포넌트 | `src/components/finance/BillingConfirmModal.tsx` | 확인함 | `git diff origin/develop...83bb486f` (330줄 파일 변경부 확인) |
| 17 | 컴포넌트 | `src/components/finance/ShipperDailyBillingClient.tsx` | 확인함 | `git diff origin/develop...83bb486f` (814줄 파일 변경부 확인) |
| 18 | 컴포넌트 | `src/components/finance/order-settlement/OrderSettlementList.tsx` | 확인함 | `git show 83bb486f` 전문(177줄) |
| 19 | 컴포넌트 | `src/components/finance/order-settlement/OrderSettlementDetail.tsx` | 확인함 | `git show 83bb486f` 전문(430줄) |
| 20 | 컴포넌트 | `src/components/finance/order-settlement/index.ts` | 확인함 | `git show 83bb486f` 전문(5줄) |
| 21 | 컴포넌트 | `src/components/finance/order-settlement/types.ts` | 확인함 | `git show 83bb486f` 전문(97줄) |
| 22 | 컴포넌트 | `src/components/finance/statements/Badges.tsx` | 확인함 | `git show 83bb486f` 전문(43줄) |
| 23 | 컴포넌트 | `src/components/finance/statements/StatementCreate.tsx` | 확인함 | `git show 83bb486f` 전문(343줄) |
| 24 | 컴포넌트 | `src/components/finance/statements/StatementDetail.tsx` | 확인함 | `git show 83bb486f` 전문(164줄) |
| 25 | 컴포넌트 | `src/components/finance/statements/StatementModals.tsx` | 확인함 | `git show 83bb486f` 전문(146줄) |
| 26 | 컴포넌트 | `src/components/finance/statements/StatementsList.tsx` | 확인함 | `git show 83bb486f` 전문(210줄) |
| 27 | 컴포넌트 | `src/components/finance/statements/index.ts` | 확인함 | `git show 83bb486f` 전문(8줄) |
| 28 | 컴포넌트 | `src/components/finance/statements/page-helpers.ts` | 확인함 | `git show 83bb486f` 전문(57줄) |
| 29 | 컴포넌트 | `src/components/finance/statements/types.ts` | 확인함 | `git show 83bb486f` 전문(99줄) |
| 30 | 컴포넌트 | `src/components/layout/NaviSidebar.tsx` | 확인함 | `git diff origin/develop...83bb486f` (423줄 파일 변경부 확인) |

---

## 3. 발견 표

| # | 심각도 | 구분 | 위치 (`파일:줄`) | 근거 인용 / 내용 | 구분 |
|:-:|:--|:--|:--|:--|:--|
| 1 | **Major** | 역할·라우팅 일치 | `src/components/finance/statements/page-helpers.ts:25, 53` | `roles: [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN]` — `order-settlement`는 `['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER']`를 허용하는 반면 `/finance/statements`는 `MANAGER`가 제외됨. 또한 `redirect('/dashboard')`에 `/${locale}` prefix가 누락됨(`order-settlement/page.tsx:16`은 `redirect(\`/${locale}/dashboard\`)`). | 확인함 |
| 2 | **Major** | 화면 ↔ 설계 일치 | `src/components/finance/order-settlement/OrderSettlementDetail.tsx:334, 539, 568-570` / `OrderSettlementList.tsx:151-161` | `An_17 §6-3` S2 설계의 `기타 부가운임 [+행추가] [삭제]` 대신 `otherCharges` 단일 숫자 입력으로 구현되었고, `원가(KRW): 기본·유류·급증·기타 = 합` 항목별 분해 대신 `previewTotal` 총합 1줄만 표시됨. 또한 `An_17 §6-2` S1의 정산완료 행 `청구서 포함 여부 아이콘(📄)` 표시가 `OrderSettlementList`에 미구현됨(후속 보완 여부 확인 필요). | 확인함 |
| 3 | **Major** | i18n 하드코딩 | `src/components/finance/statements/StatementsList.tsx:146-147` / `StatementDetail.tsx:80` / `StatementCreate.tsx:175` | `{formatPeriod(row.periodYear, row.periodMonth)} {row.roundNo}차`, `{formatKrw(row.totalAmount)}원`, ``toast.success(`${res.statementNo} · ${res.roundNo}차`)``에 `'차'`, `'원'` 한국어가 JSX/toast에 직접 하드코딩되어 `en`/`zh`/`ja` 로케일에서도 한국어로 노출됨. | 확인함 |
| 4 | **Minor** | 화면 ↔ 설계 일치 | `src/components/finance/statements/StatementDetail.tsx:57-84` / `types.ts:56-75` | `An_17 §6-6` S5 설계의 `[PDF 다운로드]`(WBS Task 5로 분리)와 `CLOSED`(마감) 상태 `입금일/확인자 표시`가 미포함(`StatementDetail` 타입에 `paidAt`/`closedBy` 필드 없음). | 확인함 |
| 5 | **Minor** | i18n 하드코딩 | `src/components/finance/BillingConfirmModal.tsx:54, 123, 292` | `useState('청구확정')`, ``toast.success(`청구확정 완료: ${orderNo} (총 ₩${confirmedTotal.toLocaleString()})`)``, `'총 합계 (KRW)'` 한국어 하드코딩 잔존. | 확인함 |
| 6 | **Minor** | 입력 유효성 | `src/components/finance/order-settlement/OrderSettlementDetail.tsx:512-542` / `StatementCreate.tsx:246, 250` | `OrderSettlementDetail` 중량·치수·금액 `<ZenInput type="number">`에 `min="0"` 미지정. `StatementCreate` `year`/`month` 입력에 `min`/`max` 미지정(서버 검증은 존재하나 UI 입력 제한 누락). | 확인함 |
| 7 | **Minor** | 메뉴 라벨 일치 | `src/components/layout/NaviSidebar.tsx:125, 127` / `messages/ko.json` | `An_17 §6-5c`는 기존 메뉴에 `"(기존)"` 접미를 명시했으나, `shipper_invoices_nav`만 `"청구서 조회(기존)"`이 반영되었고 `finance_daily_billing`(`"화주별 일별 청구"`), `finance_ups_actual_charges`(`"UPS 사후 청구 관리"`)에는 미적용. | 확인함 |
| 8 | **Minor** | ZEN_A4 (함수 길이) | `OrderSettlementDetail.tsx:74-429` (355줄) / `StatementCreate.tsx:55-342` (287줄) / `StatementDetail.tsx:24-213` (189줄) / `StatementsList.tsx:27-209` (182줄) / `OrderSettlementList.tsx:24-174` (151줄) / `finance/order-settlement/[orderId]/page.tsx:30-160` (130줄) | 파일 길이 1,500줄 이하 기준은 26개 전체 충족했으나(최대 `ShipperDailyBillingClient.tsx` 814줄), 주요 컴포넌트·페이지 함수가 ZEN_A4 기준(50줄 이하)을 초과함. | 확인함 |
| 9 | **Info** | DEF-B-162 점검 | `OrderSettlementList.tsx:11`, `OrderSettlementDetail.tsx:13-19`, `BillingConfirmModal.tsx:6`, `StatementCreate.tsx:11-17`, `StatementModals.tsx:9` | `'use server'` 파일(`ups-actual-cost.ts`, `billing-statements.ts`)의 `export` 전수 대조 결과, 클라이언트 컴포넌트는 `async function` 또는 `type`/`interface`만 import하고 있으며 비async 값 export import 0건. | 확인함 |
| 10 | **Info** | 보안/노출 관점 | `orders/[orderId]/page.tsx:567`, `BillingConfirmModal.tsx`, `ShipperDailyBillingClient.tsx`, `StatementDetail.tsx`, `StatementsList.tsx` | 신규/변경 UI·페이지에서 비관리자 원가 노출 및 클라이언트 `+7%` 계산 제거 확인 — 신규 보안 이상 없음. | 확인함 |

---

## 4. i18n 4개 로케일 키 대칭 전수 확인 결과

- **실행 명령** (`83bb486f` vs `origin/develop`):
  ```bash
  node -e "/* git show 83bb486f:messages/{ko,en,zh,ja}.json 파싱 후 leaf 키 대칭 및 {param} 플레이스홀더 비교 */"
  ```
- **결과 요약** (`[확인함]`):
  - 전체 고유 leaf 키 수: **1,198개** (`ko` 1,155 / `en` 1,154 / `zh` 648 / `ja` 636)
  - `origin/develop` 대비 **신규/변경 키 188개**: 4개 로케일(`ko`·`en`·`zh`·`ja`) **누락 0건**, 영문 미번역 동일값(`ko==en`, `zh==en`, `ja==en`) **0건**, `{param}` 플레이스홀더 불일치 **0건**
  - *(참고)* 기존 베이스라인(레거시 네임스페이스 `Support`, `Pending`, `Common` 등)의 미번역 누락(`ko` 43 / `en` 44 / `zh` 550 / `ja` 562)은 이번 TeamB_Dev 변경 이전부터 존재하던 기존 상태임.
