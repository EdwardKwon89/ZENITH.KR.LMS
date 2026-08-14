# ACTIVE_TASK — ZENITH_LMS 작업 현황 미러

> **프로젝트**: ZENITH_LMS
> **문서 역할**: GitHub Issue 현황 열람용 자동 미러 (참고용 — 진실 공급원 아님)
> **참조 규칙**: GOV_COMMON.md R-17 (v3.0, 2026-08-14 GitHub Issue 단일화 개편)
> **과거 버전**: 팀별 수기 상세 표·Agent 현황 섹션은 2026-08-14부로 폐지되었습니다. 실제 활동보다 갱신이 계속 뒤처져 신뢰할 수 없는 이중 기록이었기 때문입니다. 폐지 전 전체 내용은 [.agent/archive/ACTIVE_TASK_PRE_GHISSUE_ARCHIVE_260814.md](archive/ACTIVE_TASK_PRE_GHISSUE_ARCHIVE_260814.md)에 그대로 보존되어 있습니다.

---

## 이제 어떻게 확인하나

Task 상태의 유일한 진실 공급원은 **GitHub Issue/PR**입니다. 아래 표는 열람 편의를 위한 자동 미러일 뿐이므로, 실제 작업 착수·완료 판단은 항상 아래 명령으로 직접 조회하십시오.

```bash
# 본인 담당 이슈 확인
gh issue list --assignee <본인>

# 팀/상태별 조회
gh issue list --label team:a --label status:in-progress
gh issue list --label status:review          # Aiden 검토 대기
gh issue list --label status:blocked          # 블로커

# 이슈 상세 (본문 + 코멘트)
gh issue view <번호> --comments

# 열린 PR / CI 상태
gh pr list --state open
gh pr checks <PR번호>
```

Task 상세(DoD·커밋 해시·작업 결과)는 `.agent/tasks/TASK-XXX_*.md`에 기록합니다(R-17 착수/완료 절차 참조). GitHub Issue 번호와 TASK-NNN/TASK-B-NNN 번호는 서로 다른 체계이므로, 상세 파일과 PR body에 항상 `Closes #NNN`으로 상호 연결합니다.

---

## Team B 브랜치/PR 절차 (2026-07-04 JSJung 지시, 계속 유효)

> Dave·Baker·Mike 등 Team B 구현 Agent는 모든 Task에 아래를 따릅니다.

1. **Git 동기화** (착수 전 필수): `git fetch origin` → `git checkout develop` → `git pull origin develop`
2. **feature 브랜치 생성**: `git checkout -b feature/teamb-task-b-NNN-설명` (develop 직접 커밋 절대 금지)
3. **완료 보고 순서**: ① 코드 커밋 → ② task file 작업 결과 기재 → ③ GitHub Issue 라벨 `status:review` 갱신 → ④ PR 생성 (`Closes #NNN`)
4. **PR 미생성 = 완료 불인정**: `status:review`는 PR 생성 후에만 유효. develop 직접 push는 R-17 위반으로 기록됨.

---

## 📡 GitHub Issues 현황 (자동 동기화)

> Issue #86 — GitHub Action이 Issue 이벤트(생성·라벨변경·종료 등) 발생 시 아래 표를 자동 갱신합니다. 마커 사이 블록은 수기 편집 금지.

<!-- GH_ISSUES_SYNC:START -->
| # | 제목 | 팀 | 우선순위 | 상태 | 담당 | 갱신일 |
|:-:|:-----|:--:|:-------:|:----|:-----|:-------|
| [#1118](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1118) | [future] IMP-094 — 요율 워크플로우 고도화 (Phase M) | a | p4 | open | 미배정 | 2026-08-14 |
| [#1117](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1117) | [future] IMP-091 — Carrier Portal (운송사 배차 수락/거부) | a | p4 | open | 미배정 | 2026-08-14 |
| [#1116](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1116) | [future] IMP-069 — IBC 어댑터 구현 (미국 통관) | a | p3 | blocked | 미배정 | 2026-08-14 |
| [#1115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1115) | [future] IMP-028 — UNI-PASS EDI 연동 (통관 연계) | a | p4 | open | 미배정 | 2026-08-14 |
| [#1113](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1113) | TASK-B-299: UPS 오더 상세 운임 카드 — Zone 오표시 + 통화 쉼표 미표시 수정 (DEF-B-065) | b | p2 | in-progress | jungjs | 2026-08-14 |
| [#1112](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1112) | [Aiden] AWS 이관 관련 — 기존 MySQL 서버 발견, DB 전환(MySQL vs PostgreSQL) 여부 결정 필요 | a | p2 | - | jungjs | 2026-08-14 |
| [#1111](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1111) | [ops] Vercel Hobby 플랜 제약 — ups-tracking-poll 3시간마다 크론이 배포를 통째로 막음 (TASK-B-294) | b | p2 | - | jungjs | 2026-08-13 |
| [#995](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/995) | [Aiden] AWS 이관(Migration) 검토 — 고객요청, Supabase 처리 방안 결정 필요 | a·b | p1 | open | jungjs | 2026-08-14 |
| [#988](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/988) | [Aiden] 세션 타임아웃 미적용 — 실 서비스 전환 전 필수 조치 | - | p2 | - | 미배정 | 2026-07-31 |
| [#987](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/987) | [Aiden] Team B R-17 위반 대응 체계 재검토 요청 — 3회 기준 미집행 장기화 | b | p1 | - | jungjs | 2026-08-11 |
<!-- GH_ISSUES_SYNC:END -->

> 위 표는 스냅샷입니다. 항상 최신 상태는 `gh issue list`로 직접 확인하십시오.
