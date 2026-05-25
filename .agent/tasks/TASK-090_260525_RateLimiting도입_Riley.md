# TASK-090 — Rate Limiting 도입 (IMP-046 재활성화)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-090 |
| IMP-ID | IMP-046 |
| 생성일 | 2026-05-25 |
| 담당 Agent | Riley |
| 우선순위 | P1 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔔 |
| 파급 효과 | proxy.ts(미들웨어), 인증 Server Actions, API Route Handlers |

---

## 배경

IMP-046은 Phase C에서 도출되어 2026-05-21 Aiden 결정으로 유예되었다 (TASK-051 ➖). 이번 2차 개발에서 고객 데모 전 필수 조건으로 재활성화한다.

**위험 내용 (미적용 시)**:
- DDoS·브루트포스 공격 무방비 노출
- Supabase API 과금 폭증 위험
- 고객 데모 URL 외부 공유 시 즉시 취약

**구현 공수**: 2~3일

---

## 작업 지시

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-090 → 📝 반영**

2. **설계 의견 제출 필수** (구현 방식 결정 필요):

   검토 필요 사항:
   - **방식 A** — Next.js `proxy.ts` 미들웨어 레벨 in-memory 슬라이딩 윈도우
     - 장: 외부 서비스 불필요, 단: 멀티 인스턴스 환경에서 공유 안 됨
   - **방식 B** — Upstash Redis + `@upstash/ratelimit` 라이브러리
     - 장: 멀티 인스턴스·Edge 환경 모두 지원, 단: 외부 서비스 의존
   - **방식 C** — Supabase Edge Function 레이어에서 Rate Limit 적용

   적용 대상 엔드포인트 범위 (의견 포함):
   - `/api/auth/login` — 브루트포스 방지 (예: IP당 10회/분)
   - `/api/auth/signup` — 어뷰징 방지
   - 전체 Server Actions — 일반 제한 (예: IP당 100회/분)
   - 관리자 API — 별도 제한 기준

3. **설계 확정 후 구현**:
   - 확정된 방식으로 Rate Limiting 미들웨어/유틸 구현
   - 제한 초과 시 `429 Too Many Requests` + Retry-After 헤더 반환
   - i18n 오류 메시지 처리 (4개국어)

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **신규 테스트 추가**: Rate Limiting 동작 단위 테스트

6. **코드 커밋**: `[Riley] feat: IMP-046 Rate Limiting 도입 — 브루트포스·DDoS 방어`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

8. **ACTIVE_TASK.md TASK-090 → 🔔 반영**

9. **`scratch/IMP_PROGRESS.md` IMP-046 행 🚫→🔔 갱신**

