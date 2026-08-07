# 309. AWS 이관(Migration) 설계 초안

> **문서번호:** Ds-11 계열 (R-11 API/설계 우선 원칙 적용) | **버전:** v0.4 (초안 — 미승인)
> **작성일:** 2026-08-07 | **작성자:** Aiden (Claude, ZEN_CEO)
> **상태:** 🔍 검토 대기 — 핵심 방향(Supabase 처리 방안) 미정, Edward 승인 전 구현 착수 금지
> **v0.2 변경**: Edward 피드백("실제 배포 준비가 빠져 있다") 반영 — §6 실제 배포 준비 체크리스트 신설, Dockerfile/next.config.ts(`output: 'standalone'`)/package.json(`engines`) 실물 산출물 완료
> **v0.3 변경**: §4에 ③ 하이브리드(Supabase OSS 컴포넌트 + RDS/Aurora) 옵션 추가, 성능 비교표(§4.1) 및 하이브리드 코드영향 분석(§4.2) 신설 — Edward 요청("DB 환경 구성이 핵심 리스크 아닌가", "하이브리드도 코드 재작성 필요한가") 반영
> **v0.4 변경**: §7 AWS 자격증명 요청 사항 신설(필요 정보·IAM 권한 범위·안전한 전달 방법·Aiden이 할 수 없는 것) — Edward 요청("어떤 정보가 필요한지, 어떻게 전달해야 하는지 등록해줘") 반영

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

> **핵심 판단축 (2026-08-07 Edward 확인)**: 이번 이관의 리스크는 결국 **"DB/Auth 계층을 어떻게 구성하느냐"** 하나로 수렴한다. 옵션은 이분법이 아니라 3가지다 — ①/②에 더해, Supabase OSS 컴포넌트(Auth/PostgREST/Storage)는 컨테이너로 유지하고 그 뒤의 DB만 RDS/Aurora로 교체하는 **③ 하이브리드**가 가능하다(Supabase의 Auth/PostgREST/Storage는 원래 임의의 Postgres에 붙는 독립 컴포넌트이기 때문).

| 비교축 | ① Supabase 자체호스팅 (Postgres도 컨테이너) | ② AWS 네이티브 전환 (RDS/Aurora + Cognito + S3) | ③ 하이브리드 (Supabase OSS Auth/PostgREST/Storage + RDS/Aurora) |
|---|---|---|---|
| 코드 재작성 범위 | 최소 — RLS 정책·인증 코드 거의 무변경 | 최대 — 전체 RLS 정책 재설계, 인증 플로우 전면 재작성, Storage 호출부 전체 교체 | **최소** — RLS·인증 코드 무변경(§4.2 근거) |
| 리스크 | 낮음 — RLS 결함 재발 가능성 최소, DB 자체 운영 부담은 별개 | 높음 — 새 인증 체계에서 동일 유형 결함 재발 여지, 회귀 전체 재검증 필요 | 낮음(코드), 단 RDS/Aurora 위에 Supabase 스키마 설치가 비공식 조합이라 **PoC로 사전 검증 필요**(§4.2) |
| 운영 부담 | 높음 — DB까지 직접 관리(패치·백업·스케일링) | 낮음 — AWS 관리형 서비스 | 중간 — DB는 AWS 관리, Auth/PostgREST/Storage 컨테이너만 직접 운영(무상태 경량 레이어) |
| 성능 | §4.1 참조 | §4.1 참조 | §4.1 참조 |
| 예상 공수 | 상대적으로 작음 | 상대적으로 큼(애플리케이션 코드 전면 수정) | 작음 + PoC 기간 추가 |
| 적합 시나리오 | 신속한 1차 이관 우선, DB 운영 부담 감수 가능 시 | 장기적으로 AWS 완전 종속 운영 목표 시 | **리스크와 성능을 동시에 확보하고 싶을 때** |

> **권고**: 리스크(코드 재작성 범위)와 성능(장애조치·확장성)을 동시에 고려하면 **③ 하이브리드가 가장 유리**하다. 트레이드오프는 RDS/Aurora 위에 Supabase 스키마를 얹는 것이 Supabase 공식 지원 시나리오가 아니라는 점 — 자격증명 도착 후 소규모 PoC로 실제 동작을 먼저 검증하고 최종 확정 권장(§4.2). 이는 권고안이며 최종 결정은 Edward.

