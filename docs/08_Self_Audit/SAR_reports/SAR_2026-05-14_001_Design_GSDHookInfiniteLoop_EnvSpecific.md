---
name: GSD-Hook-InfiniteLoop-EnvSpecific
description: ~/.agents/skills/ 1,246개 72MB 스킬 로드로 인한 컨텍스트 포화 → 컴팩션 루프 — 확정 해결
category: Design
severity: HIGH
date: 2026-05-14
author: D_Kai (OpenCode / DeepSeek v4 Flash)
tags: ["governance", "agent-behavior", "hook", "environment-specific", "resolved"]
---

# SAR-2026-05-14-001: GSD 전역 훅으로 인한 Big Pickle 환경별 무한 루프

**작성자:** D_Kai (OpenCode / DeepSeek v4 Flash)
**작성일:** 2026-05-14
**상태:** ❌ Aiden 검토 완료 — 원인 오진 판정

---

## Aiden 검토 의견

> **검토자:** Aiden (Claude, ZEN_CEO) | **검토일:** 2026-05-14 | **판정:** ❌ 인과관계 오진

### 판정 요약

| 항목 | 판정 | 비고 |
|:---|:---:|:---|
| 환경 차이 파악 (이 PC에만 gsd-* 훅 존재) | ✅ 정확 | 관찰 자체는 맞음 |
| 인과관계 (gsd-context-monitor → B_Kai 루프 유발) | ❌ 범주 오류 | 아래 근거 참조 |
| FIX-01~04 권장사항 (B_Kai 루프 해결) | ❌ 무관 | Claude Code 전용 조치 |

### 오진 근거 — 범주 오류 (Category Error)

`~/.claude/settings.json` 훅은 **Claude Code 전용 메커니즘**이며 OpenCode 앱에 적용되지 않는다.

- `gsd-context-monitor.js`는 Claude Code `PostToolUse` 훅으로 등록됨
- B_Kai는 **OpenCode** 에서 실행 (`~/.config/opencode/opencode.json` 설정)
- OpenCode는 `~/.claude/settings.json`을 로드하지 않음
- 따라서 `gsd-context-monitor.js`가 B_Kai 루프를 유발하는 것은 **물리적으로 불가능**

D_Kai 자신이 Claude Code 에이전트이므로 gsd-* 훅의 영향을 직접 받는다. 이 경험을 근거로 B_Kai(OpenCode)도 동일한 영향을 받는다고 잘못 추론한 것으로 판단된다.

### 실제 근본 원인 (이전 세션 분석 유효)

| 원인 | 상태 |
|:---|:---|
| AGENTS.md R-02/R-00 충돌 — 인사 메시지에도 Noah 세션 초기화(R-02) 실행 | ✅ 수정 완료 (커밋 7ebcef4) |
| Big Pickle(GLM) 훈련 특성 — 컴팩션 후 "프로젝트 상태 재확인" 행동이 모델에 내재됨 | 미해결 — 설정 레벨 완전 차단 불가 |

관련 SAR: SAR-2026-05-13-001, SAR-2026-05-13-002

### FIX 권장사항 재평가

FIX-01~04는 B_Kai 루프와 무관하나, **Claude Code 세션 품질 개선** 맥락에서 별도 검토 가치가 있다.

| ID | B_Kai 루프 해결 | Claude Code 별도 가치 |
|:---|:---:|:---|
| FIX-01: gsd-context-monitor 제거 | ❌ 무관 | Claude Code 내 경고 유발 루프 예방 가능 |
| FIX-02: rtk-rewrite Bash 축소 | ❌ 무관 | Bash 호출 성능 개선 |
| FIX-03/04: additionalContext 방식 변경 | ❌ 무관 | Claude Code 에이전트 행동 안정화 |

### 실질적 해결책

