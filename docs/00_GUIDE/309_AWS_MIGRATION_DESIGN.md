# 309. AWS 이관(Migration) 설계 초안

> **문서번호:** Ds-11 계열 (R-11 API/설계 우선 원칙 적용) | **버전:** v0.1 (초안 — 미승인)
> **작성일:** 2026-08-07 | **작성자:** Aiden (Claude, ZEN_CEO)
> **상태:** 🔍 검토 대기 — 핵심 방향(Supabase 처리 방안) 미정, Edward 승인 전 구현 착수 금지

---

## 1. 배경

- Edward가 Team B 리더 JSJung과 협의 완료 (2026-08-07 보고 기준).
- **고객 요청**으로 현재 원격 Vercel + Supabase 환경을 **AWS 환경으로 이관** 요청받음.
- 순서: **① AWS 배포 → ② 기능 개선 → ③ (구 환경 폐기 및) 완전 전환.**
- AWS 계정 접속 정보(ID/Password 등)는 금일(2026-08-07) 중 전달 예정 — 본 문서는 **자격증명 도착 전 사전 준비** 범위를 다룬다.

> ⚠️ **핵심 가드레일 관련 고지**: GOV_COMMON.md에 명시된 현재 Tech Stack은 "Next.js · Supabase · Vercel"이다. 본 이관은 이 기준 자체를 변경하는 작업이므로, 실제 리소스 전환(자격증명 사용 이후 단계)은 Edward의 명시적 승인 이후에만 진행한다. 본 문서는 승인 전 준비 단계의 산출물이다.

---

## 2. 현황 분석 — Vercel/Supabase 결합도 인벤토리 (2026-08-07 코드 기준)

### 2.1 Vercel 결합 지점 (낮음 — 이관 난이도 낮음)

| 항목 | 내용 | 대체 방안 |
|---|---|---|
| Cron Job | `vercel.json` — `/api/cron/pricing-schedule-apply`(매일 15:00 UTC), `/api/cron/ups-tracking-poll`(매일 15:30 UTC) | EventBridge Scheduler → Lambda/ECS Scheduled Task로 동일 엔드포인트 호출 |
| 배포 트리거 | GitHub 연동 없음, `vercel --prod` 수동 CLI 배포 ([[reference_vercel_deployment_sop]] 참조) | GitHub Actions → ECR push → ECS 서비스 업데이트로 대체 |
| Edge Function/ISR | 사용 이력 없음 (확인됨) | 해당 없음 |
| Next.js Image Optimization | `next/image` 사용처 1건 | ECS 환경에서는 Next.js 자체 이미지 최적화(로컬 sharp) 또는 CloudFront+S3로 대체 검토 |

### 2.2 Supabase 결합 지점 (높음 — 이관 난이도의 핵심 변수)

| 항목 | 내용 |
|---|---|
| Auth + RLS | 전체 RLS 정책이 Supabase Auth JWT의 `app_metadata.org_id`, `auth.uid()`, `auth.jwt()` 전제로 설계됨. 과거 DEF-114/116/117/130 등 다수 결함이 이 구조(역할별 RLS 커버리지 누락)에서 발생 — 이관 시 재발 위험 지점으로 최우선 검증 필요 |
| Storage | 코드 내 `supabase.storage`/`.storage.from()` 호출 3건 확인 (UPS 라벨/무역서류 등 파일 저장) |
| Realtime | 사용 이력 없음 (확인됨) — 이관 부담 없음 |
| DB | PostgreSQL — RLS 자체는 Postgres 표준 기능이라 이식 가능. 단, Supabase 전용 스키마(`auth.*`, `storage.*`)·헬퍼 함수(`auth.uid()` 등) 의존이 문제 |
| 로컬 개발 환경 | R-14 원칙상 로컬 Supabase(CLI) 기반 — Supabase CLI/Docker 스택은 자체호스팅 여부와 무관하게 유지 가능 |

### 2.3 환경변수 인벤토리 (`.env.local` / `.env.example` / Vercel 프로젝트 등록분)

