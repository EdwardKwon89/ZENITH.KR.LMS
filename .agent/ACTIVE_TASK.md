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
| [#1595](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1595) | [Team B] TASK-B-408: 12/2 시연 계정 가입 절차서·로컬 리허설 (가입 담당 Mike, 실가입은 지시 후) | b | p1 | rework | jungjs | 2026-11-28 |
| [#1592](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1592) | [Team B] TASK-B-407: 12/2 시연용 UPS 오더 구성안 — 케이스표·로컬 흐름 확인 (EPIC #1364) | b | p1 | review | jungjs | 2026-11-28 |
| [#1589](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1589) | [Team B] TASK-B-406: TASK-B-381 task file R-21 §2 해당 서술 정리 (통합 #1448 전, 대상은 비공개 전달) | b | p1 | review | jungjs | 2026-11-28 |
| [#1587](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1587) | [Team B] TASK-B-405: 12/2 시연 최소 점검 증거 — 원가 비노출 경로별 확인(11곳)·금액 샘플 대조 (EPIC #1364) | b | p1 | review | jungjs | 2026-11-28 |
| [#1582](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1582) | [Team B] TASK-B-404: develop→TeamB_Dev 동기화·충돌 해소 + 마이그레이션 적용 계획서 갱신 (12/2 시연 통합 준비) | b | p1 | review | jungjs | 2026-11-28 |
| [#1579](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1579) | [Aiden → Team B] RPC 호출 권한·호출자 검증 정렬 — 원격 시연 배포 전 핵심 조치 (IMP-221 1단계, p1) | b | p1 | review | 미배정 | 2026-11-28 |
| [#1573](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1573) | [Team B] TASK-B-401: UPS 오더 수정 모드 화주명 자동 모드 오인·'내 정보 사용' 전환 시 화주 정보 소실 방지 (IMP-220, B-399 PR2 배포 전 처리) | b | p2 | open | 미배정 | 2026-11-27 |
| [#1566](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1566) | [Team B] TASK-B-399: UPS 오더 발송인 입력 방식별 shipper_company 처리 — 내 정보 사용=화주명·수기입력=필수 입력 컨트롤 (#1552 변경) | b | p1 | review | jungjs | 2026-11-27 |
| [#1562](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1562) | [Team B] TASK-B-398: SHXK createorder 사전검증 보강·거절 문구 사용자 매핑 (IS #1560 채택, #1552 후속) | b | p2 | open | 미배정 | 2026-11-27 |
| [#1560](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1560) | [IMP 제안] SHXK 거절 사유 원문 가시화 — createorder 실패 원인을 화면·사전검증에서 확인 가능하게 (DEF-B-172 후속) | b | p3 | open | 미배정 | 2026-11-27 |
| [#1552](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1552) | [Aiden → Team B] DEF: SHXK createorder 발송인 회사명 누락 거절(`发件人公司不能为空`, FXUPS 추정) — B-345 이후 재발 (DEF-B-054 재현) | b | p1 | review | 미배정 | 2026-11-27 |
| [#1546](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1546) | [Team B] TASK-B-393: 롤백 계획서 검증 질의의 공허한 참 정정·§4 M4-b 문구 모순 (EPIC #1364, B-392 후속) | b | p2 | review | 미배정 | 2026-11-26 |
| [#1542](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1542) | [IMP 제안] agent-worktree-init.sh를 워크트리 안에서 실행하면 중첩 워크트리 경로 생성 | - | - | - | 미배정 | 2026-11-26 |
| [#1539](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1539) | [Team B] TASK-B-392: M4·M4-b·M5 롤백 재리허설 — 정정 SQL 왕복·M5 실제 run 테이블 실측 (EPIC #1364, B-390·B-391 후속) | b | p2 | review | 미배정 | 2026-11-26 |
| [#1537](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1537) | [Team B] TASK-B-391: TASK-B-389 계획서 정정 7건 (M4·M4-b·M5 롤백, B-390 리허설 후속) | b | p2 | review | 미배정 | 2026-11-26 |
| [#1532](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1532) | [Team B] TASK-B-390: B-381 데이터 작업(M4·M4-b·M5) 롤백 로컬 리허설 (EPIC #1364, TASK-B-389 후속) | b | p2 | review | 미배정 | 2026-11-25 |
| [#1529](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1529) | [Team B] TASK-B-389: B-381 데이터 작업(M4·M4-b·M5) 롤백 계획 작성 (EPIC #1364, 문서) | b | p2 | review | 미배정 | 2026-11-25 |
| [#1528](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1528) | [Team B] TASK-B-388: 롤백 통합본 미실측 항목 로컬 실측 (EPIC #1364, TASK-B-387 후속) | b | p2 | review | jungjs | 2026-11-25 |
| [#1524](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1524) | [Team B] TASK-B-387: 청구서관리 마이그레이션 적용 순서·롤백 로컬 왕복 리허설 (EPIC #1364) | b | p2 | review | 미배정 | 2026-11-25 |
| [#1516](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1516) | [Team B] TASK-B-386: E2E_B374_Result JSON 증적 R-21 점검·처리 (IS #1490 후속) | b | p3 | review | 미배정 | 2026-11-24 |
| [#1513](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1513) | [Team B] TASK-B-385: E2E 증적 출력 경로를 저장소 밖으로 전환 (IS #1490 후속, R-13/R-21 정합, 설계 의견부터) | b | p2 | review | jungjs | 2026-11-25 |
| [#1475](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1475) | [Team B] TASK-B-383: 청구서 조회 정책에 역할 조건 추가 — 플랫폼 조직 전 역할의 청구서 조회 차단 (DEF-B-171) | b | p2 | review | jungjs | 2026-11-25 |
| [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) | [Team B] TASK-B-382: MANAGER의 UPS 정산마감 관련 테이블 RLS 정책 정렬 (규칙 1 이행, 설계 의견부터) | b | p2 | review | jungjs | 2026-11-24 |
| [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) | [Team B] TASK-B-381: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (규칙 4, 설계 의견부터) | b | p1 | review | jungjs | 2026-11-27 |
| [#1453](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1453) | [Team B] TASK-B-379: 청구 금액 함수 base 테이블 의존 제거 + 입고 실측 스냅샷 갱신 주체 정리 (#1449 C, 설계 의견부터) | b | p2 | open | jungjs | 2026-11-26 |
| [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) | [Team B] TASK-B-377: UPS 원가 열람 admin 전용 정렬 + 화주·대리점 부가운임 항목별 표시·라벨 중립화 (#1449 A·#1442 대체, 설계 의견부터) | b | p1 | review | 미배정 | 2026-11-28 |
| [#1449](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1449) | [Aiden → Team B] 통합(#1448) 전 필수 조치 3건 — UPS 실비 원가 테이블 권한 정렬·채번 함수 권한·청구 금액 함수 base 의존 제거 | b | p1 | open | jungjs | 2026-11-27 |
| [#1428](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1428) | [보류] 회귀 테스트 2파일 DB 질의 방식 통일 (npx supabase db query → docker exec psql) | b | p4 | - | 미배정 | 2026-11-22 |
| [#1371](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1371) | [Team B → Aiden] Gale(Gemini 4 Argon) 페르소나 등록 요청 — agent-worktree-init.sh 등 | a | p3 | open | 미배정 | 2026-11-18 |
| [#1369](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1369) | [Team B] TASK-B-363: 청구서관리 ⑥ 레거시 병행 정책 반영 및 컷오버 — 기존 메뉴·UPS 인보이스 처리 | b | p2 | open | 미배정 | 2026-11-24 |
| [#1368](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1368) | [Team B] TASK-B-362: 청구서관리 ⑤ 청구서 PDF 생성·다운로드 및 발행 이메일 | b | p2 | blocked | 미배정 | 2026-11-17 |
| [#1364](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1364) | [Team B] EPIC: 청구서관리 — 오더정산·청구서 생성/관리 (추적용) | b | p2 | in-progress | 미배정 | 2026-11-28 |
| [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) | [Aiden → Team B] DEF-151 UPS 요율 조회 액션 접근 가드 정렬 및 비관리자 화면 데이터 최소화 요청 | b | p1 | review | jungjs | 2026-11-26 |
| [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) | [Aiden → Team B] DEF-150 finance/UPS 실비·정산 액션 대리점 필터 누락·가드 공백 수정 요청 | b | p1 | in-progress | 미배정 | 2026-11-22 |
| [#1346](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1346) | [Team A] TASK-1160: 231 PoC 단계 2 — 모듈 ①② 위험 3군 재현·실DB 편입 측정 (§10 #4·#6·#13·#16 확정 반영) | a | p3 | blocked | 미배정 | 2026-11-18 |
| [#1319](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1319) | [Aiden] xlsx 소스 전환·P0 의존성 상향 — Team B 영향 의견 요청 (DEF-146 후속) | b | p2 | - | jungjs | 2026-11-18 |
| [#1298](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1298) | [Aiden] R-12(Ds-11 동기화) 개정·Docs Sync Check 도입 안내 — Team B 영향 및 회신 요청 | b | p2 | - | jungjs | 2026-11-16 |
| [#1291](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1291) | [Team B] #1280 설계 확정 공유 + 회귀맵 분리(R-09/DEF-B-157) 결정 요청 (Aiden 보고) | b | p2 | open | 미배정 | 2026-11-18 |
| [#1280](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1280) | [Team B] TASK-B-348: 사용자 노출 오류메시지 로케일 정합화 (영문/중문 혼재 노출 제거) | b | p2 | in-progress | 미배정 | 2026-11-17 |
| [#1276](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1276) | [Team B] 원격 브랜치 정리 후속 — 판단 보류 브랜치 11건 점검 요청 | b | p3 | open | jungjs | 2026-10-29 |
| [#1238](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1238) | 2026.10.12 오류사항 및 보완사항 | b | p2 | - | 미배정 | 2026-10-12 |
| [#1218](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1218) | [Aiden] Stage-Gate Code Review — UPS 핵심 경로(오더등록~정산) 대상, 적절한 시점에 실시 | - | p3 | - | 미배정 | 2026-10-11 |
| [#1189](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1189) | [Team B] TASK-B-323: Resend 이메일 도메인(zenith-lms.com) 미인증 — 알림메일 전량 발송 실패 (DEF-B-143, High) | b | p1 | - | jungjs | 2026-10-13 |
| [#1181](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1181) | [Team B] TASK-B-319: 로그 커버리지 개선 ①— ups-labels.ts 실패 반환값 무기록 해소 (~40건) | b | p2 | review | 미배정 | 2026-11-26 |
| [#1177](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1177) | [Team A] TASK-1137: 동일 계정 동시 로그인 감지 및 처리(알림 + 기존유지/강제로그아웃 선택) | a | p2 | - | 미배정 | 2026-08-20 |
| [#1176](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1176) | [Team A] TASK-1136: Session Idle Timeout 관리자 설정 + 다음 로그인부터 적용 | a | p2 | - | 미배정 | 2026-08-20 |
| [#1172](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1172) | [Team A] TASK-1134: 중복 Task 번호 CI/pre-commit 기계적 차단 (Issue #358 후속) | a | p4 | - | 미배정 | 2026-08-19 |
| [#1170](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1170) | [Team A] TASK-1133: requestId 완전 전파 — Server Action 개별 wrapping (309 §10.6 후속) | a | p4 | - | 미배정 | 2026-08-19 |
| [#1118](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1118) | [future] IMP-094 — 요율 워크플로우 고도화 (Phase M) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1117](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1117) | [future] IMP-091 — Carrier Portal (운송사 배차 수락/거부) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1116](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1116) | [future] IMP-069 — IBC 어댑터 구현 (미국 통관) | a | p3 | blocked | 미배정 | 2026-08-14 |
| [#1115](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1115) | [future] IMP-028 — UNI-PASS EDI 연동 (통관 연계) | a | p4 | - | 미배정 | 2026-08-14 |
| [#1112](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1112) | [Aiden] AWS 이관 관련 — 기존 MySQL 서버 발견, DB 전환(MySQL vs PostgreSQL) 여부 결정 필요 | a | p2 | - | jungjs | 2026-08-14 |
| [#995](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/995) | [Aiden] AWS 이관(Migration) 검토 — 고객요청, Supabase 처리 방안 결정 필요 | a | p1 | open | jungjs | 2026-08-14 |
| [#988](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/988) | [Aiden] 세션 타임아웃 미적용 — 실 서비스 전환 전 필수 조치 | - | p2 | - | 미배정 | 2026-07-31 |
| [#987](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/987) | [Aiden] Team B R-17 위반 대응 체계 재검토 요청 — 3회 기준 미집행 장기화 | b | p1 | - | jungjs | 2026-08-11 |
| [#978](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/978) | [Aiden] 개선제안 — 계층형 비즈니스 규칙(가격/정산) 일관성 재발방지 4개 조치 (DEF-B-031/032/033 근본원인 기반) | b | p2 | - | jungjs | 2026-07-29 |
| [#952](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/952) | [fix] DEF-132 — 운임 스냅샷 멀티패키지 치수 첫 번째만 반영 (오더등록·입고재계산 양쪽) | b | p2 | - | 미배정 | 2026-07-29 |
| [#946](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/946) | [fix] DEF-B-023 — UPS 오더 상세 무역서류(CI/PL/UPS Invoice) PDF 라벨 번역키 대량 누락 | b | p2 | - | 미배정 | 2026-07-28 |
| [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) | [설계 협의 필요] zen_tracking_configs provider_type/provider_name — transport_mode 반영 방식 (Edward 협의 필요) | - | - | blocked | EdwardKwon89 | 2026-07-24 |
| [#727](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/727) | [fix] 창고 화면 전반 일괄처리 지원 여부 점검·보완 (SNTL 회의 W7) | b | p3 | in-progress | 미배정 | 2026-07-23 |
| [#726](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/726) | [fix] 급증수수료 등록 데이터 화폐단위(KRW) 감사 (SNTL 회의 W6) | b | p3 | in-progress | 미배정 | 2026-07-26 |
| [#616](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/616) | [GOV] 예약 요금(pricing-schedule) 시스템에 Agency/Shipper 할인율 마진 검증 부재 — Team B 검토 요청 | b | p2 | - | 미배정 | 2026-07-20 |
| [#164](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/164) | [UAT-Epic] UPS 특송 서비스 — Team B 인수 테스트 (UAT-15~19) | b | p1 | open | jungjs | 2026-07-07 |
| [#163](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/163) | [UAT-19] UPS 인보이스 PDF — Team B 수동 브라우저 UAT | b | p1 | open | jungjs | 2026-07-01 |
| [#162](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/162) | [UAT-18] 창고 출고 UPS 연계 — Team B 수동 브라우저 UAT | b | p1 | open | jungjs | 2026-07-01 |
| [#161](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/161) | [UAT-17] UPS 특송 오더 발송 — Team B 수동 브라우저 UAT | b | p1 | in-progress | jungjs | 2026-07-07 |
| [#76](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/76) | [설계안] B_Kai/D_Kai 작업 자동화 — OpenCode headless 기반 자율 에이전트 실행 체계 | - | - | - | 미배정 | 2026-10-01 |
<!-- GH_ISSUES_SYNC:END -->

> 위 표는 스냅샷입니다. 항상 최신 상태는 `gh issue list`로 직접 확인하십시오.