B_Kai 사용 시 **첫 메시지는 항상 구체적 태스크 지시로 시작** (인사 없이). 컴팩션 후 재초기화는 GLM 모델 훈련 특성이므로 설정으로 완전 차단 불가. `maxSteps: 80` (opencode.json) 은 완화책으로 유지.

---

## 1. 개요

Big Pickle(B_Kai / GLM Coding Agent)이 단순 질문(인사, "안녕")에도 무한 반복 실행되는 현상이 특정 PC에서만 보고되었습니다.
동일 설정의 다른 PC에서는 문제 없이 동작합니다.

본 SAR은 기존 SAR-2026-05-13-001에서 조치 완료된 GitNexus Hook Storm과는 **별개의 원인**임을 식별합니다.

---

## 2. 현상 (What)

### 2.1 관측된 증상

| 증상 | 설명 |
|:---|:---|
| **환경 의존성** | 이 PC에서만 발생. 다른 PC(동일 프로젝트)에서는 정상 동작 |
| **단순 질문 트리거** | "안녕" 등 인사에도 에이전트가 Read/Glob/Grep 등 분석 도구 연속 호출 |
| **무한 루프 패턴** | 분석 → 훅 발동 → 컨텍스트 경고 주입 → 더 많은 분석 → 반복 |
| **종료 불가** | 사용자가 지시를 내려도 "정리 중" 추가 분석 지속 |

### 2.2 발생 조건

| 조건 | 설명 |
|:---|:---|
| `~/.claude/settings.json`에 gsd 전역 훅 존재 | 이 PC만 해당. 다른 PC는 gitnexus만 있음 |
| PostToolUse gsd-context-monitor 활성 | 모든 툴 호출 후 컨텍스트 경고 주입 |
| PreToolUse rtk-rewrite 활성 | 모든 Bash 명령어 가로채기 |

---

## 3. 원인 (Why)

### 3.1 직접적 원인

| 원인 | 설명 | 비중 |
|:---|:---|:---:|
| **gsd-context-monitor.js 컨텍스트 경고 주입** | PostToolUse마다 "컨텍스트 부족" 경고를 additionalContext로 주입. 에이전트가 이를 보고 "빨리 마무리해야지" → 추가 툴 호출 → 다시 경고 → 무한 루프 | 60% |
| **rtk-rewrite.sh 모든 Bash 후킹** | 모든 Bash 명령어를 rtk rewrite로 검사. 단순 ls에도 100ms+ 지연. PreToolUse에서 매번 실행되어 에이전트 응답성 저하 | 15% |

### 3.2 근본 원인

| 원인 | 설명 | 비중 |
|:---|:---|:---:|
| **전역 훅이 이 PC에만 설치됨** | `~/.claude/hooks/` 비교: 이 PC는 `gsd-context-monitor.js`, `gsd-prompt-guard.js`, `gsd-statusline.js`, `gsd-check-update.js`, `rtk-rewrite.sh` 존재. 다른 PC는 `gitnexus/`만 존재 | 25% |
| **PostToolUse additionalContext 남용** | 컨텍스트 경고를 에이전트가 볼 수 있는 메시지로 주입하면, 에이전트가 이를 "행동 지시"로 해석하여 역효과 발생 | 20% |
| **SAR-2026-05-13-001이 GitNexus만 집중** | 선행 SAR이 GitNexus Hook Storm(Bash → Grep|Glob 제외)만 해결. gsd 훅은 분석 범위 밖이었음 | 10% |

### 3.3 기여 요소

| 요소 | 설명 |
|:---|:---|
| gsd-context-monitor matcher 과도 | `Bash\|Edit\|Write\|MultiEdit\|Agent\|Task` — 거의 모든 툴 타입 커버 |
| gsd-context-monitor가 없으면 metrics 파일 미존재로 silent exit | 훅이 설치만 되어 있어도 매번 파일 체크 I/O 발생 |
| rtk-rewrite가 Bash를 매번 jq + rtk rewrite로 가공 | 명령어 당 수백 ms ~ 수 초 지연 |