| 변수명 | 용도 | AWS 이관 시 매핑(안) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | (전략에 따라 변경) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | (전략에 따라 변경) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service role key | AWS Secrets Manager |
| `DATABASE_URL` | Postgres 직접 연결 | RDS/Aurora 또는 자체호스팅 Postgres 엔드포인트 |
| `RESEND_API_KEY` | 이메일 발송 | AWS Secrets Manager (서비스 자체는 유지 가능) |
| `SESSION_IDLE_TIMEOUT_MIN` | 세션 유휴 타임아웃 (Issue #988 관련) | 유지 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` | 에러 모니터링 | 유지 (Sentry는 AWS와 무관) |
| `SHXK_APP_KEY` / `SHXK_APP_TOKEN` | UPS 연동 API 키 | 유지, Secrets Manager로 이전 |

> 실제 값(시크릿)은 본 문서에 기재하지 않음. `vercel env ls` 기준 Production/Preview 등록 현황만 별도 확인 완료.

---

## 3. 확정 사항

- **Next.js 호스팅 대상: ECS Fargate** (2026-08-07 Edward 확정) — 컨테이너 기반, Vercel과 유사한 운영 경험, 자체호스팅 Supabase와 동일 VPC 구성이 용이함.

## 4. 미정 사항 — Supabase 처리 방안 (Edward 결정 대기, 비교자료 요청됨)

| 비교축 | ① Supabase 자체호스팅 (EC2/ECS + 공식 Docker 스택) | ② AWS 네이티브 전환 (RDS/Aurora + Cognito + S3) |
|---|---|---|
| 코드 재작성 범위 | 최소 — RLS 정책·인증 코드 거의 무변경 | 최대 — 전체 RLS 정책 재설계, 인증 플로우(로그인/세션/JWT 발급) 전면 재작성, Storage 호출부 전체 교체 |
| 리스크 | 낮음 — 기존 DEF-114/116/117류 RLS 결함 재발 가능성 최소 | 높음 — 동일 유형 결함이 새 인증 체계에서 재발할 여지, 회귀 테스트 전체 재검증 필요 |
| 운영 부담 | 자체 관리(패치·백업·스케일링)를 직접 수행 | AWS 관리형 서비스 이점(자동 백업/패치/오토스케일링) |
| 장기 통합성 | 향후 AWS 서비스(Cognito 등)와 이원화된 인증 체계 유지 | AWS 네이티브 서비스와 완전 통합, 장기 운영비 절감 가능성 |
| 예상 공수 | 상대적으로 작음 (인프라 이전 중심) | 상대적으로 큼 (애플리케이션 코드 전면 수정 수준) |
| 적합 시나리오 | 신속한 1차 AWS 이관, 이후 점진적 네이티브 전환 | 장기적으로 AWS 완전 종속 운영 목표 시 |

> **권고**: 고객 요청이 "① AWS 배포 → ② 기능개선 → ③ 전환" 순서인 점을 고려하면, 1차는 **① 자체호스팅으로 신속 이관**하여 리스크를 낮추고, ②단계(기능개선) 진행 중 필요 시 부분적으로 ②(네이티브 서비스)로 점진 전환하는 하이브리드 경로도 검토 가능. 단, 이는 권고안이며 최종 결정은 Edward.

---

## 5. 사전 준비 작업 목록

### 5.1 AWS 자격증명 도착 **전** 착수 가능 (본 세션에서 진행 중)

- [x] Vercel/Supabase 결합도 인벤토리 (§2)
- [x] 환경변수 인벤토리 (§2.3)
- [x] Supabase 처리 방안 비교자료 작성 (§4)
- [ ] ECS Fargate 배포용 Dockerfile 작성 (multi-stage build)
- [ ] GitHub Actions → ECR/ECS 배포 파이프라인 초안 작성 (계정 정보 없이 워크플로우 골격만)
- [ ] VPC/네트워크 구성 설계 초안 (자체호스팅 Supabase와 ECS Fargate 동일 VPC 배치 가정)

### 5.2 AWS 자격증명 도착 **후** 착수

- [ ] AWS 계정 구조 확인 (Organization 여부, IAM 사용자/역할 정책)
- [ ] ECR 리포지토리 생성, RDS/자체호스팅 Postgres 인스턴스 프로비저닝
- [ ] Secrets Manager 등록 (§2.3 매핑표 기준)
- [ ] 스테이징 환경 1차 배포 및 RLS 회귀 테스트 (R-08 전체 회귀 PASS 필수)
- [ ] DNS/도메인 전환 계획

---

## 6. 거버넌스 절차

- 본 건은 **Tech Stack 근본 변경**이므로, §4 방향 확정 후 `docs/01_WBS`에 신규 Phase로 정식 등재 필요 (기존 Phase 5/7 등재 사례와 동일 절차).
- Team A/Team B 역할 분담은 R-19에 따라 별도 확정 — 인프라/이관 자체는 Team A, 기존 기능 회귀 검증은 Team B 협조 예상(잠정, 미확정).
- 추적용 GitHub Issue 등록 예정 (§4 확정 후 상세 Task 분할).

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v0.1 | 2026-08-07 | Aiden (Claude) | 초안 작성 — Supabase 처리 방안 비교자료(§4) 포함, Edward 결정 대기 |
