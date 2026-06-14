# ZENITH_LMS — 신규 팀 온보딩 가이드

> **대상**: Phase 7 UPS 특송 서비스 신규 참여 개발자 및 AI 에이전트 (Team B)
> **작성일**: 2026-06-14
> **작성자**: Aiden (Claude, ZEN_CEO)
> **버전**: v1.1

---

## 0. Team B 구성

| 역할 | 이름 | 담당 |
|:----|:----|:----|
| **팀 리더** | **JSJung** | 개발 총괄, Task 진행 관리, PR 검토 |
| **AI Agent 총괄** | **Jaison (Claude)** | 코드 구현 주도, Task 완료 보고, R-17 준수 |
| AI Agent (보조) | OpenCode | 보조 구현 (필요 시) |

> **JSJung**: 팀 전체 개발 방향 결정, Aiden·Team A와 기술 협의, PR 제출 최종 승인
> **Jaison**: TASK-139 착수 Agent. 커밋 태그 `[Jaison]` 사용. R-17 절차 준수 책임

---

## 1. 프로젝트 개요

**ZENITH_LMS**는 SNTL의 국제 통합 물류 플랫폼입니다.

| 항목 | 내용 |
|:----|:----|
| **기술 스택** | TypeScript · Next.js 15 (App Router) · Supabase (PostgreSQL + Auth) · Vercel |
| **인증** | Supabase Auth + JWT (app_metadata: role, org_id) |
| **상태 관리** | Server Actions (Next.js) + React state (최소) |
| **다국어** | next-intl (KO/EN/ZH/JA 4개국어) |
| **테스트** | Jest (단위) + Playwright (E2E) |

---

## 2. 환경 설정

### 2-1. 저장소 클론

```bash
git clone https://github.com/<org>/ZENITH_LMS_001.git
cd ZENITH_LMS_001
npm install
```

### 2-2. 환경 변수

```bash
cp .env.local.example .env.local
# 아래 값을 팀 리더(Edward)에게 요청
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

### 2-3. 로컬 Supabase 설정

```bash
export PATH=$PATH:/opt/homebrew/bin
npx supabase start          # 로컬 Supabase 시작
npx supabase db reset       # 마이그레이션 전체 적용
npm run dev                 # Next.js 개발 서버 시작
```

> **R-14 준수**: 모든 개발/테스트는 로컬 Supabase 환경에서 진행. 원격(Cloud) 접속 필요 시 Edward 승인 후 진행.

### 2-4. 회귀 테스트 실행 확인

```bash
npm run test:regression    # 전체 회귀 테스트 — 모두 PASS 확인 후 작업 착수
```

---

## 3. 핵심 거버넌스 규칙 (반드시 숙지)

### R-17 작업 관리 (가장 중요)

모든 작업은 `.agent/ACTIVE_TASK.md` 기반으로 관리됩니다.

**커밋 순서 — 절대 준수**:
```
1. [코드 커밋]  [Dev_B] feat: TASK-XXX 설명 (코드 파일만)
2. [task file 🔔 업데이트] — [작업결과] 섹션 기재 + 커밋 해시 포함
3. [ACTIVE_TASK.md] 상태 🔔 반영
4. [IMP_PROGRESS.md] 해당 IMP 행 🔔 갱신
5. check-R17-DoD 자가 검증 실행 → 전항목 통과 확인
6. [문서 커밋]  [Dev_B] docs: TASK-XXX 완료 보고
```

> ⚠️ **코드 커밋에 문서 파일 포함 금지 (위반 시 반려)**
> ⚠️ **DoD 체크 없이 문서 커밋 금지**

### R-08 회귀 테스트

모든 작업 완료 전 `npm run test:regression` 실행 → **전체 PASS** 확인 필수.

### R-07 언어 규칙

핵심 문서(실행계획, 보고서, SAR)는 **한글**로 작성.

### 커밋 태그

| 작성자 | 태그 |
|:------|:----|
| JSJung (직접 작성) | `[JSJung]` |
| Jaison (Claude AI) | `[Jaison]` |
| OpenCode (보조 AI) | `[Dev_OC]` |

---

## 4. 코드베이스 주요 구조

```
src/
├── app/
│   ├── actions/          ← Server Actions (백엔드 로직)
│   │   ├── admin/        ← 관리자 전용 액션
│   │   ├── operations/   ← 운영 액션 (오더, 창고 등)
│   │   └── agency/       ← (Team B 신규 생성)
│   └── [locale]/
│       └── (dashboard)/  ← 모든 대시보드 페이지
│           └── agency/   ← (Team B 신규 생성)
├── lib/
│   ├── auth/
│   │   ├── guards.ts     ← 인증 가드 (수정 시 주의)
│   │   └── rbac.ts       ← 역할 기반 접근 제어 ← Team B가 AGENCY 추가
│   ├── repositories/     ← DB 접근 레이어
│   └── ups/              ← (Team A 신규 생성)
├── types/
│   └── ups.ts            ← (Team A 선행 정의, Team B import만)
└── components/
    └── layout/
        └── NaviSidebar.tsx  ← 동시 수정 금지 (PR 후 리베이스)