### 4.1 성능 비교 (관리적 측면 외 — 2026-08-07 Edward 요청)

| 항목 | ① 완전 자체호스팅 | ② AWS 네이티브 | ③ 하이브리드 |
|---|---|---|---|
| I/O 처리량/스토리지 | EBS 볼륨 성능에 의존, IOPS 직접 프로비저닝·증설 | Aurora는 분산 스토리지로 처리량 우수, 최대 128TB 자동 확장 | ①보다 우수 — RDS/Aurora 그대로 |
| 장애조치(Failover) 속도 | 수동 구성 스트리밍 복제, 통상 수 분·설정 실수 시 더 김 | Aurora 자동 페일오버 약 30초 | RDS/Aurora와 동일 |
| 읽기 확장(Read Replica) | 직접 복제 구성 + 앱 라우팅 로직 직접 구현 | 콘솔/API로 즉시 추가, RDS Proxy 자동 라우팅 | 동일하게 쉬움 |
| 커넥션 풀링 | PgBouncer/Supavisor 직접 컨테이너 운영 필요 | RDS Proxy 관리형 풀링 | RDS Proxy 경유 가능 |
| 백업 시 성능 영향 | `pg_dump`/WAL 아카이빙이 운영 DB에 직접 I/O 부하 | 스토리지 레벨 스냅샷 — 영향 거의 없음 | 동일하게 영향 없음 |
| Storage(파일) 성능 | storage-api를 로컬 디스크로 잘못 구성 시 저하 — S3 백엔드 필수 | 네이티브 S3 | S3 백엔드 구성 시 ①③ 사실상 동일 |
| 현재 트래픽 기준 체감차 | 평상시엔 튜닝하면 체감차 작음, **급증 시점(성수기·UPS 대량 폴링) 확장 대응 속도**에서 격차 발생 | 최선 | 최선 |

### 4.2 하이브리드 코드영향 분석 — "코드 재작성이 필요한가?" (2026-08-07 Edward 질의 반영)

**결론: 애플리케이션 코드 재작성 불필요.** 코드베이스 재점검 근거:

| 확인 항목 | 결과 | 의미 |
|---|---|---|
| `DATABASE_URL` 앱 런타임 사용 여부 | 앱 코드(`src/`) 내 사용 **없음** — CLI/시드 스크립트(`scripts/seed-local.ts`) 전용 | 앱은 항상 `supabase-js` SDK로 REST API(Auth/PostgREST/Storage)만 호출, DB 물리 위치와 무관 |
| Raw `pg` 드라이버(`new Pool()` 등) 직접 사용 | 앱 코드 내 **없음** | DB 엔드포인트 교체가 앱 코드에 영향 없음 |
| 커스텀 Postgres 확장 | `btree_gist` 1개뿐(마이그레이션 전수 조사) | RDS/Aurora 표준 지원 확장 — 호환 문제 없음 |
| `pg_net`/`pg_cron`/`vault` 등 Supabase 전용 확장 의존 | 실사용 없음 — `20260428235219_remote_schema.sql`의 `drop extension if exists "pg_net"` 한 줄은 Cloud dump 잔재이며 실제 호출부 없음 | RDS에서 지원 제한적인 확장에 대한 실질 의존 없음 |

즉 바뀌는 것은 `NEXT_PUBLIC_SUPABASE_URL`이 가리키는 API Gateway 주소뿐이고, RLS 정책·`auth.uid()`·SDK 호출부는 그대로 유지된다.

**단, 순수 인프라 작업(코드 아님)은 필요**: RDS/Aurora에 Supabase `auth`/`storage` 스키마·역할(`anon`/`authenticated`/`service_role` 등) 초기 설치, GoTrue/PostgREST/Storage 컨테이너의 DB 연결정보 설정.

**PoC로 사전 검증이 필요한 리스크**: RDS/Aurora의 master 계정은 진짜 superuser가 아님(AWS가 관리형 서비스 보호 목적으로 제한). Supabase 셀프호스팅 초기화 스크립트 일부가 superuser 권한을 전제할 수 있고, "RDS 위에 Supabase OSS 얹기"는 Supabase가 공식 문서화한 표준 지원 시나리오가 아니다 → **자격증명 도착 후 테스트용 RDS 인스턴스에 GoTrue/PostgREST를 붙여 `auth.uid()`/RLS 정상 동작을 먼저 확인**하고 하이브리드를 최종 확정 권장.

