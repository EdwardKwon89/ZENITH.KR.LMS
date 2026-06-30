# TASK-B-041 — TASK-B-033 §3 DoD 갱신 + UAT-19 재실행 Spec 보완

> **Task-ID**: TASK-B-041
> **생성일**: 2026-06-30
> **발령자**: Jaison (Team B AI 총괄)
> **담당**: Dave (구현)
> **우선순위**: P2
> **상태**: ⬜
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

> **주의**: §B는 현재 DEF-086/087 미구현으로 실제 UAT-19 통과가 불가하다.  
> spec 보완 자체는 즉시 가능. 실 실행 및 PASS는 Team A 구현 후 Baker TASK로 별도 발령.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| develop 최신 pull 완료 | 착수 시 수행 |
| TASK-B-039 완료 확인 (UAT-18-TEST-001 증거) | ✅ |

---

## 구현 범위

### Git 동기화 (착수 전 필수 — R-17 §0)

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-041-b033-s3-dod-uat19spec-dave
```

---

### §A — TASK-B-033 §3 DoD 소급 갱신

**수정 파일**: `.agent/tasks/TASK-B-033_260628_UPS특송UAT지원준비_JSJung.md`

1. `[ ] §3 WAREHOUSED UPS 오더 1건 준비` → `[x]` 체크
2. `[작업 결과]` 섹션에 Dave §3 항목 추가 (TASK-B-039 증거 인용):

```markdown
### Dave (§3) — 2026-06-30 (TASK-B-039 소급)

| 항목 | 내용 |
|:-----|:-----|
| 준비 오더 | `UAT-18-TEST-001` (id: `9ccc82e5-5814-4764-9f69-07c3e5100ec0`) |
| 상태 | WAREHOUSED → RELEASED (UAT-18-01 실행 후 전이) |
| transport_mode | `EXP` |
| 참조 | TASK-B-039 PR#147 머지 ✅ (squash `08c16d3`) |
```

---

### §B — UAT-19 Spec 보완 (`uat-19-invoice-pdf.spec.ts`)

현재 spec의 문제점:
- 버튼·테이블 미존재 처리가 `if (visible) skip` 방식으로 우회됨
- `zen_invoice_files` 테이블 조회 로직 미완성
- PDF 다운로드·파일명 검증 로직 미구현

**개선 방향**:
1. 현재 우회 코드를 `test.skip` 또는 `test.fixme` 로 명확히 표시
2. 기능 구현 후 실행될 **실제 검증 로직 주석** 추가 (버튼 클릭 → PDF 생성 → `zen_invoice_files` 적재 확인)
3. DB 검증 SQL을 실제 스키마에 맞게 정비:
   ```sql
   -- UAT-19-01 검증
   SELECT id, invoice_id, file_name, file_url, created_at
   FROM zen_invoice_files
   WHERE invoice_id = '[인보이스ID]';
   
   -- UAT-19-02 검증
   SELECT file_name FROM zen_invoice_files WHERE id = '[파일ID]';
   -- 기대 패턴: invoice_[오더번호]_[날짜].pdf
   ```
4. DEF-086/087 해소 후 `test.skip` → 실 테스트로 전환하는 주석 안내 추가

> ⚠️ spec 파일 수정 후 `rtk npm run test:regression` 으로 기존 테스트 영향 없음 확인 필수

---

### 커밋 및 PR (R-17 커밋 순서 필수 엄수)

```bash
# 1. 코드 커밋 (spec 개선 + UAT-19 문서)
git add tests/e2e/uat-19-invoice-pdf.spec.ts
git commit -m "[Dave] refactor: TASK-B-041 UAT-19 spec DEF-086/087 해소 후 재실행 대비 개선"

# 2. 문서 커밋 (TASK-B-033 §3 DoD 갱신 + task file + ACTIVE_TASK)
git add .agent/tasks/TASK-B-033_* \
        .agent/tasks/TASK-B-041_* \
        .agent/ACTIVE_TASK.md
git commit -m "[Dave] docs: TASK-B-041 완료 보고 — §3 DoD 소급 갱신 + UAT-19 spec 보완 🔔"

# 3. PR 생성
gh pr create \
  --title "[Dave] docs: TASK-B-033 §3 DoD 갱신 + UAT-19 재실행 spec 보완 (TASK-B-041)" \
  --body "## Summary
- §A: TASK-B-033 §3 DoD 소급 갱신 (UAT-18-TEST-001 증거 인용)
- §B: uat-19-invoice-pdf.spec.ts — DEF-086/087 구현 후 재실행 대비 개선

## Test plan
- [ ] TASK-B-033 §3 DoD [x] 체크 확인
- [ ] TASK-B-033 [작업 결과] Dave §3 섹션 추가 확인
- [ ] uat-19-invoice-pdf.spec.ts 개선 내용 확인
- [ ] 회귀 테스트 PASS (spec 수정으로 기존 테스트 영향 없음 확인)

References #135"
```

---

## DoD (Definition of Done)

- [ ] Git 동기화 + 브랜치 `feature/teamb-task-b-041-b033-s3-dod-uat19spec-dave` 생성
- [ ] §A: TASK-B-033 §3 DoD `[x]` 체크 완료
- [ ] §A: TASK-B-033 `[작업 결과]` Dave §3 섹션 추가 (UAT-18-TEST-001 id · TASK-B-039 PR#147 참조)
- [ ] §B: `uat-19-invoice-pdf.spec.ts` 개선 완료 (우회 코드 명확화 + 실 검증 로직 주석)
- [ ] `rtk npm run test:regression` PASS — 결과 기재
- [ ] 코드 커밋 해시 기재: `______`
- [ ] 문서 커밋 해시 기재: `______`
- [ ] PR 생성 (`References #135`)

---

## [설계 의견]

_Dave 착수 후 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Dave 완료 후 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-30 | Jaison (Team B AI 총괄) | TASK-B-041 신규 발령 — §3 DoD 소급 갱신 + UAT-19 재실행 spec 보완. Issue #135 연동. |
