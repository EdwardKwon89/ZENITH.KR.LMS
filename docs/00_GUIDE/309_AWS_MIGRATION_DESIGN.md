# 309. AWS 이관(Migration) 설계 초안

> **문서번호:** Ds-11 계열 (R-11 API/설계 우선 원칙 적용) | **버전:** v0.17 (초안 — 미승인)
> **작성일:** 2026-08-07 | **작성자:** Aiden (Claude, ZEN_CEO)
> **상태:** ▶️ **재개, 서버 상태 확인 대기** (2026-08-14, Edward 지시) — AWS 접속 정보 수령, DB 전환 최종 결정은 SSH 서버 실사 후로 보류(§8). §4에 ④ "Vercel만 대체" 옵션 추가 검토 중
> **v0.2 변경**: Edward 피드백("실제 배포 준비가 빠져 있다") 반영 — §6 실제 배포 준비 체크리스트 신설, Dockerfile/next.config.ts(`output: 'standalone'`)/package.json(`engines`) 실물 산출물 완료
> **v0.3 변경**: §4에 ③ 하이브리드(Supabase OSS 컴포넌트 + RDS/Aurora) 옵션 추가, 성능 비교표(§4.1) 및 하이브리드 코드영향 분석(§4.2) 신설 — Edward 요청("DB 환경 구성이 핵심 리스크 아닌가", "하이브리드도 코드 재작성 필요한가") 반영
> **v0.4 변경**: §7 AWS 자격증명 요청 사항 신설(필요 정보·IAM 권한 범위·안전한 전달 방법·Aiden이 할 수 없는 것) — Edward 요청("어떤 정보가 필요한지, 어떻게 전달해야 하는지 등록해줘") 반영
> **v0.5 변경**: **이관 작업 보류 처리** — AWS 접속 정보 수령 불가로 Edward가 보류 지시(2026-08-09). §5.2/§7의 "자격증명 도착 후" 항목은 재개 시점까지 미착수 유지
> **v0.6 변경**: **재개** — AWS 접속 정보 수령(2026-08-14). §8 신설 — 실제 수령한 정보의 형태가 §7 요청과 달라(IAM Access Key 대신 콘솔 로그인+SSH+MySQL 접속정보) 추가 확인·자료 필요 사항 기록
> **v0.7 변경**: §4에 **④ "Vercel만 대체, Supabase Cloud 그대로" 옵션** 추가(§4.3) — Edward 질의("Supabase를 MySQL로 전환해도 되는가" → 비권장 확인 후 "AWS가 Vercel만 대체하고 기존 Supabase는 유지할 수도 있지 않은가") 반영. 코드/DB 리스크 0인 가장 단순한 경로로, 서버 상태 확인과 무관하게 즉시 착수 가능
> **v0.8 변경**: §4.4 신설 — 원격 Supabase 플랜/사용량 Management API 실측(조직 플랜 `free` 확인, DB 24MB/Storage 530KB/사용자 16명 — 용량은 여유 있으나 자동 일시정지·PITR 부재·공유 Micro 컴퓨트가 실질 리스크). §4.3에 "AWS 기지불 계약 요인" 추가 — Edward 요청("Vercel의 무료/유료 제약처럼 Supabase도 조사 가능한가", "AWS는 이미 유료 계약")
> **v0.9 변경**: §4.3 (b) 표에 **(b') AWS Amplify Hosting** 옵션 추가(오늘 세션 검토) — Vercel과 유사한 DX이나 vercel.json Cron 3개 재구현(EventBridge Scheduler)·src/middleware.ts Edge→Node.js 런타임 전환이 실제 작업으로 필요함을 코드 확인. 빌드 산출물(72MB)은 Amplify 220MB 상한 내 확인. 무료 티어 성격(12개월 한정 vs 영구)은 출처 상충 — 콘솔 확인 필요
> **v0.10 변경**: §8.5 신설 — 읽기 전용 IAM Access Key 수령·전체 리전 CLI 스캔 완료. 실재 EC2 인스턴스 1개 확인(계정 529872010626, i-0ca26f8050a57250d, ap-northeast-2, c5.xlarge, 2026-01-26 생성, 퍼블릭IP 3.35.197.31 — §8.1 SSH 대상과 일치). 태그 없음·보안그룹명 launch-wizard-1로 미문서화 수동생성 서버로 추정, 키페어명 SENDATEKLOGISTICS는 배경조사 단서로 남김. §8.3 체크리스트 IAM Access Key 항목 완료 처리
> **v0.11 변경**: §8.6 신설 — SSH 개인키 수령·서버 내부 실사 완료(읽기전용). **결론: 이 서버는 SNTL이 별도로 운영 중인 살아있는 시스템**("포워딩 관리 시스템", DB명 sntl-system, nginx 4일 전 재시작·최종 코드수정 5주 전) — 방치된 빈 서버 아님. Edward 확인("별도로 운영 및 관리가 되어야 한다")으로 §8.3 배경설명 항목 완전 해소. **§4.3 (a) 옵션(발견된 서버에 직접 배포) 철회** — ZENITH_LMS 이관은 이 인스턴스와 완전히 별개로 진행. 조사용 보안그룹 임시 규칙 제거 필요(CLI 권한 부족, 콘솔 수동 제거 대기)
> **v0.12 변경**: §6.4 신설 — 통합(EC2 1대) vs 분리(Fargate+RDS) 비용 산정, `aws pricing get-products`로 서울 리전 정가 실측(추정 아님). 통합 약 $40/월, 완전분리(NAT 포함) 약 $99/월, NAT 생략 절충안 약 $57/월 — 차액 대부분이 NAT Gateway 하나 때문임을 확인, B'(NAT 생략) 권장. §6.3 비용산정 항목 완료 처리
> **v0.13 변경**: §10 신설 — AWS 전환 후 AI Agent 상시/반응형 운영 감시·장애대응 설계. Edward 질의("로컬처럼 AI Agent가 장애 원인분석 가능한가") 반영 — CloudWatch Logs/Metrics·Sentry·ECS describe·RDS 읽기전용 계정 5계층 매핑, 반응형(요청 시 진단)·상시감시형(Alarm 또는 `schedule` 자가진단) 두 경로 모두 기록. **진단(읽기)은 상시 허용, 조치(쓰기)는 매번 승인**(§8.6~8.7 보안그룹 조작과 동일 원칙) — Edward 확인("계층별 권한 설정으로 진행 가능")
> **v0.14 변경**: §10.6 신설 — 로컬 대비 진단 격차 실측(코드 확인: `logger.ts` 비구조화 텍스트, 320곳/82파일, Sentry setUser 미설정, requestId 없음) 및 보완 공수 산정(로거 구조화+AsyncLocalStorage 전파 1~2일, Sentry 연결 반나절, ECS Exec 활성화 1시간 내, 회귀 검증 반나절 — 합계 약 2~3일). Edward 질의("로컬과 동일 수준인가", "특별 로그 필요한가") 반영, IMP-013 전례 근거로 제시, Next.js Server Action 컨텍스트 전파 불확실성 명기
> **v0.15 변경**: §10.7 신설 — 로그 보존·아카이빙 정책. CloudWatch Logs 기본 보존이 "Never Expire"임을 확인(방치 시 무기한 누적), 실측가격(수집 $0.76/GB, 저장 $0.0314/GB-월, S3 Standard $0.025/GB-월)으로 CloudWatch 단기 보존(30~90일)+S3/Glacier 장기 아카이빙 생명주기 권장. Edward 질의("Log 관리 체계·Disk 활용도") 반영, §10.5 체크리스트에 보존기간 설정 항목 추가
> **v0.16 변경**: §8.6 조사용 보안그룹 임시 규칙(`14.33.240.210/32`) 제거 완료 확인(Edward 콘솔 조치, CLI 재확인) — SNTL 서버 조사 관련 절차 완전 종료

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

> **선행 질문 (2026-08-14 Edward 질의로 추가)**: 아래 ①②③은 전부 "Supabase(DB/Auth)도 AWS로 옮긴다"는 걸 전제로 한 옵션이다. 그런데 **애초에 Supabase까지 옮길 필요가 있는가?** Vercel만 AWS로 대체하고 Supabase Cloud는 원격 그대로 계속 쓰는 **④ 옵션도 가능**하며, 코드/리스크 관점에서는 이게 압도적으로 단순하다. 이 질문에 먼저 답한 뒤 ①②③ 논의로 넘어가는 것이 순서상 맞다.

> **핵심 판단축 (2026-08-07 Edward 확인)**: (④를 선택하지 않는다면) 이번 이관의 리스크는 결국 **"DB/Auth 계층을 어떻게 구성하느냐"** 하나로 수렴한다. 옵션은 이분법이 아니라 3가지다 — ①/②에 더해, Supabase OSS 컴포넌트(Auth/PostgREST/Storage)는 컨테이너로 유지하고 그 뒤의 DB만 RDS/Aurora로 교체하는 **③ 하이브리드**가 가능하다(Supabase의 Auth/PostgREST/Storage는 원래 임의의 Postgres에 붙는 독립 컴포넌트이기 때문).

| 비교축 | ① Supabase 자체호스팅 (Postgres도 컨테이너) | ② AWS 네이티브 전환 (RDS/Aurora + Cognito + S3) | ③ 하이브리드 (Supabase OSS Auth/PostgREST/Storage + RDS/Aurora) | ④ Vercel만 대체, Supabase Cloud 그대로 |
|---|---|---|---|---|
| 코드 재작성 범위 | 최소 — RLS 정책·인증 코드 거의 무변경 | 최대 — 전체 RLS 정책 재설계, 인증 플로우 전면 재작성, Storage 호출부 전체 교체 | **최소** — RLS·인증 코드 무변경(§4.2 근거) | **0 — 환경변수조차 안 바뀜**(§4.3) |
| 리스크 | 낮음 — RLS 결함 재발 가능성 최소, DB 자체 운영 부담은 별개 | 높음 — 새 인증 체계에서 동일 유형 결함 재발 여지, 회귀 전체 재검증 필요 | 낮음(코드), 단 RDS/Aurora 위에 Supabase 스키마 설치가 비공식 조합이라 **PoC로 사전 검증 필요**(§4.2) | **없음** — Supabase/DB/Auth 완전 무영향 |
| 운영 부담 | 높음 — DB까지 직접 관리(패치·백업·스케일링) | 낮음 — AWS 관리형 서비스 | 중간 — DB는 AWS 관리, Auth/PostgREST/Storage 컨테이너만 직접 운영(무상태 경량 레이어) | 낮음 — Supabase Cloud가 계속 관리, 호스팅만 추가 |
| 성능 | §4.1 참조 | §4.1 참조 | §4.1 참조 | 변화 없음(기존과 동일) |
| 예상 공수 | 상대적으로 작음 | 상대적으로 큼(애플리케이션 코드 전면 수정) | 작음 + PoC 기간 추가 | **가장 작음** — 컨테이너 빌드 + 배포 설정뿐 |
| 적합 시나리오 | 신속한 1차 이관 우선, DB 운영 부담 감수 가능 시 | 장기적으로 AWS 완전 종속 운영 목표 시 | **리스크와 성능을 동시에 확보하고 싶을 때** | **"일단 AWS로 옮겼다"는 결과가 급하거나, Supabase 이관 사유가 불명확할 때** |

> **권고**: 리스크(코드 재작성 범위)와 성능(장애조치·확장성)을 동시에 고려하면 **③ 하이브리드가 가장 유리**하다. 트레이드오프는 RDS/Aurora 위에 Supabase 스키마를 얹는 것이 Supabase 공식 지원 시나리오가 아니라는 점 — 자격증명 도착 후 소규모 PoC로 실제 동작을 먼저 검증하고 최종 확정 권장(§4.2). 이는 권고안이며 최종 결정은 Edward. **단, ④를 먼저 검토 — 고객이 Supabase까지 옮기라고 한 이유(비용/데이터 소재지/규정준수/단순 SaaS 탈피 등)가 확인되기 전까지는, ④로 "Vercel 부분만" 먼저 이관하고 DB 이관 여부는 별도로 판단하는 단계적 접근이 더 안전할 수 있음.**

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

### 4.3 ④ 옵션 상세 — "Vercel만 대체" (2026-08-14 Edward 질의 반영)

**결론: 코드 변경 0줄, DB/Auth/RLS 리스크 0.** 앱이 Supabase에 접근하는 방식은 환경변수(`NEXT_PUBLIC_SUPABASE_URL` 등)로 원격 API를 호출하는 것뿐이라, 앱이 어디서 실행되는지(Vercel vs AWS)는 Supabase 입장에서 무관하다.

**실행 경로 2가지**:

| 방식 | 필요한 것 | 특징 |
|---|---|---|
| ~~(a) 발견된 서버에 컨테이너 직접 실행~~ | ~~SSH 접속만(`sntl.pem`)~~ | **❌ 철회(2026-08-14, §8.6)** — 실사 결과 이 서버는 SNTL이 별도로 운영 중인 살아있는 시스템(`sntl-system` DB, "포워딩 관리 시스템")으로 확인됨. ZENITH_LMS를 여기 얹는 건 부적절 — 완전히 별개로 취급, 터치하지 않음 |
| (b) ECS Fargate(§3 확정안) | IAM Access Key 필요(§7) | 자동 스케일링·헬스체크·무중단 배포 등 정식 프로덕션 구성 |
| (b') AWS Amplify Hosting (2026-08-14 신설 검토) | IAM Access Key 또는 콘솔 GitHub 연동(§7) | Vercel과 가장 유사한 DX(git push 자동배포·PR 프리뷰 배포), Fargate보다 운영 부담 적음. **단 코드 확인 결과 재작업 필요 지점 있음**: ①`vercel.json` Cron 3개(§2.1과 동일 이슈) — Amplify도 내장 스케줄러 없어 EventBridge Scheduler로 별도 구현 필요 ②`src/middleware.ts`가 인증가드·i18n·rate-limit을 처리하는 핵심 게이트인데 Amplify는 Edge API Routes 미지원(non-edge/Node.js 런타임 미들웨어만 지원) — Next.js 15의 Node.js 미들웨어 옵션으로 전환 후 실배포 검증 필요. 빌드 산출물은 `.next/standalone` 72MB로 Amplify의 220MB 상한 내 여유 있음(확인 완료). 무료 티어(월 빌드 1,000분·SSR 요청 50만 건 등)가 "12개월 신규계정 한정"인지 "영구"인지는 출처가 엇갈려 콘솔에서 직접 확인 필요 |

**남는 질문**: 고객이 원래 "Vercel **및** Supabase"를 AWS로 옮겨달라고 했으므로(§1), ④는 이 요청의 절반만 충족한다. Supabase까지 옮기라고 한 실제 사유(비용 절감 / 데이터 소재지·규정준수 / 벤더 통합 / 단순히 "다 옮겨라") 확인 필요 — 사유에 따라 ④만으로 충분한지, 추후 ①②③ 중 하나로 DB까지 이관해야 하는지 갈림.

**AWS 기지불 계약 요인 (2026-08-14 Edward 확인)**: AWS는 이미 유료 계약 완료 상태. 반면 아래 §4.4 실측 결과 원격 Supabase는 **Free tier로 확인**됨 — Free tier 제약(자동 일시정지·PITR 없음·공유 Micro 컴퓨트·짧은 로그 보존)을 없애려면 (A) Supabase Pro 업그레이드(추가 비용) 또는 (B) DB를 이미 지불 중인 AWS로 이관(추가 비용 없음, 단 엔지니어링 공수) 중 하나가 필요 — (B)가 "이미 낸 돈 활용"이라는 점에서 고객이 Supabase까지 이관을 요청한 실제 동기였을 가능성이 있음(가설).

### 4.4 원격 Supabase 플랜/사용량 실측 (2026-08-14, Management API + 원격 DB 직접 쿼리)

Edward 질의("Vercel처럼 Supabase도 무료/유료 제약이 있는지") 반영 — Management API(`SUPABASE_ACCESS_TOKEN`)와 `supabase db query --linked`로 직접 조회.

**플랜/사양 (API 확인)**

| 항목 | 값 |
|---|---|
| 조직 플랜 | **`free`** (API 응답 필드로 확인, 추정 아님) |
| 컴퓨트 사양 | Micro — 공유 vCPU 2코어, RAM 1GB, 직접 커넥션 60개/pooler 200개 (유료 컴퓨트 애드온 미선택) |
| PITR(시점복구) 애드온 | 미선택 — 별도 $100~400/월 |
| 전용 IPv4 애드온 | 미선택 — 기본 공유/IPv6, 월 $4 |
| 커스텀 도메인 애드온 | 미선택 |

**실제 사용량 (원격 DB 직접 쿼리)**

| 항목 | 실측값 | 통상 Free tier 한도 대비 |
|---|---|---|
| DB 전체 크기 | 24MB | 5% 미만 |
| Storage 사용량 | ~530KB (business_docs 511KB + invoices 18KB) | 1% 미만 |
| Auth 사용자 수 | 16명 | 무의미한 수준 |

**결론**: 용량(DB/Storage/MAU)은 모의운영 규모라 **당장 문제 아님** — 이 때문에 서두를 필요는 없음. 진짜 리스크는 용량이 아니라 **플랜 등급의 동작 방식**(자동 일시정지 — 이미 실제 겪은 문제, PITR 부재, 공유 Micro 컴퓨트로 인한 실사용자 증가 시 처리성능 병목, 짧은 로그 보존 — 어제 Team B 접속오류 조사 시 실제 한계로 작용). 이는 DB를 AWS로 옮기든 안 옮기든, Supabase를 계속 쓰는 한 마주칠 문제. Supabase Pro 업그레이드(~$25/월)가 AWS DB 이관보다 훨씬 저렴/빠른 임시 처방이 될 수 있음.

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
| **비용 산정** | [x] §6.4 완료(2026-08-14, 실제 Pricing API 조회) | — |
| **롤백 계획** | 미작성 | 1차 AWS 배포 후 문제 발생 시 기존 Vercel/Supabase로 되돌리는 절차(DNS TTL 사전 단축, 구 환경 유지 기간 등) |

> **요약**: §4의 Supabase 처리 방안 결정과 무관하게 위 6.3 항목 대부분(도메인 결정, 네트워크 설계 골격, CI/CD 워크플로우 골격, Secrets 매핑 구체화, 비용 개략 산정)은 **지금 바로 착수 가능**하다. 단, Supabase Auth 대시보드 설정 확인은 원격 Supabase 프로젝트 접근 권한이 필요하고, 실제 리소스 프로비저닝은 AWS 자격증명 도착 후에만 가능하다.

### 6.4 비용 산정 — 통합(EC2 1대) vs 분리(Fargate+RDS) (2026-08-14, `aws pricing get-products` 실측)

§8.6에서 SNTL 서버가 별도 시스템으로 확인됨에 따라 ZENITH_LMS는 완전히 새로운 인스턴스(들)로 올려야 한다는 점이 확정됐다. 이어서 "Web/DB를 인스턴스 하나에 합칠지, 분리할지" 질문(Edward)에 대해 서울 리전 **On-Demand 정가를 AWS Pricing API로 직접 조회**해 비교했다(추정치 아님).

**옵션 A — 통합 (EC2 1대, SNTL 서버와 동일 구조: Web+DB+Redis를 Docker로 한 인스턴스에)**

| 항목 | 사양 | 월 비용(USD) |
|---|---|---:|
| EC2 | t3.medium (2vCPU/4GB), $0.052/hr | $37.44 |
| EBS gp3 | 30GB, $0.0912/GB-월 | $2.74 |
| **합계** | | **≈ $40** |

**옵션 B — 완전 분리 (§3 확정안 그대로: ECS Fargate + RDS + ALB + NAT, 프라이빗 서브넷 표준 구성)**

| 항목 | 사양 | 월 비용(USD) |
|---|---|---:|
| ECS Fargate | 0.5vCPU/1GB, x86 | $20.40 |
| RDS PostgreSQL | db.t4g.micro, Single-AZ, $0.025/hr | $18.00 |
| RDS 스토리지 | gp3 20GB(추정) | ≈ $2.30 |
| ALB | $0.0225/hr | $16.20 |
| NAT Gateway | $0.059/hr(+ GB당 $0.059, 트래픽 미미) | **$42.50** |
| **합계** | | **≈ $99** |

**옵션 B' — 분리 + NAT 생략 (Fargate를 퍼블릭 서브넷에 배치, 인바운드는 ALB로만 제한 / DB는 그대로 프라이빗 격리)**

| 항목 | 월 비용(USD) |
|---|---:|
| Fargate + RDS + RDS 스토리지 + ALB (NAT 제외) | **≈ $57** |

**결론**: 분리(B)가 통합(A)보다 2.5배 비싸지만, 차액의 대부분(**$42.50**)은 NAT Gateway 하나 때문이다 — 이 앱의 실제 규모(§4.4: 원격 DB 24MB, 사용자 16명)에 비해 압도적으로 큰 고정비다. **B'(NAT 생략)이 "Web/DB 분리"라는 안전 원칙은 유지하면서 비용은 통합(A)에 가깝게(월 $57, 약 8만원) 가져가는 절충안**으로 권장한다. 단, A로 갈 경우 §3에서 이미 확정한 ECS Fargate 결정을 재검토해야 함을 주의.

> 위 수치는 AWS 정가(List Price) 기준이며, 이미 체결된 유료 계약의 할인·크레딧은 반영되지 않았다. Savings Plans 등 장기 약정 시 추가 절감 가능.

---

## 7. AWS 자격증명 요청 사항 — 필요한 정보와 안전한 전달 방법 (2026-08-07)

> Edward 질의("직접 설정·확인해 줄 수 있는가")에 대한 답변으로 작성. Aiden(Claude)이 AWS CLI/Docker로 직접 작업하려면 아래 정보가 필요하다.

### 7.1 필요한 정보

| 항목 | 필요 이유 | 비고 |
|---|---|---|
| **Access Key ID / Secret Access Key** (프로그래매틱 액세스) | AWS CLI로 ECR/ECS/RDS/VPC 등을 직접 조작하기 위함 | **콘솔 로그인용 ID/Password는 불필요** — CLI는 Access Key 쌍만 사용 |
| AWS 계정 ID (12자리) | 리소스 ARN 구성, 대상 계정 확인 | |
| 대상 리전 | 이 서비스는 국내(한국) 고객 대상이므로 `ap-northeast-2`(서울) 권장 — 확정 필요 | |
| 신규 계정 여부 | 기존에 다른 프로젝트가 이미 올라가 있는 계정이면 리소스 네이밍/VPC 충돌 방지 필요 | |
| 예산/비용 알람 임계치 | 고객 요청 배경상 비용 통제 필요 — CloudWatch Billing Alarm 설정용 | 확정 안 되면 임시로 낮은 기본값 설정 후 조정 |
| (선택) 프로덕션 도메인 | §6.3에서 미확정으로 남겨둔 항목 — 확정 시 Route 53/ACM 설정에 사용 | 미정이면 AWS 기본 도메인(ALB DNS 등)으로 임시 운영 |

### 7.2 IAM 권한 범위 (권장)

- **1차 구축 단계(PoC~초기 배포)**: 신속한 진행을 위해 `AdministratorAccess`를 임시 부여하고, 안정화 후 아래 서비스로 범위를 좁힌 별도 정책으로 교체하는 방식을 권장 — ECR / ECS / RDS / VPC·EC2(보안그룹·ALB) / IAM(역할 생성, 제한된 prefix) / Secrets Manager / Route 53 / ACM / CloudWatch(Logs·Alarm) / S3
- **MFA 필수** 권장 (IAM 사용자에 MFA 디바이스 등록)
- **root 계정 자격증명은 어떤 경우에도 전달하지 않을 것** — 반드시 별도 IAM 사용자 발급

### 7.3 안전한 전달 방법 — 대화창에 직접 붙여넣지 말 것

이 대화(Claude Code 세션)에 Access Key/Secret Key를 텍스트로 붙여넣으면 **대화 기록에 그대로 남는다.** 아래 방법 중 하나를 사용한다.

1. **(권장) Edward가 로컬 터미널에서 직접 `aws configure` 실행** — 키 입력이 터미널 자체에서만 이루어지고 대화 기록에 남지 않음. 이후 Aiden(Claude)이 `~/.aws/credentials`의 로컬 프로파일을 사용해 작업.
2. **(대안) `.env.aws.local` 같은 별도 파일을 Edward가 직접 에디터로 작성** (`.gitignore` 대상, 커밋 금지) — Aiden은 해당 파일을 source하여 사용하되, 키 값을 대화 응답에 다시 노출하지 않음.
3. **(장기적으로 이상적)** AWS SSO/임시 STS 토큰 사용 — 발급 시 자동 만료되어 장기 노출 위험이 낮음. 조직에 SSO 구성이 없다면 1차는 방법 1로 진행.

### 7.4 Aiden(Claude)이 직접 할 수 없는 것

AWS 콘솔에서만 가능한 일부 단계(Organization 최초 설정, 결제 수단 등록, 일부 서비스 약관 동의, MFA 디바이스 최초 등록)는 Edward가 웹 콘솔에서 직접 처리해야 한다. 이 지점에 도달하면 사전에 안내한다.

---

## 8. AWS 접속 정보 수령 및 재개 현황 (2026-08-14)

### 8.1 수령한 정보의 형태 — §7 요청과 불일치

§7에서 요청한 것은 **IAM Access Key/Secret Access Key**(CLI 프로그래매틱 액세스)였으나, 실제로 수령한 것은 다음 3종이다:

| 항목 | 형태 | 용도/한계 |
|---|---|---|
| AWS 계정 로그인 | 이메일 + 비밀번호 (콘솔 로그인) | **브라우저 로그인 전용** — `aws` CLI/API 자동화에는 사용 불가. ECS/RDS 등 실제 인프라 구축 작업을 하려면 §7.1의 IAM Access Key가 별도로 필요 |
| SSH | `root@<서버IP>:22`, 비밀번호 없이 **개인키 파일(`.pem`) 인증 방식** | 실제 키 파일 내용 미수령(파일명만 전달됨) — 수령 전까지 접속 불가 |
| MySQL | 특정 호스트 내부 IP(Docker 브릿지 게이트웨이로 추정) + root 계정 | SSH 서버 내부에서만 도달 가능 — SSH 키 없이는 이 역시 접근 불가 |

### 8.2 중요 발견 — "신규 구축"이 아니라 "기존 서버"일 가능성

MySQL 접속 대상 IP가 Docker 브릿지 네트워크 게이트웨이 형태라는 점에서, SSH 대상 서버에 **이미 Docker 컨테이너로 무언가(MySQL 포함)가 운영 중**인 것으로 추정된다. 이는 §3~§4에서 전제한 "AWS에 ECS Fargate + RDS/자체호스팅 Supabase를 **새로** 구축"하는 그림과 다를 수 있다.

**Edward 확인(2026-08-14)**: 동일 프로젝트 — 이 계정으로 §3~§7 계획을 재개. 단, MySQL에 이미 운영 중인 데이터가 있는지는 **미확인 상태**이며, 확인 전까지는 **조회(읽기 전용)만 우선 수행**하기로 함(수정·삭제 금지).

### 8.3 재개를 위해 아직 필요한 것

- [x] **SSH 개인키 파일(`.pem`) 실제 내용** — 수령·접속 완료(2026-08-14). §8.6 실측 결과 참조
- [x] **IAM Access Key/Secret Access Key** — 읽기 전용(`ReadOnlyAccess`) 범위로 수령·`aws configure` 완료(2026-08-14). §8.5 실측 결과 참조
- [x] 기존 서버(`3.35.197.31`)에 대한 배경 설명 — **§8.6에서 확인 및 Edward 확인(2026-08-14)으로 완전 해소**: SNTL이 별도로 운영·관리하는 독립 시스템. ZENITH_LMS 이관 범위 밖.

### 8.5 IAM Access Key 실측 결과 (2026-08-14, 읽기 전용 CLI 조회)

전체 리전 스캔 결과 **EC2 인스턴스 1개만 확인됨**(다른 리전·Lightsail은 리소스 없음).

| 항목 | 값 |
|---|---|
| 계정 ID | `529872010626` (IAM 사용자: `zenith_lms`) |
| 서비스 | **EC2** (Lightsail/ECS 아님 — §4.3 (a)/(b) 논의와 정합) |
| 인스턴스 ID | `i-0ca26f8050a57250d` |
| 리전 | `ap-northeast-2`(서울) — 예상대로 확인 |
| 인스턴스 타입 | `c5.xlarge` (4 vCPU / 8GB RAM) |
| 상태 | `running` |
| 생성 시각 | **2026-01-26** — 오늘(08-14) 기준 약 7개월 전. "신규 구축 아님"(§8.2 추정)을 뒷받침 |
| 퍼블릭 IP | `3.35.197.31` — §8.1의 SSH 대상과 정확히 일치 |
| 프라이빗 IP | `172.31.53.112` (표준 VPC 대역 — §8.2에서 언급한 "Docker 브릿지 게이트웨이"는 이 인스턴스 내부의 별도 Docker 네트워크 주소로, 인스턴스 자체의 사설 IP와는 다름) |
| 키페어 이름 | **`SENDATEKLOGISTICS`** — 배경 조사(§8.3 세 번째 항목)의 단서. SNTL과의 관계 확인 필요 |
| 보안 그룹 | `launch-wizard-1`(EC2 콘솔 기본 마법사로 생성된 이름 — IaC/Terraform 등 정식 구성 흔적 없이 콘솔에서 수동 생성된 것으로 추정) |
| 인바운드 규칙 | 22(SSH)는 `60.217.65.58/32` 단일 IP로 제한(양호), 80/443은 전체 공개. **3306(MySQL) 규칙 없음** — MySQL이 보안그룹 레벨에서 아예 외부 노출이 안 되어 있어 SSH 경유 접근만 가능하다는 §8.1 설명과 정합 |
| 태그 | 없음(`Tags: null`) — Name/Owner/Project 태그 전무, 문서화되지 않은 서버였음을 시사 |
| 스토리지 | EBS `gp3` 100GB 1개(`in-use`) |
| AMI | `ami-0092e0c93f74c293a` |

**결론**: §4.3 (a)/(b) 논의에서 전제한 "발견된 서버"는 실재하는 **단일 EC2 인스턴스**로 확인됨. (당시엔 미확인 상태였던 내부 실사 결과는 §8.6 참조.)

### 8.4 진행 원칙 (안전장치)

- 개인키 수령 후 서버 조사는 **읽기 전용**(디스크/프로세스/Docker 상태 확인, MySQL은 `SHOW`/`SELECT`류만)으로 시작하고, 수정·삭제성 명령은 데이터 민감도 확인 후에만 진행한다.
- 이번에 수령한 자격증명(콘솔 비밀번호, MySQL root 비밀번호)은 대화 기록에 노출된 상태이므로, 작업 완료 후(또는 즉시) **회전(rotate) 권장** — Edward에게 별도 안내 완료.

### 8.6 SSH 서버 내부 실사 결과 — **결론: 별도 운영 시스템, 이관 범위 밖** (2026-08-14)

`.pem` 파일 수령 후 §8.4 원칙(읽기 전용)에 따라 실사 진행. 접속을 위해 보안그룹에 조사 목적 IP(`14.33.240.210/32`)를 22번 포트에 한해 임시 추가(Edward 승인) → 조사 완료 즉시 제거 예정(§8.4 회전 권장과 동일 취지).

**접속 정보 정정**: 전달받은 계정은 `root`였으나 실제로는 **`ec2-user`**로 로그인해야 함(Amazon Linux 표준 정책, root 직접 로그인 차단).

**실사 결과**:

| 항목 | 값 |
|---|---|
| OS 가동시간 | 199일 — 인스턴스 생성일(2026-01-26)과 정합, 재부팅 이력 없음 |
| Docker 컨테이너 | 3개, 전부 6개월 전 생성 — `nginx:1.9.15`(포트 80/443, 4일 전 재시작됨) · `mysql:8.0`(포트 3306) · `redis:latest`(포트 6379) |
| nginx가 서빙하는 내용 | **"포워딩 관리 시스템"** — React+Vite 빌드, 최종 수정일 **2026-07-09**(약 5주 전, 최근까지 유지보수됨) |
| MySQL DB 목록 | `information_schema`·`mysql`·`performance_schema`·`sys`(시스템 DB) + **`sntl-system`**(커스텀 DB) |
| 디스크 사용량 | 100GB 중 8.8GB(9%) |

**Edward 확인(2026-08-14)**: "별도로 운영되고 있는 시스템이다. 별도로 운영 및 관리가 되어야 한다."

**결론**:
1. 이 서버는 방치된 빈 서버가 아니라 **SNTL이 별도로 운영 중인 살아있는 운영 시스템**(DB명 `sntl-system`이 이를 뒷받침). §8.2에서 우려했던 "이미 운영 중인 데이터가 있는가"에 대한 답은 **예(Yes)**.
2. **§8.3 세 번째 항목(서버 배경 설명) 완전 해소** — 조사·Edward 확인 모두 완료.
3. **§4.3 (a) 옵션("발견된 서버에 컨테이너 직접 실행") 철회** — 이 서버는 SNTL의 별도 운영 시스템이 이미 자리를 차지하고 있어, ZENITH_LMS를 여기에 얹는 건 적절하지 않음. ZENITH_LMS AWS 이관은 §3 확정안(ECS Fargate) 또는 §4.3 (b)/(b') 경로로만 진행하고, 이 EC2 인스턴스는 **완전히 별개로 취급**(터치하지 않음).
4. [x] 조사용으로 열어둔 보안그룹 규칙(22번, `14.33.240.210/32`) — Edward가 콘솔에서 제거 완료(2026-08-14), CLI로 재확인함(`60.217.65.58/32`만 남음).

---

## 9. 거버넌스 절차

- 본 건은 **Tech Stack 근본 변경**이므로, §4 방향 확정 후 `docs/01_WBS`에 신규 Phase로 정식 등재 필요 (기존 Phase 5/7 등재 사례와 동일 절차).
- Team A/Team B 역할 분담은 R-19에 따라 별도 확정 — 인프라/이관 자체는 Team A, 기존 기능 회귀 검증은 Team B 협조 예상(잠정, 미확정).
- 추적용 GitHub Issue 등록 예정 (§4 확정 후 상세 Task 분할).

---

## 10. 운영 모니터링 — AI Agent 상시/반응형 대응 설계 (2026-08-14)

> **Edward 질의**: "로컬에서는 Aiden을 포함한 AI Agent가 테스트 오류·장애 원인을 정확히 분석할 수 있었다. AWS 전환 이후에도 상시 운영 상태 감시 및 장애 대응을 AI Agent가 할 수 있는 방법이 있는가?"
>
> **결론**: 가능하다. 로컬에서 파일시스템·로컬 Supabase에 직접 접근하던 것과 동등한(사실 더 풍부한) 진단을, AWS의 5개 계층에 **읽기 전용 권한**을 부여함으로써 재현할 수 있다. **진단(읽기)과 조치(쓰기)는 권한을 완전히 분리**한다 — 이는 §8.6~§8.7에서 SSH 조사 시 실제로 적용한 것과 동일한 원칙이다(읽기전용 IAM 키로 조사, 보안그룹 변경 등 쓰기 작업은 매번 별도 승인).

### 10.1 진단 계층 — 로컬 대응물과의 매핑

| 계층 | AWS 서비스 | 로컬에서의 대응물 |
|---|---|---|
| 앱 로그 | CloudWatch Logs (Fargate 태스크가 `awslogs` 드라이버로 자동 전송) | `console.log`/파일 로그 |
| 에러 추적 | Sentry (§6.2에서 이미 유지 확정) | 로컬 에러 스택 |
| 인프라 지표 | CloudWatch Metrics — Fargate CPU/메모리/네트워크, RDS 커넥션수/CPU/스토리지, ALB 5xx율/지연 | `top`/`docker stats` |
| 컨테이너 상태 | ECS `describe-tasks`/`describe-services` — 재시작 이력, 배포 상태, 크래시 원인(stopped reason) | `docker ps -a` |
| DB 직접 조회 | RDS 전용 **읽기전용 DB 계정**(앱 계정과 분리)으로 SQL 진단 | `supabase db query --linked`(§4.4에서 실제 사용한 방식과 동일 패턴) |

### 10.2 반응형(Reactive) — 사람이 요청 시 진단

1. 담당자가 증상 보고("느리다", "500 에러난다" 등)
2. Aiden이 CloudWatch Logs/Metrics·Sentry·ECS 상태·RDS 읽기전용 쿼리를 종합해 원인 분석
3. 원인 보고 + 필요 조치 제안(조치 자체는 10.4 원칙에 따라 별도 승인 후 실행)

> 오늘 §8.6에서 진행한 SNTL 서버 실사(SSH+MySQL 읽기전용 조사로 "포워딩 관리 시스템"임을 규명)가 이 흐름의 실제 사례다 — 대상이 자사 서버가 아니라 AWS 리소스 전반이라는 점만 다르다.

### 10.3 상시감시형(Proactive) — 문제 발생 전 선제 감지

- **CloudWatch Alarm 설정**: Fargate CPU/메모리, RDS 연결수·CPU·스토리지, ALB 5xx율·지연, ECS 태스크 재시작 횟수 등에 임계치 등록.
- **경로 A (알람 기반)**: Alarm → SNS → 담당자에게 알림(이메일 등) → 담당자가 Aiden에게 진단 요청(10.2 반응형과 동일 흐름, 트리거만 다름).
- **경로 B (자가진단 기반)**: Claude Code의 `schedule`(예약 실행) 기능으로 Aiden이 주기적(예: 10분 간격)으로 CloudWatch/Sentry를 스스로 조회해 이상 여부를 판단하고, 이상 발견 시 즉시 보고. 사람이 먼저 알아채기 전에 선제 발견 가능.

### 10.4 권한 설계 원칙 — 계층별 분리 (Edward 확인 반영)

> "계층별 권한 설정을 통해 진행할 수 있다"는 이해가 정확하다.

| 계층 | 권한 범위 | 승인 필요 여부 |
|---|---|---|
| **진단(읽기)** | CloudWatch Logs/Metrics/Alarms 읽기, ECS `describe-*`, RDS 읽기전용 DB 계정, Sentry read API | **상시 허용** — 사전 승인 불요, 언제든 조회 가능 |
| **조치(쓰기)** | ECS 태스크 재시작/롤백, RDS 파라미터 변경, 보안그룹 수정 등 | **매번 명시적 승인 필요** — §8.6~8.7의 보안그룹 추가/제거와 동일 원칙, 자동화하지 않음 |

### 10.5 구축 필요 항목 (체크리스트 — 실제 리소스 프로비저닝 이후 착수)

- [ ] 상시 운영용 읽기전용 IAM 정책 별도 발급 — §8.5에서 조사용으로 쓴 키와 별개로 발급, 로테이션 주기도 다르게 관리
- [ ] RDS 읽기전용 DB 계정 생성(`GRANT SELECT ON ...`, 앱 서비스 계정과 분리)
- [ ] Sentry 읽기전용 API 토큰 발급
- [ ] CloudWatch Alarm 임계치 설계 및 등록(Fargate/RDS/ALB)
- [ ] SNS 토픽 + 알림 채널(이메일/Slack 등) 연결
- [ ] (선택) `schedule` 기반 주기적 자가진단 루틴 등록

### 10.6 한계와 보완 — 로컬 대비 격차 및 소요 공수 (2026-08-14)

> **Edward 질의**: "장애 원인 분석은 로컬 처리 때와 동일한 수준으로 가능한가? 특별 로그를 남길 필요는 없는가?"
>
> **결론**: **지금 상태 그대로는 동일하지 않다.** 로컬은 파일시스템·라이브 프로세스에 직접 접근해 즉석 조사가 가능하지만, Fargate 컨테이너는 기록된 로그·지표에 없는 건 볼 방법이 없다. 실제 코드 확인 결과, 이 격차를 메울 "특별 로그"가 지금은 없다 — 아래처럼 보완이 **필요**하다.

**현재 상태 (코드 직접 확인, 2026-08-14)**:

| 항목 | 확인 결과 |
|---|---|
| `src/lib/logger.ts` | `console.log('[INFO]', ...args)` 형태의 텍스트 래퍼 — 구조화(JSON) 아님, requestId 등 필드 없음 |
| 로거 호출 지점 | 82개 파일, 320곳 |
| Sentry 사용자 컨텍스트 | `Sentry.setUser()` 호출 **없음** — 에러가 어느 사용자/조직에서 발생했는지 자동 연결 안 됨 |
| 요청 단위 추적 ID | 없음 — 사용자가 "몇 시에 에러났다"고 신고해도 로그만으로 전체 흐름 추적 어려움 |

**보완 방향과 예상 소요(1인 기준, 개략)**:

| 작업 | 범위 | 예상 소요 |
|---|---|---:|
| ① 로거 구조화(JSON) + AsyncLocalStorage 기반 requestId 컨텍스트 전파 | `logger.ts` 재작성 + 신규 context 모듈 + `middleware.ts` 진입점 1곳 — **기존 320개 호출부는 그대로 유지**(컨텍스트에서 자동 주입되므로 개별 수정 불필요) | 1~2일 |
| ② Sentry `setUser()` 연결 | 세션 확립 지점(auth 콜백/미들웨어) 1곳 통합 | 반나절 |
| ③ ECS Exec 활성화(태스크에서 `docker exec`처럼 라이브 진입) | 태스크 정의 플래그 + IAM 권한 — 코드 변경 아님, AWS 이관 시점에 함께 처리 | 30분~1시간 |
| ④ 전체 회귀 테스트 재실행·검증(R-08, `middleware.ts`는 핵심 파일) | 기존 스위트 그대로 실행 | 반나절 |
| **합계** | | **약 2~3일** |

> **근거**: 이 프로젝트에서 IMP-013("console→logger 교체, 53개 파일")이 실제로 1개 Task로 완료된 전례가 있어, 이번 320곳 규모도 개별 수정 없이 컨텍스트 자동주입 방식으로 가면 비슷한 범위의 공수로 가능하다고 판단.
>
> **불확실성(과잉확신 주의)**: Next.js App Router는 미들웨어·Route Handler·Server Action이 실행 컨텍스트가 서로 달라 AsyncLocalStorage가 매끄럽게 이어지는지 실제 검증이 필요하다 — 착수 전 소규모 PoC로 Server Action 경로까지 requestId가 잘 전파되는지 먼저 확인 권장. 안 되면 Server Action 쪽만 별도 처리(호출부 일부 수정)가 추가로 필요할 수 있어 상한을 3일 정도로 잡음.

### 10.7 로그 관리 체계 — 보존·아카이빙 (2026-08-14)

> **Edward 질의**: "Log만 남기는 게 아니라 Log 관리 체계도 준비되어야 한다. Disk 활용도를 높이기 위해."

**정정**: Fargate + CloudWatch Logs 구조에서는 컨테이너 로그가 로컬 파일이 아니라 `awslogs` 드라이버로 바로 CloudWatch에 스트리밍되므로, 전통적인 "로컬 디스크가 로그로 가득 찬다"는 문제 자체는 없다. **다만 형태만 바뀐 동일한 문제가 있다**: CloudWatch Log Group의 기본 보존 설정은 **"Never Expire"(영구 보관)** — 명시적으로 보존기한을 설정하지 않으면 로그가 무기한 쌓이고 비용도 계속 늘어난다. 이것이 AWS 환경에서의 "디스크 활용도" 관리 대상이다.

**실측 가격(`aws pricing get-products`, 서울 리전)**:

| 항목 | 가격 |
|---|---|
| CloudWatch Logs 수집(ingestion) | $0.76/GB (1회성, 로그 유입 시) |
| CloudWatch Logs 저장(storage) | $0.0314/GB-월 (매달 계속 부과) |
| S3 Standard 저장 | $0.025/GB-월 (저장만 비교하면 CloudWatch보다 저렴) |

이 프로젝트 규모(§4.4: DB 24MB·사용자 16명)면 월 로그량이 작아 당장 비용 자체는 미미(월 $1 미만 추정)하지만, **보존기한 미설정은 방치할수록 서서히 누적되는 전형적인 실수**이므로 처음부터 정책을 정해두는 것이 맞다.

**권장 로그 생명주기 체계**:

1. **CloudWatch Logs 보존기간 명시 설정** — 30~90일(최근 장애 진단용 "핫" 데이터만 유지). 기본값(영구) 방치 금지.
2. **장기 보관은 S3로 전환** — 보존기간 만료 전 Export/Subscription Filter로 S3에 적재, 감사·규정 목적 데이터는 S3 Lifecycle로 Glacier까지 자동 전환(더 저렴한 콜드 스토리지).
3. **로그 그룹을 용도별로 분리** — 앱 로그 / ALB 액세스 로그 / RDS 로그를 별도 Log Group으로 두어 보존기간을 각각 다르게 적용(예: 업무 감사 관련 로그는 더 길게, 디버그성 로그는 짧게).
4. **소스 단 볼륨 통제** — DEBUG 레벨은 프로덕션에서 비활성화(현재 `logger.ts`가 이미 이렇게 되어 있음, 유지). 과도하게 verbose한 로그는 §10.6의 구조화 전환 시점에 함께 정리.

**§10.5 체크리스트에 추가**:
- [ ] CloudWatch Log Group별 보존기간(Retention) 설정 — 기본값(Never Expire) 그대로 두지 않기
- [ ] (선택) S3 Export/Lifecycle 정책 — 장기 보관 필요 시

### 10.8 결론 — 로그 체계 정리 (2026-08-14, Edward 확정)

> **Edward 확정**: "log를 정리하자면 — 자체 로그로는 남고, 전용 log 분석 SaaS 서비스 및 오픈소스로 연결은 추후 별도로 진행한다."

이번 세션의 로깅 관련 논의(§10.6·§10.7, Sentry vs 자체 구축 검토)를 아래와 같이 최종 정리한다:

- **지금 범위**: §10.6에서 구현·머지 완료된 구조화 로깅(JSON) + `AsyncLocalStorage` 기반 requestId 전파 + `Sentry.setUser()` 연결(Issue #1130, PR#1131)까지가 **현 단계의 완결된 산출물**이다. 별도의 전용 로그 분석 플랫폼(Datadog Logs, ELK/OpenSearch, Grafana Loki 등 SaaS·OSS 불문) 연동은 지금 시점에서 **착수하지 않는다.**
- **후속 과제로 분리**: 전용 로그 분석 서비스(SaaS 또는 오픈소스 자체호스팅) 연동은 별도 Task로 취급하며, 착수 시점은 플랫폼 확장 로드맵이 구체화되는 때로 미룬다 — [[project_platform_expansion_error_tracking]] 참조.
- **§4 핵심 결정(Supabase 처리 방안)과는 무관** — 로그 체계는 §4 결정과 독립적으로 이미 정리 완료.

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v0.1 | 2026-08-07 | Aiden (Claude) | 초안 작성 — Supabase 처리 방안 비교자료(§4) 포함, Edward 결정 대기 |
| v0.2 | 2026-08-07 | Aiden (Claude) | Edward 피드백 반영 — §6 실제 배포 준비 체크리스트 신설(도메인·네트워크·CI/CD·Secrets·Auth 대시보드 설정·DB 마이그레이션·모니터링·비용·롤백), Dockerfile/`.dockerignore`/`next.config.ts`/`package.json` 실물 산출물 추가 |
| v0.3 | 2026-08-07 | Aiden (Claude) | §4에 ③ 하이브리드(Supabase OSS Auth/PostgREST/Storage + RDS/Aurora) 옵션 추가, §4.1 성능 비교표, §4.2 하이브리드 코드영향 분석(코드 재작성 불필요 결론 + PoC 필요성) 신설 |
| v0.4 | 2026-08-07 | Aiden (Claude) | §7 AWS 자격증명 요청 사항 신설 — 필요 정보(Access Key/계정ID/리전/예산 등), IAM 권한 범위 권고, 안전한 전달 방법(대화창 직접 붙여넣기 금지 — `aws configure`/로컬 env 파일/SSO 권장), Aiden이 직접 할 수 없는 콘솔 전용 작업 명시 |
| v0.5 | 2026-08-09 | Aiden (Claude) | **보류 처리** — AWS 접속 정보 수령 불가로 Edward 지시에 따라 이관 작업 전체 보류. Issue #995에 `status:blocked` 반영 |
| v0.6 | 2026-08-14 | Aiden (Claude) | **재개** — AWS 접속 정보 수령. §8 신설(수령 정보가 §7 요청과 형태 불일치, 기존 서버 가능성 발견, SSH 개인키·IAM Access Key 추가 필요, 읽기 전용 우선 원칙). §7 하위 절 번호 오류(8.1~8.4 → 7.1~7.4) 정정. Issue #995 `status:blocked` 해제 |
| v0.7 | 2026-08-14 | Aiden (Claude) | §4.3 신설 — ④ "Vercel만 대체, Supabase Cloud 유지" 옵션 추가(코드/DB 리스크 0, 서버 상태와 무관하게 즉시 착수 가능). Issue #1112(MySQL vs PostgreSQL 결정 보류) 등록 |
| v0.8 | 2026-08-14 | Aiden (Claude) | §4.4 신설 — 원격 Supabase 플랜/사용량 Management API 실측(조직 플랜 `free`, DB 24MB·Storage 530KB·사용자 16명). §4.3에 "AWS 기지불 계약 요인" 추가(Supabase Pro 업그레이드 vs AWS DB 이관 비교 필요) |
| v0.9 | 2026-08-14 | Aiden (Claude) | §4.3 (b) 표에 (b') AWS Amplify Hosting 옵션 추가 — Vercel과 유사한 DX, 단 vercel.json Cron 3개 재구현(EventBridge Scheduler)과 src/middleware.ts Edge→Node.js 런타임 전환이 실작업으로 필요함을 코드 확인(Edge API Routes 미지원). 빌드 산출물(.next/standalone 72MB)은 Amplify 220MB 상한 내 확인. 무료 티어가 12개월 한정인지 영구인지는 출처 상충 — 콘솔 확인 필요 |
| v0.10 | 2026-08-14 | Aiden (Claude) | §8.5 신설 — 읽기 전용 IAM Access Key로 전체 리전 CLI 스캔, EC2 인스턴스 1개 확인(ap-northeast-2, c5.xlarge, 2026-01-26 생성, IP 3.35.197.31 — §8.1 SSH 대상과 일치). 보안그룹 22번 포트 단일IP 제한 확인(양호), 3306 미노출 확인. 태그 전무·launch-wizard-1 보안그룹명으로 미문서화 수동생성 서버 추정 |
| v0.11 | 2026-08-14 | Aiden (Claude) | §8.6 신설 — SSH 개인키로 서버 내부 실사(읽기전용) 완료. 이 서버가 SNTL 별도 운영 시스템("포워딩 관리 시스템", DB sntl-system)임을 확인, Edward 확인으로 §8.3 완전 해소. §4.3 (a) 옵션 철회(이 서버는 이관 대상 아님) |
| v0.12 | 2026-08-14 | Aiden (Claude) | §6.4 신설 — EC2 통합 vs Fargate+RDS 분리 비용을 AWS Pricing API 실측으로 비교(통합 $40/월, 분리+NAT $99/월, 분리+NAT생략 $57/월). NAT Gateway가 분리 비용 차액의 대부분을 차지함을 확인, NAT 생략 절충안 권장 |
| v0.13 | 2026-08-14 | Aiden (Claude) | §10 신설 — AI Agent 상시/반응형 운영감시·장애대응 설계. 5계층(로그·에러추적·지표·컨테이너상태·DB) 읽기전용 매핑, 반응형·상시감시형(Alarm/schedule) 경로 기록, 진단(상시허용)·조치(매번승인) 권한 분리 원칙 확정 |
| v0.14 | 2026-08-14 | Aiden (Claude) | §10.6 신설 — 로컬 대비 AI Agent 진단 격차 실측(비구조화 로그·320곳/82파일·Sentry 사용자컨텍스트 없음) 및 보완 공수 산정(약 2~3일, IMP-013 전례 근거) |
| v0.15 | 2026-08-14 | Aiden (Claude) | §10.7 신설 — CloudWatch Logs 보존기한 정책(기본 영구보관 위험 확인) 및 S3/Glacier 아카이빙 생명주기, 실측 가격 기반(수집 $0.76/GB·저장 $0.0314/GB-월) |
| v0.16 | 2026-08-14 | Aiden (Claude) | §8.6 조사용 보안그룹 임시 규칙 제거 완료 확인 — SNTL 서버 조사 절차 완전 종료 |
| v0.17 | 2026-08-14 | Aiden (Claude) | §10.8 신설 — 로그 체계 결론 확정(Edward): 자체 구조화 로그(§10.6)는 현 단계 완결, 전용 로그 분석 SaaS/OSS 연동은 별도 후속 Task로 분리 |
