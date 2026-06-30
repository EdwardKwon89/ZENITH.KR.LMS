# TASK-B-041 — TASK-B-033 §3 DoD 갱신 + UAT-19 재실행 Spec 보완

> **Task-ID**: TASK-B-041
> **생성일**: 2026-06-30
> **발령자**: Jaison (Team B AI 총괄)
> **담당**: Dave (구현)
> **우선순위**: P2
> **상태**: 🔔
> **GitHub Issue**: [#135](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/135)
> **연관 Task**: TASK-B-033 (§3 DoD), TASK-B-039 (UAT-18 ✅), DEF-086/087
> **전제조건**: 없음 (즉시 착수 가능)

---

## 업무 개요

두 가지 목표를 처리한다.

### §A — TASK-B-033 §3 DoD 소급 갱신

TASK-B-039에서 Dave가 `UAT-18-TEST-001` (WAREHOUSED UPS 오더)를 실제로 준비하여 사용했음에도
TASK-B-033 §3 DoD `[ ] §3 WAREHOUSED UPS 오더 1건 준비` 가 미체크 상태이다.
TASK-B-039 증거를 참조하여 §3 DoD를 소급 갱신하고, TASK-B-033 `[작업 결과]` Dave §3 섹션을 추가한다.

### §B — UAT-19 재실행 대비 Spec 보완

현재 `tests/e2e/uat-19-invoice-pdf.spec.ts` 는 DEF-086/087(기능 미구현) 상황에서 작성된 우회 코드를 포함한다.
Team A가 Invoice PDF 기능(DEF-086/087)을 구현하면 Baker가 UAT-19를 재실행한다.
그 전에, spec 파일을 실제 PDF 기능이 있을 때 정상 동작하도록 **개선된 버전**으로 준비한다.

---

## 구현 범위

### §A — TASK-B-033 §3 DoD 소급 갱신

**수정 파일**: `.agent/tasks/TASK-B-033_260628_UPS특송UAT지원준비_JSJung.md`

1. `[ ] §3 WAREHOUSED UPS 오더 1건 준비` → `[x]` 체크
2. `[작업 결과]` 섹션에 Dave §3 항목 추가 (TASK-B-039 증거 인용)

### §B — UAT-19 Spec 보완 (`uat-19-invoice-pdf.spec.ts`)

1. 우회 코드 → `test.skip(true, 'DEF-086/087 미구현')` 로 명확히 표시
2. 기능 구현 후 실행될 **실제 검증 로직 주석** 추가 (버튼 클릭 → PDF 생성 → `zen_invoice_files` 적재 확인)
3. DB 검증 SQL을 실제 스키마에 맞게 정비
4. DEF-086/087 해소 후 `test.skip` → 실 테스트로 전환 안내 추가

---

## DoD (Definition of Done)

- [x] Git 동기화 + 브랜치 `feature/teamb-task-b-041-b033-s3-dod-uat19spec-dave` 생성
- [x] §A: TASK-B-033 §3 DoD `[x]` 체크 완료
- [x] §A: TASK-B-033 `[작업 결과]` Dave §3 섹션 추가 (UAT-18-TEST-001 id · TASK-B-039 PR#147 참조)
- [x] §B: `uat-19-invoice-pdf.spec.ts` 개선 완료 (우회 코드 → `test.skip` + 실 검증 로직 주석)
- [x] `npm run test:regression` PASS — **387/387 PASS** (69 files)
- [x] 코드 커밋 해시: `41e68cb`
- [x] 문서 커밋 해시: `ba655e6`
- [x] PR 생성 (`References #135`) — PR#151

---

## [작업 결과]

### §A — TASK-B-033 §3 DoD 소급 갱신

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| TASK-B-033 §3 DoD `[x]` 체크 | ✅ | `§3 WAREHOUSED UPS 오더 1건 준비` → `[x]` |
| TASK-B-033 `[작업 결과]` Dave §3 추가 | ✅ | UAT-18-TEST-001 (id: `9ccc82e5-...`) 인용 |

### §B — UAT-19 Spec 보완

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| 기존 우회 코드(console.warn+return) → `test.skip` | ✅ | UAT-19-01/02 모두 `test.skip(true, 'DEF-086/087 미구현')` |
| 실 검증 로직 주석 추가 | ✅ | 버튼 클릭 → PDF 다운로드 → DB 검증 순서 주석화 |
| DB 검증 SQL 정비 | ✅ | `zen_invoice_files`, `zen_order_rate_snapshots` 스키마 맞춤 |
| 회귀 테스트 | ✅ | **387/387 PASS** (69 files, vitest) |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-30 | Jaison (Team B AI 총괄) | TASK-B-041 신규 발령 — §3 DoD 소급 갱신 + UAT-19 재실행 spec 보완 |
| 2026-06-30 | Dave (구현) | 작업 완료 + PR 생성 |