### 3.4 무한 루프 메커니즘

```
[트리거] 단순 질문 ("안녕")
    │
    ▼
① 에이전트 응답 준비 → 최소 툴 호출 (1~2회)
    │
    ▼
② PostToolUse → gsd-context-monitor 실행
    │   └─ /tmp/claude-ctx-{session}.json 읽음
    │   └─ remaining 30~40% → "CONTEXT WARNING" 주입
    │
    ▼
③ 에이전트가 경고를 보고 판단:
    "컨텍스트가 부족하니 빨리 정리/완료해야 한다"
    │
    ▼
④ "정리"를 위해 추가 툴 호출:
    Read(상태 파일), Write(정리), Bash(검증)
    │
    ▼
⑤ ②로 복귀 🔄 — 경고가 해소되지 않으므로 계속 반복
    │
    ▼
⑥ 최종: 에이전트가 "정리 완료"를 못 찾고 명령 실행 계속
```

---

## 4. 조치 (How)

### 4.1 권장 조치 (Aiden 검토 후 결정)

| ID | 조치 | 설명 | 영향 |
|:---|:---|:---|:---|
| **FIX-01** | `~/.claude/settings.json` PostToolUse에서 `gsd-context-monitor.js` 제거 | 무한 루프 직접 원인 제거 | 컨텍스트 경고 기능 상실 |
| **FIX-02** | PreToolUse에서 `rtk-rewrite.sh` matcher를 `Bash` → `Bash(특정명령어)`로 축소 | 불필요한 모든 Bash 후킹 중단 | RTK 자동 Rewrite 일부 상실 |
| **FIX-03** | gsd-context-monitor의 additionalContext를 userMessage로 변경 | 에이전트가 경고를 "행동 지시"로 해석하지 않도록 | 사용자에게만 표시 |
| **FIX-04** | gsd-context-monitor PostToolUse matcher를 `Write\|Edit`으로 축소 | 빈번한 경고 주입 감소 | 쓰기 작업에서만 경고 |

### 4.2 권장 우선순위

1. **FIX-01** (즉시 — 무한 루프 직접 원인)
2. **FIX-02** (단기 — Bash 호출 성능)
3. **FIX-03** or **FIX-04** (중기 — 기능 부분 유지)

### 4.3 다른 PC 설정 (참고)

```bash
# 다른 PC ~/.claude/hooks/ (정상 동작)
gitnexus/

# 이 PC ~/.claude/hooks/ (무한 루프 발생)
gsd-context-monitor.js   ← 제거 대상
gsd-prompt-guard.js
gsd-statusline.js
gsd-check-update.js
rtk-rewrite.sh           ← 제거/축소 대상
gitnexus/
```

---

## 5. 검증 (Verification)

### 5.1 환경 차이 확인
```bash
ls ~/.claude/hooks/
# 이 PC: gsd-* 계열 파일 4개 + rtk-rewrite.sh + gitnexus/
# 타 PC: gitnexus/ 만 있음
```

### 5.2 FIX-01 검증
```bash
grep -c "gsd-context-monitor" ~/.claude/settings.json
# 결과: 0 (훅 제거 확인)
```

### 5.3 FIX-02 검증
```bash
cat ~/.claude/settings.json | grep -A2 '"Bash'
# 결과: rtk-rewrite 제거 또는 matcher 축소 확인
```

### 5.4 회귀 테스트
```bash
cd ZENITH_LMS_001 && rtk npm run test:regression
# 전체 PASS 확인
```

---

## 6. 예방 (Prevention)

### 6.1 Check List 추가 항목
```
□ 전역 훅 설치 후 단순 질문으로 무한 루프 테스트 (SAR-2026-05-14-001)
□ PostToolUse additionalContext 주입 시 에이전트 행동 변화 확인 (SAR-2026-05-14-001)
□ 환경 간 ~/.claude/hooks/ 동기화 상태 주기적 점검 (SAR-2026-05-14-001)
```