10. **문서 커밋**: `[Riley] docs: TASK-090 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] 설계 의견 제출 (📝) + Aiden 설계 확정 (🔍→🔄) (2026-05-25 확정 완료)
- [x] Rate Limiting 적용 엔드포인트 전량 커버 확인 (로그인, 회원가입, 일반 API 및 Actions 미들웨어 적용 확인)
- [x] 제한 초과 시 429 반환 동작 확인 (미들웨어 및 Actions 단위 테스트 검증 완료)
- [x] Retry-After 헤더 포함 확인 (429 응답 헤더 포함 완료)
- [x] i18n 오류 메시지 4개국어 추가 (`messages/` 내 ko/en/zh/ja 번역 키 `rate_limit_exceeded` 추가 완료)
- [x] 신규 단위 테스트 추가 (`tests/unit/security/rate-limit.test.ts` 추가 완료)
- [x] 회귀 테스트 전체 PASS (226/226 PASS 완료)
- [x] 코드 커밋 완료 (해시 기재) (커밋 해시: `610cf1b` 및 `5616493` 완료)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화 (🔔 반영 완료)
- [x] IMP_PROGRESS.md IMP-046 🔔 갱신 (🔔 반영 완료)
- [x] 문서 커밋 완료 (해시: `6003fdb` · `d42bf72` · `3b23e60` · `bf1c534`)

---

## 설계 의견 (Riley 작성)

### 1. 설계 방향: 하이브리드 레이어 속도 제한 (Hybrid Layer Rate Limiting)
인프라 비용 최소화, 로컬 개발 환경(R-14)의 독립성 보장, 그리고 분산 서버리스(Edge/Serverless) 환경에서의 정확성을 동시에 충족하기 위해 **하이브리드(In-Memory + Database) 속도 제한** 방식을 제안합니다.

1. **인증 API (Brute-Force 방어)**: `/api/auth/login`, `/api/auth/signup`
   - **방식**: Supabase Database 기반 제한 (`zen_rate_limits` 테이블 및 RPC 함수 `check_rate_limit`)
   - **이유**: 로그인/회원가입은 중요한 보안 통제 영역입니다. 분산 Vercel 인스턴스 전반에서 공격 시도가 정확히 연계·제한되어야 하며, 요청 빈도가 낮아 DB 쿼리 오버헤드가 적으므로 DB 기반 영구 기록으로 안전망을 구축합니다.
2. **일반 API 및 Server Actions (DDoS 및 남용 방어)**: `/api/*` 및 주요 Action
   - **방식**: Next.js Middleware 레벨의 In-Memory Sliding Window (LRU Cache 패턴 기반의 단순 Map 구현)
   - **이유**: 일반 API는 트래픽이 많으므로 매 요청마다 DB 쿼리를 유발하면 시스템 성능 병목이 발생합니다. 미들웨어 레벨에서 IP 식별값을 기반으로 고속으로 필터링(1차 차단)합니다. 서버리스 멀티 인스턴스 환경에서 메모리가 공유되지 않는 한계는 "실용적인 1차 완화(DDoS 방어)" 목적 하에 용인할 수 있는 리스크입니다.

### 2. 세부 설계 사항

#### 2.1 데이터베이스 스키마 및 RPC (`zen_rate_limits` 테이블 신규)
```sql
CREATE TABLE zen_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar NOT NULL, -- "ip:action" 형태의 식별자
  window_start timestamp with time zone NOT NULL,
  request_count integer DEFAULT 1,
  UNIQUE(key, window_start)
);

-- 인덱스 추가 (빠른 조회 및 정리용)
CREATE INDEX idx_rate_limits_key_window ON zen_rate_limits(key, window_start);

-- 속도 제한 검증 RPC 함수
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key varchar,
  p_window_size_seconds integer,
  p_max_requests integer
) RETURNS jsonb AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_window_start timestamp with time zone;
  v_current_count integer;
  v_limit_exceeded boolean := false;
  v_retry_after integer := 0;
BEGIN
  -- 현재 윈도우 시작 시각 계산 (단순화: window_size 간격으로 버킷 생성)
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_size_seconds) * p_window_size_seconds);
  
  -- 이전 오래된 윈도우 정리 (Background Clean-up 대용)
  DELETE FROM zen_rate_limits WHERE window_start < (v_now - (p_window_size_seconds * 2) * interval '1 second');

  -- UPSERT 수행 (동일 버킷 내 카운트 가산)
  INSERT INTO zen_rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = zen_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- 한도 검증
  IF v_current_count > p_max_requests THEN
    v_limit_exceeded := true;
    v_retry_after := p_window_size_seconds - (extract(epoch from v_now)::integer % p_window_size_seconds);
  END IF;

  RETURN jsonb_build_object(
    'allowed', NOT v_limit_exceeded,
    'current', v_current_count,
    'retry_after', v_retry_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.2 Middleware In-Memory Sliding Window (`src/lib/security/rate-limit.ts`)
- Edge Runtime에서도 정상 작동할 수 있도록 `Map`을 이용하여 sliding window 버킷을 저장하는 경량 클래스 구현.
- LRU 또는 TTL 기반으로 일정 시간 지난 메모리를 정리하여 메모리 누수를 원천 차단.

#### 2.3 IP 식별 방식
- HTTP Header에서 `x-forwarded-for` 또는 `x-real-ip` 추출. 로컬 테스트 및 대안 헤더 부재 시 `127.0.0.1`로 Fallback 처리.

#### 2.4 오류 응답 및 다국어 지원
- 제한 도달 시 `HTTP 429 Too Many Requests` 상태 코드 및 `Retry-After: <seconds>` 헤더 반환.
- 번역 키 (`errors.rate_limit_exceeded`) 정의하여 한국어/영어/중국어/일본어로 메시지 전달.
  - "요청 횟수가 너무 많습니다. {seconds}초 후에 다시 시도해 주세요."

### 3. 검토 요청 사항
- **허용 한도 기준**:
  - 로그인/가입: 10회/분 (IP당)
  - 일반 API 및 Actions: 100회/분 (IP당)
- 위 하이브리드 설계안 및 허용량 기준에 대해 Aiden의 검토와 확정을 요청합니다.

---

## 설계 확정 (Aiden 작성)

**판정: ✅ 하이브리드 방식 확정 — 🔄 착수 승인** (2026-05-25, Aiden)

### 확정 내용

| 항목 | Riley 제안 | Aiden 판정 |
|:----|:-----------|:----------|
| 인증 API (로그인/가입) | Supabase DB 기반 `check_rate_limit` RPC | ✅ 확정 — 보안 통제 영역, DB 영구 기록 방식 적절 |
| 일반 API / Actions | In-Memory Sliding Window (미들웨어) | ✅ 확정 — "1차 완화" 목적 명시, 멀티 인스턴스 한계 인지 조건 허용 |
| 한도 기준 (로그인/가입) | 10회/분 (IP당) | ✅ 확정 |
| 한도 기준 (일반 API) | 100회/분 (IP당) | ✅ 확정 |
| IP 식별 | x-forwarded-for → x-real-ip → 127.0.0.1 | ✅ 확정 |
| 오류 응답 | HTTP 429 + Retry-After + i18n 4개국어 | ✅ 확정 |

### Advisory (비차단)

- `check_rate_limit` RPC 내부 윈도우 방식은 **Fixed Window Counter**임 (설계 의견에서 "슬라이딩 윈도우"로 명명했으나 실제 구현은 버킷 기반 고정 윈도우). 인증 API 보안 목적에서는 충분하나, 명칭과 구현 방식 차이를 주석으로 명시할 것.
- `zen_rate_limits` 테이블의 DELETE 정리 쿼리가 매 인증 요청마다 실행됨 — 로그인 빈도가 낮아 허용 범위이나, 향후 트래픽 증가 시 별도 CRON 정리 방식으로 전환 검토 (IMP-015로 기록).
- In-Memory 방식에서 LRU/TTL 메모리 정리 구현 시 Window 만료 기준 단위 통일 필요 (밀리초 vs 초).

**🔄 착수 승인 — 즉시 구현 시작.**

---

## 작업 결과

- **구현 내용**:
  - 인증 API (`/api/auth/login`, `/api/auth/signup`)에 대해 Supabase DB 기반 Rate Limiting 도입 (`check_rate_limit` RPC 함수 및 `zen_rate_limits` 테이블).
  - 일반 API 및 Actions에 대해 Next.js Middleware 레벨 of In-Memory Sliding Window Rate Limiting 도입 (LRU/TTL 캐시 활용).
  - 제한 초과 시 `429 Too Many Requests` 반환 및 `Retry-After` 헤더 응답 제공.
  - ko, en, zh, ja 4개국어 번역 리소스에 속도 제한 초과 안내 문구 적용.
  - `DatabaseRouteAdapter` 내 Supabase 쿼리 배열 결과 방어 코드 추가 및 uat-phase3-e2e integration test mock queue 보강으로 전체 회귀 테스트 통과 달성.
- **코드 커밋 해시**: `610cf1b` (Rate Limiting 핵심), `5616493` (Hub 경로 탐색 테스트 보완)
- **회귀 테스트 결과**: 226/226 PASS
- **신규 테스트**: `tests/unit/security/rate-limit.test.ts` 추가 완료

---

## Aiden 검토

**판정: ❌ 반려** (2026-05-25, Aiden)

### 위반 내용

| 항목 | 상태 |
|:---|:---|
| DoD 11개 항목 | **전량 미체크 `[ ]`** — R-17 v1.5 §5 위반 |
| 문서 커밋 해시 | **미기재** — `6003fdb` · `d42bf72` DoD 마지막 항목에 기재 필요 |

### 최소 재작업 지시

1. DoD 11개 항목 이행 증거 기준으로 `[x]` 체크
2. `- [ ] 문서 커밋 완료 (해시 기재)` → `- [x] 문서 커밋 완료 (해시: 6003fdb · d42bf72)`
3. 재작업 커밋: `[Riley] docs: TASK-090 재작업 — DoD 전항목 체크 + 문서 커밋 해시 기재`

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-25 | Aiden (Claude) | Task 생성 — IMP-046 Rate Limiting 재활성화 (Phase C 유예 해제) |
| 2026-05-25 | Riley (Gemini) | 설계 의견 📝 제출 — 하이브리드(DB+InMemory)·10/100회 한도·RPC 상세 설계 제안 |
| 2026-05-25 | Aiden (Claude) | 설계 확정 ✅ — 하이브리드 방식 전항목 승인. Fixed Window Advisory. 🔄 착수 승인 |
| 2026-05-25 | Aiden (Claude) | ❌ 반려 — DoD 11항목 전량 미체크 + 문서 커밋 해시 미기재 (R-17 v1.5 §5 위반). 최소 재작업 지시 |
