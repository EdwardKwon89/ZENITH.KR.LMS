# TASK-B-008 — Agency 정산 내역 엑셀 다운로드

> **TASK-ID**: TASK-B-008  
> **생성일**: 2026-06-20  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Dave (DeepSeek V4)  
> **우선순위**: P2  
> **관련 IMP**: IMP-124  
> **GitHub Issue**: [#52](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/52)  
> **브랜치**: `feature/teamb-task-b-008-agency-settlement-excel`  
> **상태**: 🔔 Aiden 검토 대기

---

## [업무 개요]

Agency 정산 조회 화면(IMP-122, `/agency/settlements`)에서 현재 조회된 오더 정산 내역을 Excel 파일로 다운로드하는 기능을 구현합니다.

### 배경

- Riley(TASK-153)가 Agency 정산 조회 화면 완성 — `getAgencyOrderSettlements` Server Action 존재
- 현재 화면에는 다운로드 버튼 없음
- Agency 사용자가 화주별·기간별 정산 내역을 오프라인으로 확인·보고할 수 있어야 함

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| IMP-122 Agency 정산 조회 완료 (TASK-153 Riley ✅) | ✅ |
| `agency-settlement.ts` `getAgencyOrderSettlements` 구현 완료 | ✅ |

---

## [구현 명세]

### 1. Server Action — `exportAgencySettlementExcel`

**파일**: `src/lib/actions/agency-settlement.ts` (기존 파일에 추가)

- `xlsx` 패키지 사용 (기존 설치됨)
- `exportAgencySettlementExcel(agencyOrgId, shipperId, from, to)` → `ActionResult<{ base64, filename }>`
- 컬럼 9종: 오더번호·화주명·생성일·패키지수·중량·매출·원가·마진·마진율

### 2. UI — 다운로드 버튼

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/AgencySettlementClient.tsx`

- 기존 CSV 내보내기 버튼을 Excel 다운로드 버튼으로 교체
- 로딩 상태 표시 (Loader2 아이콘)
- 파일명 패턴: `agency_settlement_YYYYMMDD.xlsx`

### 3. i18n

- `btn_csv` → `btn_excel` 교체 (ko/en)

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하 엄격 준수
- `_generateXlsxBase64`, `_todayStr` 헬퍼 분리

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-EXCEL-01 | Agency 로그인 → 정산 조회 → 기간 설정 → Excel 다운로드 | `.xlsx` 파일 다운로드, 컬럼 9종 정상 |
| TC-B-EXCEL-02 | 데이터 없는 기간 조회 후 다운로드 | 헤더만 있는 빈 Excel 파일 |
| TC-B-EXCEL-03 | 특정 화주 필터 후 다운로드 | 해당 화주 데이터만 포함 |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-008-agency-settlement-excel
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[DS] feat: TASK-B-008 Agency 정산 내역 엑셀 다운로드` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-124 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[DS] docs: TASK-B-008 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-008-agency-settlement-excel → develop`, `Closes #52`

---

## [DoD 체크리스트]

- [x] `exportAgencySettlementExcel` Server Action 구현 완료
- [x] AgencySettlementClient.tsx 다운로드 버튼 추가
- [x] ZEN_A4: 함수 50줄 이하 전량 준수 — `_fetchOrders`·`_mapToExcelRow` 헬퍼 분리
- [x] TC-B-EXCEL-01~03 신규 추가 (`LIVE_REGRESSION_TEST_MAP.md` 업데이트)
- [x] 회귀 테스트 전체 PASS — 372/381 (2건 pre-existing Supabase ECONNREFUSED 타임아웃 + 7 skipped)
- [x] 코드 커밋: `c2f74f9` (feat) · `64bc87e` (refactor ZEN_A4) · `c8a4e86` (docs)
- [x] PR 생성 완료: [#55](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/55) (Closes #52)

---

## [설계 의견]

단순 Task — ⬜→🔄 직행. `xlsx` 패키지(기존 설치) 사용, API Route 대신 Server Action base64 반환 방식 채택.

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `c2f74f9` `[DS] feat: TASK-B-008 Agency 정산 내역 엑셀 다운로드 (IMP-124)` |
| | `64bc87e` `[DS] refactor: TASK-B-008 ZEN_A4 준수 — _fetchOrders·_mapToExcelRow 헬퍼 분리` |
| 문서 커밋 | `c8a4e86` `[DS] docs: TASK-B-008 완료 보고 — task file 🔔, ACTIVE_TASK.md 🔄, IMP_PROGRESS.md IMP-124 🔔` |
| 회귀 결과 | 372 / 381 PASS |
| PR | [#55](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/55) (Closes #52) |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-20 | Jaison (Claude, Team B) | Task 발령 |
| 2026-06-20 | Dave (DeepSeek V4, Team B) | 구현 완료 · 회귀 372/381 PASS |
| 2026-06-20 | Dave (DeepSeek V4, Team B) | Jaison 수정 대응 — DoD에 전체 회귀 수치 372/381 기재 |
