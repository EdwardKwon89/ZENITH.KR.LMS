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
| [#1150](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1150) | TASK-B-313: 수동 배송완료 전환 — 대리점 자체 오더 허용 (DEF-B-138) | b | p2 | - | jungjs | 2026-08-17 |
| [#1126](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1126) | [Aiden] R-17 v3.0 개편 — Team B 반영 필요 (develop→TeamB_Dev 병합 전 확인 요청) | b | p1 | - | jungjs | 2026-08-14 |
| [#1118](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1118) | [future] IMP-094 — 요율 워크플로우 고도화 (Phase M) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1117](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1117) | [future] IMP-091 — Carrier Portal (운송사 배차 수락/거부) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1116](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1116) | [future] IMP-069 — IBC 어댑터 구현 (미국 통관) | a | p3 | blocked | 미배정 | 2026-08-14 |
| [#1115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1115) | [future] IMP-028 — UNI-PASS EDI 연동 (통관 연계) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1112](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1112) | [Aiden] AWS 이관 관련 — 기존 MySQL 서버 발견, DB 전환(MySQL vs PostgreSQL) 여부 결정 필요 | a | p2 | - | jungjs | 2026-08-14 |
| [#1111](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1111) | [ops] Vercel Hobby 플랜 제약 — ups-tracking-poll 3시간마다 크론이 배포를 통째로 막음 (TASK-B-294) | b | p2 | - | jungjs | 2026-08-13 |
| [#995](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/995) | [Aiden] AWS 이관(Migration) 검토 — 고객요청, Supabase 처리 방안 결정 필요 | a | p1 | open | jungjs | 2026-08-14 |
| [#994](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/994) | 2026.08.04 SNTL 업무협의 회의록 | - | - | - | 미배정 | 2026-08-06 |
| [#988](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/988) | [Aiden] 세션 타임아웃 미적용 — 실 서비스 전환 전 필수 조치 | - | p2 | - | 미배정 | 2026-07-31 |
| [#987](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/987) | [Aiden] Team B R-17 위반 대응 체계 재검토 요청 — 3회 기준 미집행 장기화 | b | p1 | - | jungjs | 2026-08-11 |
| [#978](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/978) | [Aiden] 개선제안 — 계층형 비즈니스 규칙(가격/정산) 일관성 재발방지 4개 조치 (DEF-B-031/032/033 근본원인 기반) | b | p2 | - | jungjs | 2026-07-29 |
| [#952](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/952) | [fix] DEF-132 — 운임 스냅샷 멀티패키지 치수 첫 번째만 반영 (오더등록·입고재계산 양쪽) | b | p2 | - | 미배정 | 2026-07-29 |
| [#946](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/946) | [fix] DEF-B-023 — UPS 오더 상세 무역서류(CI/PL/UPS Invoice) PDF 라벨 번역키 대량 누락 | b | p2 | - | 미배정 | 2026-07-28 |
| [#895](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/895) | [fix] DEF-130 — SNTL(SUB_ADMIN) 역할이 UPS 기준요금(zen_ups_base_rates) 조회 불가 | a | p1 | - | 미배정 | 2026-07-27 |
| [#886](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/886) | [verify] DEF-125 재검증 요청 — TASK-B-218/220으로 이미 해소된 것으로 추정됨 | b | p2 | - | 미배정 | 2026-07-27 |
| [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) | [설계 협의 필요] zen_tracking_configs provider_type/provider_name — transport_mode 반영 방식 (Edward 협의 필요) | - | - | blocked | EdwardKwon89 | 2026-07-24 |
| [#727](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/727) | [fix] 창고 화면 전반 일괄처리 지원 여부 점검·보완 (SNTL 회의 W7) | b | p3 | in-progress | 미배정 | 2026-07-23 |
| [#726](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/726) | [fix] 급증수수료 등록 데이터 화폐단위(KRW) 감사 (SNTL 회의 W6) | b | p3 | in-progress | 미배정 | 2026-07-26 |
| [#718](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/718) | 2026.07.22 SNTL 회의록 | - | - | - | 미배정 | 2026-07-23 |
| [#616](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/616) | [GOV] 예약 요금(pricing-schedule) 시스템에 Agency/Shipper 할인율 마진 검증 부재 — Team B 검토 요청 | b | p2 | - | 미배정 | 2026-07-20 |
| [#609](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/609) | [Aiden] CI 지연 원인 조사 결과 + 조치 — 큐 혼잡 완화 + TeamB_Dev 병합 CI 대기 불요로 개정 | b | p1 | - | jungjs | 2026-07-20 |
| [#605](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/605) | [design] Agency 원가/판매가 Matrix 전환 검토 — 대리점 단위 Matrix + 화주 단위 하이브리드(Zone할인율+선택적 Matrix override) | b | p2 | - | jungjs | 2026-07-19 |
| [#588](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/588) | [docs] UPS 오더 등록 후 처리 프로세스 현황 분석 (An_15) | b | p3 | - | 미배정 | 2026-07-18 |
| [#521](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/521) | [Aiden] 2026-07-16 임시 운영 방침 — Team B develop 복사 브랜치(integration/teamb-260716) 자체 개발·병합 허용 | b | p1 | - | jungjs | 2026-07-18 |
| [#473](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/473) | [Team B] 검증 절차 방침 변경 — 라이브 브라우저/DB 검증은 병합 후 JSJung이 수행 | b | - | - | 미배정 | 2026-07-14 |
| [#358](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/358) | [Aiden] R-17 절차 오류 재발 방지 — 4단계 구조적 개선 (채번 자동화·회귀결과 신뢰 제거·CI 게이트·워크트리 격리) | a | p2 | - | jungjs | 2026-07-14 |
| [#164](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/164) | [UAT-Epic] UPS 특송 서비스 — Team B 인수 테스트 (UAT-15~19) | b | p1 | open | jungjs | 2026-07-07 |
| [#163](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/163) | [UAT-19] UPS 인보이스 PDF — Team B 수동 브라우저 UAT | b | p1 | open | jungjs | 2026-07-01 |
| [#162](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/162) | [UAT-18] 창고 출고 UPS 연계 — Team B 수동 브라우저 UAT | b | p1 | open | jungjs | 2026-07-01 |
| [#161](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/161) | [UAT-17] UPS 특송 오더 발송 — Team B 수동 브라우저 UAT | b | p1 | in-progress | jungjs | 2026-07-07 |
| [#86](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/86) | [Aiden] GitHub Issues ↔ ACTIVE_TASK.md 하이브리드 태스크 관리 체계 전환 (B방안) | a | p3 | open | 미배정 | 2026-07-07 |
| [#76](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/76) | [설계안] B_Kai/D_Kai 작업 자동화 — OpenCode headless 기반 자율 에이전트 실행 체계 | - | - | - | 미배정 | 2026-06-22 |
<!-- GH_ISSUES_SYNC:END -->

> 위 표는 스냅샷입니다. 항상 최신 상태는 `gh issue list`로 직접 확인하십시오.
