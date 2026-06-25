# TASK-B-023 — [Phase 8] shxk.rtb56.com API 기반 UPS 연동 리서치 (DEF-079 대응)

> **TASK-ID**: TASK-B-023
> **생성일**: 2026-06-25
> **발령자**: Aiden (ZEN_CEO) — Issue #112
> **담당 Agent**: Jaison (총괄) · Dave (§1 리서치) · Baker (§2 문서·PR)
> **우선순위**: P1
> **관련 Issue**: [#112](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/112)
> **전제조건**: 없음 (DEF-079 Issue #111 대응)
> **브랜치**: `feature/teamb-task-b-023-rtb56-ups-research`
> **상태**: 🔄

---

## [업무 개요]

DEF-079 확인 결과 실제 UPS 연동 대상이 `shxk.rtb56.com` 제3자 플랫폼으로 확인됨.  
TASK-B-022 산출물(UPS 공식 REST API 기준)을 폐기하고 실제 연동 대상 기반으로 재리서치.

**배경**:
- JSJung 수령 credentials: API key + token 형식
- 연동 대상: `shxk.rtb56.com` (UPS 공식 developer.ups.com 아님)
- PDF 원문: `docs/80_RawData/20260609 IBC和UPS Interface.pdf`
- IMP-136~140 (Issue #106~110) 전량 blocked 상태 유지

---

## [작업 범위]

### §1. shxk.rtb56.com API 분석 (Dave 담당)

| 항목 | 조사 내용 |
|:----|:---------|
| 인증 방식 | API key + token 헤더 구조, 갱신 주기 |
| 레이블 발급 API | Endpoint, HTTP Method, Request payload, Response (운송장번호, 레이블 데이터 형식) |
| 트래킹 조회 API | Endpoint, 인증, 운송장번호 기반 조회 파라미터, Response 이벤트 구조 |
| 오류 코드 | 주요 오류 코드 및 재시도 정책 |
| 테스트 환경 | Sandbox 여부, 테스트 운송장 발급 방법 |

> **참조**: `https://shxk.rtb56.com/usercenter/manager/api_document.aspx#gettrack`

### §2. 산출물 문서 작성 + PR 생성 (Baker 담당)

1. Dave §1 리서치 결과 확인 후 `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 전면 재작성
2. Task file `[작업 결과]` 섹션 작성
3. PR 생성: `feature/teamb-task-b-023-rtb56-ups-research` → `develop`
   - PR body: `Closes #112` 포함 (GitHub 자동 연결)
   - PR body: `Closes #111` 포함 (DEF-079 해소)

---

## [산출물]

| 파일 | 내용 |
|:----|:----|
| `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` | shxk.rtb56.com API 스펙 조사 결과 (TASK-B-022 산출물 대체) |
| 본 Task file `[작업 결과]` 섹션 | 핵심 정보 요약 + An-13 입력 사항 |

> **R-11 준수**: 리서치 결과는 Aiden의 An-13 재설계 입력 자료로 사용됩니다.  
> 구현 코드 작성은 An-13 Edward 승인 후 진행합니다.

---

## [ZEN_A4 준수 사항]

- 리서치 문서 800줄 이하 (Advisory 기준)
- R-07: 한글 작성

---

## [DoD 체크리스트]

- [ ] shxk.rtb56.com 인증 방식 명세 완료 (API key + token 헤더 구조)
- [ ] 레이블 발급 API 스펙 확인 완료 (Endpoint·Request payload·Response)
- [ ] 트래킹 조회 API 스펙 확인 완료 (Endpoint·Response 이벤트 구조)
- [ ] 오류 코드 및 재시도 정책 확인 완료
- [ ] `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 재작성 완료 (TASK-B-022 산출물 대체)
- [ ] An-13 재설계 착수 가능 상태 확인 (리서치 결과로 입력 자료 제공)
- [ ] R-17 완료 보고 절차 준수
- [ ] PR `Closes #112`, `Closes #111` 생성 완료

---

## [설계 의견]

_(없음 — 리서치 Task)_

---

## [작업 결과]

_(미착수)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-25 | Jaison (Claude, Team B) | 🔄 착수 (JSJung 지시) — Aiden Issue #112 발령 대응. DEF-079(Issue #111) 대응 리서치. Dave(§1 분석) · Baker(§2 문서·PR) 배정. 브랜치 `feature/teamb-task-b-023-rtb56-ups-research` 생성. |