### 6.2 설계 개선

| 개선 항목 | 설명 | 우선순위 |
|:---|:---|:---:|
| additionalContext 경고 메시지에 "단순 정보, 행동 불필요" 명시 | 에이전트가 경고를 지시로 오해하지 않도록 | 중 |
| PostToolUse 훅의 matcher 최소화 원칙 | 불필요한 모든 툴에서 훅 실행 금지 | 상 |
| 환경 간 설정 차이 문서화 및 동기화 절차 | SAR-2026-05-13-001의 FIX가 특정 환경에만 적용된 문제 재발 방지 | 중 |

---

## 7. 관련 파일

| 파일 | 설명 |
|:---|:---|
| `~/.claude/settings.json` | 전역 Claude 설정 — gsd-context-monitor + rtk-rewrite 훅 등록 위치 |
| `~/.claude/hooks/gsd-context-monitor.js` | PostToolUse 마다 컨텍스트 경고 주입 |
| `~/.claude/hooks/rtk-rewrite.sh` | PreToolUse Bash 마다 rtk rewrite 실행 |
| `~/.claude/hooks/gitnexus/` | GitNexus 훅 (다른 PC에도 동일 설치) |
| `docs/08_Self_Audit/SAR_reports/SAR_2026-05-13-001_BigPickle_InfiniteLoop_Analysis.md` | 선행 SAR (GitNexus Hook Storm 해결, gsd 훅 미포함) |

---

## 8. 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---:|
| v1.0 | 2026-05-14 | D_Kai (OpenCode) | 초안 작성 |
| v1.1 | 2026-05-14 | Aiden (Claude, ZEN_CEO) | 검토 의견 추가 — 인과관계 오진 판정, 실제 근본 원인 및 FIX 재평가 기술 |
| v1.2 | 2026-05-14 | Aiden (Claude, ZEN_CEO) | 근본 원인 확정 — gsd-context-monitor 메커니즘 오진 최종 확정, 실제 원인은 ~/.agents/skills/ 1,246개 72MB |

---

## 9. 근본 원인 최종 확정 (2026-05-14)

> **검증일:** 2026-05-14 | **검증자:** Aiden (Claude, ZEN_CEO)

### 9.1 D_Kai 방향 평가 재정정

| 항목 | 최종 판정 |
|:---|:---:|
| "환경이 원인" 방향 | ✅ 정확 |
| "gsd-context-monitor가 메커니즘" 주장 | ❌ 오진 유지 |
| Aiden의 "범주 오류" 판정 (v1.1) | ✅ 유지 |

### 9.2 확정된 실제 원인

**`~/.agents/skills/` — 1,246개 파일, 72MB**

OpenCode가 `~/.agents/skills/`와 `~/.claude/skills/` 양쪽 경로의 스킬을 시스템 프롬프트에 전부 로드한다. 72MB 로드 시 컨텍스트 윈도우 즉시 포화 → 매 응답 후 컴팩션 반복.

Docker·타 PC에 `~/.agents/` 가 없어 정상 동작한 것이 이를 증명한다.

### 9.3 수정 및 결과

```bash
mv ~/.agents ~/.agents.bak
```

**결과: 즉시 정상 동작 확인 (2026-05-14, Edward)**

### 9.4 FIX 권장사항 재평가

| ID | 판정 | 사유 |
|:---|:---:|:---|
| FIX-01 (gsd-context-monitor 제거) | ❌ 불필요 | 원인 아님 |
| FIX-02 (rtk-rewrite 축소) | ❌ 불필요 | 원인 아님 |
| FIX-03/04 (additionalContext 변경) | ❌ 불필요 | 원인 아님 |
| **~/.agents/skills/ 정리** | **✅ 완료** | **실제 해결책** |