```

---

## 5. Team B 작업 범위 (Phase 7 SPR-01~07)

### Team B 담당 파일/디렉토리

| 경로 | 역할 |
|:----|:----|
| `supabase/migrations/agency_*` | Agency DB 스키마 |
| `src/app/actions/agency/` | Agency Server Actions |
| `src/app/[locale]/(dashboard)/agency/` | Agency UI 페이지 |
| `src/lib/auth/rbac.ts` (**AGENCY role 추가**) | SPR-01에서 처리 |

### Team B 접근 금지 파일 (Team A 소유)

| 파일 | 이유 |
|:----|:----|
| `supabase/migrations/ups_*` | Team A 전용 |
| `src/app/actions/ups/` | Team A 전용 |
| `src/lib/ups/` | Team A 전용 |
| `src/types/ups.ts` | Team A 선행 정의 |
| `src/lib/repositories/admin.repository.ts` | 기존 시스템 핵심 파일 — 변경 시 Aiden과 협의 필수 |

### 공유 파일 수정 규칙

| 파일 | 처리 방법 |
|:----|:---------|
| `NaviSidebar.tsx` | 선착 팀이 수정 → PR 머지 → 상대팀 `git rebase develop` |
| `messages/ko.json` 등 | 각 팀이 **자신의 키만** 추가. 키 범위: Team B는 `agency_*`, `agent_*` 접두사 사용 |
| `rbac.ts` | Team B가 SPR-01에서 처리 → PR 머지 → Team A 참조 |

---

## 6. Git 브랜치 전략

### 브랜치 구조

```
main (보호 — Edward 승인 필수)
└── develop (통합 브랜치 — 상대팀 리뷰 1명 필수)
      ├── feature/ups-spr01-aiden-db-schema    ← Team A
      ├── feature/ups-spr01-devteam-agency-role ← Team B ← 여기서 시작
      ├── feature/ups-spr02-aiden-warehouse
      └── feature/ups-spr02-devteam-shipper-ui
```

### Team B 브랜치 명명 규칙

```
feature/ups-spr{NN}-devteam-{작업명}
예: feature/ups-spr01-devteam-agency-role
    feature/ups-spr02-devteam-shipper-ui
    feature/ups-spr03-devteam-rate-override
```

### PR 제목 형식

```
[Team B] SPR-01: AGENCY 역할 모델 구현 (TASK-139)
```

### PR 체크리스트 (merge 전 필수)

- [ ] 회귀 테스트 전체 PASS (결과 PR에 첨부)
- [ ] ACTIVE_TASK.md 상태 🔔 확인
- [ ] DoD 모든 항목 `[x]` 체크
- [ ] 커밋 해시 task file에 기재
- [ ] 코드 커밋과 문서 커밋 분리 확인

---

## 7. ACTIVE_TASK.md 운영 방법

### Task 상태 전환

```
⬜ (미착수) → 🔄 (구현 중) → 🔔 (검토 요청) → ✅ (Aiden 승인)
```

### Team B 착수 절차

1. `.agent/ACTIVE_TASK.md`에서 Team B 할당 Task 확인
2. `.agent/tasks/TASK-XXX_*.md` 상세 파일 읽기
3. 브랜치 생성: `git checkout -b feature/ups-spr01-devteam-agency-role develop`
4. 작업 착수 시 상태 ⬜→🔄 변경 + ACTIVE_TASK.md 동시 반영

### Task 파일 작성 방법

상세 파일은 `.agent/tasks/` 에 있는 기존 파일을 참조하여 동일한 형식으로 작성.
필수 섹션: `[목표]`, `[작업 범위]`, `[DoD]`, `[작업 결과]`, `[발견 이슈]`

---

## 8. 첫 번째 Task: TASK-139

**파일**: `.agent/tasks/TASK-139_260614_Agency역할모델_DevTeam.md`

**목표**: AGENCY org_type 및 role 추가, RBAC 확장, 대리점 화주 계층 DB 설계

**착수 방법**:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/ups-spr01-devteam-agency-role
# 작업 시작 후 ACTIVE_TASK.md 상태 ⬜→🔄 변경
```

**완료 기준 (DoD)**:
- [ ] `supabase/migrations/agency_001_org_type_expansion.sql` 작성
- [ ] `supabase/migrations/agency_002_agency_shippers.sql` 작성
- [ ] `src/lib/auth/rbac.ts` AGENCY role 추가
- [ ] 회원가입 화면 AGENCY org_type 선택 옵션 추가
- [ ] `npm run test:regression` 전체 PASS
- [ ] PR 생성 → Team A 리뷰 요청

---

## 9. 리뷰 및 에스컬레이션

| 상황 | 연락처 |
|:----|:------|
| 기술 질문 (기존 시스템) | Aiden (Claude) — 현재 세션 또는 새 세션 |
| 설계 확정 필요 | Edward (ZEN_CEO) |
| 파일 충돌 | 즉시 Aiden에게 보고 후 해결 방안 확정 |
| DEF 발견 | `.agent/defects/DEF-NNN.md` 작성 후 Aiden 보고 |

---

## 10. 참조 문서

| 문서 | 위치 | 용도 |
|:----|:----|:----|
| 거버넌스 공통 규칙 | `GOV_COMMON.md` | R-01~R-18 전체 규칙 |
| Phase 7 설계 | `docs/02_Analysis/An_12_Phase7_UPS특송서비스_설계.md` | DB 스키마 + API 명세 |
| Phase 6 설계 (참조) | `docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md` | 기존 패턴 참조 |
| 활성 Task 인덱스 | `.agent/ACTIVE_TASK.md` | 작업 관리 단일 소스 |
| IMP 진척 현황 | `scratch/IMP_PROGRESS.md` | IMP 완료 현황 |
| 고객 리뷰 원본 | `docs/80_RawData/고객 Review 20260609.md` | 요구사항 원문 |
| UPS Interface 명세 | `docs/80_RawData/20260609 IBC和UPS Interface.pdf` | IBC/Pactrak API |