---

## 5. 사전 준비 작업 목록

### 5.1 AWS 자격증명 도착 **전** 착수 가능 (본 세션에서 진행 중)

- [x] Vercel/Supabase 결합도 인벤토리 (§2)
- [x] 환경변수 인벤토리 (§2.3)
- [x] Supabase 처리 방안 비교자료 작성 (§4)
- [x] ECS Fargate 배포용 Dockerfile 작성 (multi-stage build, `/Dockerfile`) — `next.config.ts`에 `output: 'standalone'`, `package.json`에 `engines.node` 추가 완료
- [ ] GitHub Actions → ECR/ECS 배포 파이프라인 초안 작성 (계정 정보 없이 워크플로우 골격만)
- [ ] VPC/네트워크 구성 설계 초안 (자체호스팅 Supabase와 ECS Fargate 동일 VPC 배치 가정)

> 상세 갭 분석 및 나머지 항목은 §6 참조.

### 5.2 AWS 자격증명 도착 **후** 착수

- [ ] AWS 계정 구조 확인 (Organization 여부, IAM 사용자/역할 정책)
- [ ] **하이브리드(§4.2) PoC**: 테스트 RDS/Aurora 인스턴스에 Supabase GoTrue/PostgREST 스키마·역할 설치 후 `auth.uid()`/RLS 정상 동작 확인 — Supabase 처리 방안 최종 확정의 선행 조건
- [ ] ECR 리포지토리 생성, RDS/자체호스팅 Postgres 인스턴스 프로비저닝
- [ ] Secrets Manager 등록 (§2.3 매핑표 기준)
- [ ] 스테이징 환경 1차 배포 및 RLS 회귀 테스트 (R-08 전체 회귀 PASS 필수)
- [ ] DNS/도메인 전환 계획

---

## 6. 실제 배포 준비 체크리스트 (구체화, v0.2 — Edward 피드백 반영)

§4~5는 "무엇으로 이관할지"에 대한 전략 비교였고, 아래는 **실제로 배포하려면 무엇이 더 필요한지** 코드/설정 재점검을 통해 도출한 구체 항목이다.

### 6.1 이번 점검에서 완료한 것

| 항목 | 내용 |
|---|---|
| `Dockerfile` | multi-stage build (`deps` → `builder` → `runner`), `next start` 대신 standalone 서버(`server.js`) 실행 방식 |
| `.dockerignore` | 빌드 컨텍스트에서 `node_modules`/`.next`/`docs`/시크릿 파일 제외 |
| `next.config.ts` | `output: 'standalone'` 추가 — Docker 이미지 경량화(불필요한 `node_modules` 전체 복사 방지). Vercel 배포에는 영향 없음(Vercel은 자체 빌드 파이프라인 사용) |
| `package.json` | `engines.node` 명시(`>=22.0.0`) — 그동안 Node 버전이 고정되어 있지 않아 컨테이너 베이스 이미지 버전 선택 근거가 없었음 |

### 6.2 이번 점검에서 확인된 사실 (긍정적)

| 항목 | 확인 내용 |
|---|---|
| 하드코딩된 도메인 | 코드 전체에 `zenith-lms-hazel.vercel.app` 등 하드코딩 참조 **없음** — URL 전환 시 코드 수정 불필요 |
| 웹훅/콜백 | UPS(SHXK) 연동은 **폴링 방식**(`ups-tracking-poll` cron)만 확인됨, 외부 시스템이 우리 URL로 콜백하는 웹훅 엔드포인트 없음 — 이관 시 외부 업체에 URL 변경을 통보할 필요 없음 |
| CORS 특수 설정 | 별도 CORS 미들웨어 없음 — 이관 시 추가 고려사항 없음 |
| 커스텀 도메인 | Vercel 프로젝트에 등록된 커스텀 도메인 **0건** (현재 `zenith-lms-hazel.vercel.app` 별칭만 사용 중) |

### 6.3 아직 빠져 있는 것 — 결정/작업 필요 (자격증명 도착 전 설계만 가능, 실행은 이후)

