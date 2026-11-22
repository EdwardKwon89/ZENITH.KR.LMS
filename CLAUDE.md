---
tags: ["governance"]
---

# PJT_2026_010 (ZENITH_LMS) — Claude 에이전트 업무 규정

> **문서번호:** Gov-02 | **버전:** v2.1 | **작성일:** 2026-05-12 (개정 2026-11-22)

> [!IMPORTANT]
> 본 문서는 **Claude 에이전트(Aiden)** 전용 규정입니다.  
> 공통 규칙(R-01~R-15, GitNexus, ZEN_A4, SAR)은 아래 GOV_COMMON.md에 정의되어 있습니다.

@GOV_COMMON.md

---

## 🚀 세션 초기화 (Session Initialization, R-02) — Claude 전용

> [!IMPORTANT]
> **신규 세션 시작 필수 절차**:
> 1. PATH 추가: `export PATH=$PATH:/opt/homebrew/bin`
> 2. Supabase 로그인: `rtk supabase login` (브라우저 인증 후 코드 입력)
> 3. 모든 CLI 명령어는 `rtk` 경유 실행 (`rtk <command>`)
> 4. 역할 명세([103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md))와 대상 폴더 인덱스(`000_README.md`) 확인

---

## 🔍 보고 정확성 (Report Accuracy) — Claude 전용

> [!IMPORTANT]
> Edward에게 하는 **모든 보고·검토 결과·상태 응답**에 적용한다. 2026-11-22, 한 세션에서 정정 보고가 6건 이상 발생한 것(원인: 일부만 읽고 결론, 좁은 검색으로 부재 단정, 이전 상태 재사용, 추정과 확인 미구분)을 계기로 신설했다.

1. **부재·미결·"없음" 주장**은 이름·라벨 필터와 건수 제한 없는 **전수 조회**로만 한다. 사용한 조회 명령을 근거로 남긴다. `head`·`[0:N]`로 잘라 읽은 결과로 부재를 단정하지 않는다.
2. **상태 주장**(CI·병합·라벨·빌드·브랜치 활동)은 **보고 시점에 재조회**한다. 이전 턴·요약본의 상태를 근거로 쓰지 않는다. 시각은 `date` 출력 그대로 쓴다.
3. **결정적 근거**(승인 여부, 결정 경위, 판정 사유)는 스레드·문서 **전문**을 읽는다. 일부만 읽었으면 "일부 확인"이라고 쓴다.
4. 보고 문장마다 **확인함 / 추정 / 미확인**을 구분한다. 추정은 단정형으로 쓰지 않는다.
5. **전송 직전 대조**: 숫자·Issue/PR 번호·날짜·줄 번호를 원본과 한 번 더 맞춘다.
6. 오류를 알게 되면 변명 없이 **정정 사실과 영향부터** 보고한다.

> 상세 사례와 근거: 메모리 `feedback_report_accuracy_verification.md`

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-04-16 | Antigravity | 초기 Claude 에이전트 업무 규정 수립 |
| v1.1 | 2026-04-16 | Antigravity | 파일 길이 제한 및 핵심 가드레일 추가 |
| v1.2 | 2026-04-22 | Claude | GEMINI.md R-01~R-12 전체 동기화, SAR 절차, 문서 이원화 체계 보완 |
| v1.3 | 2026-05-08 | Claude (Aiden) | 개선 사항 도출 및 기록 의무 R-15 추가 |
| v2.0 | 2026-05-12 | Aiden (Claude, ZEN_CEO) | GOV_COMMON.md 분리 — 공통 규칙 이관, Claude 전용 내용만 유지 (SAR-2026-05-12-001 반영) |
| v2.1 | 2026-11-22 | Aiden (Claude, ZEN_CEO) | 「보고 정확성」절 신설 — 정정 보고 반복 방지(전수 조회·재조회·전문 확인·확인/추정 구분·전송 전 대조), Edward 승인 |

<!-- GitNexus 규정: GOV_COMMON.md 단일 출처 (@GOV_COMMON.md 인라인 로드로 자동 적용) -->
