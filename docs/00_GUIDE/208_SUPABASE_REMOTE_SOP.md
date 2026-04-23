---
tags: ["procedure"]
---

# [208] Supabase Remote Database Operation Guide

> **프로젝트:** ZENITH_LMS
> **문서번호:** 208
> **작성자:** Antigravity (AI Agent)
> **대상:** 개발자 및 AI 에이전트
> **최종 수정일:** 2026-04-18

이 문서는 네트워크 제한 환경에서 `.env.local`의 정보를 활용하여 원격 Supabase 데이터베이스에 안전하게 접근하고 작업을 수행하는 표준 절차(Standard Operating Procedure)를 정의합니다.

## 1. 환경 정보 확인 (Authentication)
원격 작업을 수행하기 전, `root` 디렉토리의 `.env.local` 파일에서 아래의 핵심 정보를 식별합니다.

- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL` (프로젝트 ID 추출용)
- **Database URL**: `DATABASE_URL` (포트 5432 직접 접근용)
- **Access Token**: `SUPABASE_ACCESS_TOKEN` (CLI 로그인 및 Management API용)

## 2. 세션 초기화 및 로그인
CLI 도구(`rtk` 및 `supabase`)의 접근성을 보장하기 위해 경로를 설정하고 로그인을 수행합니다.

```bash
# PATH 설정 (R-02 규정 준수)
export PATH=$PATH:/opt/homebrew/bin

# 로그인 수행 (브라우저 인증 또는 토큰 입력)
rtk supabase login
```

## 3. 원격 DB 작업 절차 (Migration & Query)

### 시나리오 A: 네트워크 제한이 없는 경우 (직접 연결)
포트 5432(PostgreSQL)가 개방된 환경에서는 `DATABASE_URL`을 사용하여 가장 빠르게 반영할 수 있습니다.

```bash
# psql 직접 실행
psql "DATABASE_URL_VALUE" -f path/to/script.sql

# rtk/supabase cli 사용 시
rtk supabase db query --db-url "DATABASE_URL_VALUE" -f path/to/script.sql
```

### 시나리오 B: DNS/포트 제한 환경 (Management API - 권장)
DNS 해석 오류(`nodename nor servname provided`) 또는 5432 포트 차단 시, **HTTPS(443)** 기반의 Management API를 사용합니다.

```bash
# 1. 원격 프로젝트 연결 (최초 1회)
rtk supabase link --project-ref [PROJECT_ID]

# 2. --linked 플래그를 사용하여 API 터널링 쿼리 실행
rtk supabase db query --linked -f path/to/script.sql
```

> [!IMPORTANT]
> `--linked` 플래그는 `psql` 직접 연결 대신 Supabase 관리 API API를 통해 쿼리를 전달하므로, 방화벽이 엄격한 환경에서 가장 높은 성공률을 보입니다.

## 4. 작업 검증 (Verification)
쿼리 반영 후 반드시 스키마 조회를 통해 실제 반영 여부를 확인합니다.

```bash
rtk supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_name = 'target_table';"
```

---
## 📝 개정 이력
- **v1.0 (2026-04-18)**: 최초 작성 (DNS/포트 제한 환경 대응 로직 포함)
