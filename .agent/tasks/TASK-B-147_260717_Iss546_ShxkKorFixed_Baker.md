# TASK-B-147: Issue #546 — resolveShxkCode 목적지코드 조회 → 'KOR' 고정

## 개요
- **Task 번호**: TASK-B-147
- **Issue**: #546 (Issue #545 하위 작업 1/3)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P1
- **상태**: 🔔

## 문제
UPS 라벨 발급 시 `resolveShxkCode`가 목적지 국가코드(`iso3Code`)로 `zen_ups_shxk_country_map`을 조회했으나, 이 테이블의 `country_code`는 실제로는 **출발지(한국) 고정 코드**(`'KOR'`, 12행: 제품 6종 × incoterms 2종)입니다. `shxk_code`는 "한국 출발" 서비스 코드로 목적지별 코드가 아닙니다.

## 수정 내용
- `src/app/actions/operations/ups-labels.ts` line 241: `iso3Code` → `'KOR'` 고정
- `resolveShxkCode` 함수 export 추가 (테스트 목적)
- 에러 메시지도 `country=KOR`로 변경

## 회귀 테스트
- `tests/integration/p7-shxk-kor-fixed.test.ts` 신규 추가
  - TC-SHXK-01: resolveShxkCode가 KOR으로 조회하는지 mock supabase로 검증
  - TC-SHXK-02: 소스코드에서 resolveShxkCode 호출부가 항상 'KOR'을 사용하는지 code-level 검증

## 커밋
- 코드 커밋: `resolveShxkCode` 호출부 'KOR' 고정 + export + 테스트