| 영역 | 현재 상태 | 필요 조치 |
|---|---|---|
| **프로덕션 도메인** | 커스텀 도메인 없음(§6.2) | AWS 환경에서 고객이 접속할 도메인을 신규 확보할지, 기존 `vercel.app` 유사 별칭(ALB/CloudFront 기본 도메인)으로 임시 운영할지 **Edward 결정 필요**. 확정 시 Route 53 + ACM 인증서 발급 필요 |
| **네트워크/보안 설계** | 미작성 | VPC/서브넷(Public/Private 분리), ALB, 보안그룹, ECS 태스크용 IAM 역할(최소권한) 설계 — 자격증명 도착 전 골격 설계는 가능, 리전/계정ID 확정은 자격증명 필요 |
| **CI/CD 파이프라인** | 미작성 (§5.1 미완료 항목) | GitHub Actions → ECR push → ECS 서비스 업데이트 워크플로우 yaml. 빌드 시점 `NEXT_PUBLIC_*` 값 주입 방식(Dockerfile ARG, 위 참조)도 여기 포함 |
| **Secrets 관리** | 매핑표(§2.3)만 존재 | AWS Secrets Manager 실제 등록 절차, ECS 태스크 정의의 `secrets` 필드 연결 방식 문서화 필요 |
| **Supabase Auth 대시보드 설정** | **코드/로컬설정에 없음 — 미확인 리스크** | `supabase/config.toml`의 `site_url`은 로컬 전용(`127.0.0.1`)이며, 실제 원격 Supabase Cloud 프로젝트의 Site URL·Redirect URLs·이메일 템플릿·SMTP 설정은 **Supabase 대시보드에만 존재**하여 코드 조사로 파악 불가 — 원격 대시보드 직접 확인 필요(자체호스팅 전환 시 이 설정 전체를 새 환경에 재구성해야 함) |
| **DB 마이그레이션 실행계획** | 미작성 | 현재 Supabase Postgres → 신규 환경으로 데이터 이관 방법(`pg_dump`/논리 복제), 다운타임 창, RLS 정책 포함 스키마 이관 후 정합성 검증 절차 |
| **모니터링/로깅** | Sentry(애플리케이션 에러)만 유지 확정 | Vercel의 기본 배포/함수 로그·Analytics를 대체할 CloudWatch Logs/Alarm 설계 필요 |
| **비용 산정** | 미작성 | ECS Fargate + (자체호스팅 Postgres 또는 RDS) + ALB + 데이터 전송 등 개략 월 비용 추정 — 고객 요청 배경상 예산 승인 라인 확인 필요 |
| **롤백 계획** | 미작성 | 1차 AWS 배포 후 문제 발생 시 기존 Vercel/Supabase로 되돌리는 절차(DNS TTL 사전 단축, 구 환경 유지 기간 등) |

> **요약**: §4의 Supabase 처리 방안 결정과 무관하게 위 6.3 항목 대부분(도메인 결정, 네트워크 설계 골격, CI/CD 워크플로우 골격, Secrets 매핑 구체화, 비용 개략 산정)은 **지금 바로 착수 가능**하다. 단, Supabase Auth 대시보드 설정 확인은 원격 Supabase 프로젝트 접근 권한이 필요하고, 실제 리소스 프로비저닝은 AWS 자격증명 도착 후에만 가능하다.

---

## 7. AWS 자격증명 요청 사항 — 필요한 정보와 안전한 전달 방법 (2026-08-07)

> Edward 질의("직접 설정·확인해 줄 수 있는가")에 대한 답변으로 작성. Aiden(Claude)이 AWS CLI/Docker로 직접 작업하려면 아래 정보가 필요하다.

### 8.1 필요한 정보

| 항목 | 필요 이유 | 비고 |
|---|---|---|
| **Access Key ID / Secret Access Key** (프로그래매틱 액세스) | AWS CLI로 ECR/ECS/RDS/VPC 등을 직접 조작하기 위함 | **콘솔 로그인용 ID/Password는 불필요** — CLI는 Access Key 쌍만 사용 |
| AWS 계정 ID (12자리) | 리소스 ARN 구성, 대상 계정 확인 | |
| 대상 리전 | 이 서비스는 국내(한국) 고객 대상이므로 `ap-northeast-2`(서울) 권장 — 확정 필요 | |
| 신규 계정 여부 | 기존에 다른 프로젝트가 이미 올라가 있는 계정이면 리소스 네이밍/VPC 충돌 방지 필요 | |
| 예산/비용 알람 임계치 | 고객 요청 배경상 비용 통제 필요 — CloudWatch Billing Alarm 설정용 | 확정 안 되면 임시로 낮은 기본값 설정 후 조정 |
| (선택) 프로덕션 도메인 | §6.3에서 미확정으로 남겨둔 항목 — 확정 시 Route 53/ACM 설정에 사용 | 미정이면 AWS 기본 도메인(ALB DNS 등)으로 임시 운영 |

