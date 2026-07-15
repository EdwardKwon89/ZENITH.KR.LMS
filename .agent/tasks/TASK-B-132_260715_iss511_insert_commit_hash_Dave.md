# TASK-B-132: Issue #511 — task file 커밋 해시 자동 삽입 스크립트

**담당**: Dave
**생성일**: 2026-07-15
**우선순위**: P2
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `scripts/insert-commit-hash.sh` (신규) — task file 내 `TBD`/`<PLACEHOLDER>` 패턴을 현재 HEAD 해시로 자동 치환
2. `opencode.json` — `check-R17-DoD` 템플릿에 스크립트 사용 필수 단계 명시

### 스크립트 검증
```bash
# 성공 케이스: `TBD` → 실제 해시 치환
$ ./scripts/insert-commit-hash.sh /tmp/test-task.md
Inserted d22a5070df62ef351eef14d8e0f330b6e89dfd47 into /tmp/test-task.md (pattern: \`TBD\`)

# 실패 케이스: 매칭 라인 없음 → 에러 + 종료코드 1
$ ./scripts/insert-commit-hash.sh /tmp/test-task-fail.md
Error: No matching placeholder line found in /tmp/test-task-fail.md
Expected failure: 1
```
✅ 성공/실패 케이스 모두 정상 동작 확인

### 커밋
- `6f7cd17b75910d84fa6ae48cf6715bbfe0d2c709` — `[Dave] feat: TASK-B-132 Issue #511 — 커밋 해시 자동 삽입 스크립트`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/512

---

## [DoD Checklist]

- [x] scripts/insert-commit-hash.sh 신규 작성
- [x] opencode.json check-R17-DoD 템플릿 갱신
- [x] 스크립트 실행 검증 (성공/실패 케이스 모두)
- [x] CI Build PASS 확인
- [x] task file + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
