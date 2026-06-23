# DEF-074 — 주소록 조회 API 500 오류 (Failed to fetch address book entries)

> **DEF-ID**: DEF-074
> **발견일**: 2026-06-23
> **발견자**: Jaison (Claude, Team B)
> **발견 경위**: TASK-B-019 §1 E2E 통합 실행 중 E2E-21 실패
> **긴급도**: High
> **상태**: 🔔 Aiden 보고 대기

---

## 현상

E2E-21 주소록 시나리오 실행 시 페이지 로드 후 아래 오류 발생:

**콘솔 오류**:
```
Error: Failed to fetch address book entries
[ERROR] Dashboard Runtime Error: Error: Failed to fetch address book entries
```

**E2E 오류**:
```
Error: page.fill: Test timeout of 120000ms exceeded.
```

페이지 자체는 로드되나 주소록 목록 API 호출이 500으로 실패하고,
입력 폼 요소가 렌더링되지 않아 fill 동작 timeout 발생.

---

## 원인 추정

주소록 API (`/api/address-book` 또는 Supabase RPC) 호출 시 서버 오류 발생.
로컬 Supabase 환경에서 RLS 정책 또는 테이블 GRANT 누락 가능성 있음.

---

## 영향 범위

| 기능 | 영향 |
|:-----|:-----|
| 주소록 목록 조회 | ❌ API 500 |
| 주소록 신규 등록 | ❌ 페이지 입력 불가 |
| E2E-21 전체 시나리오 | ❌ FAIL |

---

## 재현 방법

```bash
# 로컬 환경에서
npm run dev
# 브라우저에서 /ko/address-book 접속
# → 콘솔에서 "Failed to fetch address book entries" 확인
```

---

## 권장 조치

1. `/api/address-book` 또는 관련 Supabase RPC 오류 로그 확인
2. `zen_address_book` 테이블 service_role GRANT 여부 점검 (DEF-071/072 패턴 참조)
3. RLS 정책 로컬 환경 적용 여부 확인

---

## 관련 파일 (추정)

- `src/app/[locale]/address-book/` 관련 파일
- Supabase migration — `zen_address_book` 테이블 GRANT

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-23 | Jaison (Claude, Team B) | DEF 최초 등록 — TASK-B-019 E2E 실행 중 발견 |