### 8.2 IAM 권한 범위 (권장)

- **1차 구축 단계(PoC~초기 배포)**: 신속한 진행을 위해 `AdministratorAccess`를 임시 부여하고, 안정화 후 아래 서비스로 범위를 좁힌 별도 정책으로 교체하는 방식을 권장 — ECR / ECS / RDS / VPC·EC2(보안그룹·ALB) / IAM(역할 생성, 제한된 prefix) / Secrets Manager / Route 53 / ACM / CloudWatch(Logs·Alarm) / S3
- **MFA 필수** 권장 (IAM 사용자에 MFA 디바이스 등록)
- **root 계정 자격증명은 어떤 경우에도 전달하지 않을 것** — 반드시 별도 IAM 사용자 발급

### 8.3 안전한 전달 방법 — 대화창에 직접 붙여넣지 말 것

이 대화(Claude Code 세션)에 Access Key/Secret Key를 텍스트로 붙여넣으면 **대화 기록에 그대로 남는다.** 아래 방법 중 하나를 사용한다.

1. **(권장) Edward가 로컬 터미널에서 직접 `aws configure` 실행** — 키 입력이 터미널 자체에서만 이루어지고 대화 기록에 남지 않음. 이후 Aiden(Claude)이 `~/.aws/credentials`의 로컬 프로파일을 사용해 작업.
2. **(대안) `.env.aws.local` 같은 별도 파일을 Edward가 직접 에디터로 작성** (`.gitignore` 대상, 커밋 금지) — Aiden은 해당 파일을 source하여 사용하되, 키 값을 대화 응답에 다시 노출하지 않음.
3. **(장기적으로 이상적)** AWS SSO/임시 STS 토큰 사용 — 발급 시 자동 만료되어 장기 노출 위험이 낮음. 조직에 SSO 구성이 없다면 1차는 방법 1로 진행.

### 8.4 Aiden(Claude)이 직접 할 수 없는 것

AWS 콘솔에서만 가능한 일부 단계(Organization 최초 설정, 결제 수단 등록, 일부 서비스 약관 동의, MFA 디바이스 최초 등록)는 Edward가 웹 콘솔에서 직접 처리해야 한다. 이 지점에 도달하면 사전에 안내한다.

---

## 8. 거버넌스 절차

- 본 건은 **Tech Stack 근본 변경**이므로, §4 방향 확정 후 `docs/01_WBS`에 신규 Phase로 정식 등재 필요 (기존 Phase 5/7 등재 사례와 동일 절차).
- Team A/Team B 역할 분담은 R-19에 따라 별도 확정 — 인프라/이관 자체는 Team A, 기존 기능 회귀 검증은 Team B 협조 예상(잠정, 미확정).
- 추적용 GitHub Issue 등록 예정 (§4 확정 후 상세 Task 분할).

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v0.1 | 2026-08-07 | Aiden (Claude) | 초안 작성 — Supabase 처리 방안 비교자료(§4) 포함, Edward 결정 대기 |
| v0.2 | 2026-08-07 | Aiden (Claude) | Edward 피드백 반영 — §6 실제 배포 준비 체크리스트 신설(도메인·네트워크·CI/CD·Secrets·Auth 대시보드 설정·DB 마이그레이션·모니터링·비용·롤백), Dockerfile/`.dockerignore`/`next.config.ts`/`package.json` 실물 산출물 추가 |
| v0.3 | 2026-08-07 | Aiden (Claude) | §4에 ③ 하이브리드(Supabase OSS Auth/PostgREST/Storage + RDS/Aurora) 옵션 추가, §4.1 성능 비교표, §4.2 하이브리드 코드영향 분석(코드 재작성 불필요 결론 + PoC 필요성) 신설 |
| v0.4 | 2026-08-07 | Aiden (Claude) | §7 AWS 자격증명 요청 사항 신설 — 필요 정보(Access Key/계정ID/리전/예산 등), IAM 권한 범위 권고, 안전한 전달 방법(대화창 직접 붙여넣기 금지 — `aws configure`/로컬 env 파일/SSO 권장), Aiden이 직접 할 수 없는 콘솔 전용 작업 명시 |
