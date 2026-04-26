# SAR - FIN-03 세금계산서 번호 형식 오류 (BUG-06-A)

**문서번호:** SAR-2026-04-24-001  
**날짜:** 2026-04-24  
**작성자:** Aiden (AI Agent)  
**심각도:** MINOR (데이터 형식 불일치 — 기능 동작은 정상)

---

## 1. 현상 (What)

`src/app/actions/finance.ts` `issueTaxInvoice` 함수에서 세금계산서 번호(`taxInvoiceNo`)를 생성 시, `new Date().toISOString()` 결과에 `.slice(2, 10)`을 적용하여 연도를 2자리로 잘라내었습니다.

- **발생 코드** (`finance.ts:281`, 수정 전):
  ```typescript
  const taxInvoiceNo = `TX-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  // 결과 예시: TX-260424-4521  (6자리 YYMMDD)
  ```
- **API 명세 `Ds-11`의 요구 형식**: `TX-YYYYMMDD-SERIAL` (8자리 YYYYMMDD)
- **실제 출력 형식**: `TX-YYMMDD-SERIAL` (6자리 — 4자리 연도가 2자리로 축약됨)

---

## 2. 원인 (Why)

- **직접 원인**: `toISOString()`의 결과는 `"2026-04-24T..."` 형식이며, 날짜 부분(YYYY-MM-DD)은 index 0~9입니다. `slice(2, 10)`을 사용하면 `"26-04-24"`가 추출되어 연도가 `YY` 형식으로 손실됩니다.
- **근본 원인**: 명세서(`Ds-11`)와 구현 코드 사이의 형식 검증 단계 부재. 구현 후 형식 일치 여부를 단위 테스트로 자동 검증하는 체계가 없었습니다.
- **탐지 경위**: Aiden의 FIN-03 코드 심사(2026-04-24) 중 TASK_BOARD 리뷰 과정에서 Riley의 자가 발견·보고로 확인.

---

## 3. 조치 (How)

Riley가 즉시 수정 완료하였습니다.

- **수정 코드** (`finance.ts:281`):
  ```typescript
  const taxInvoiceNo = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  // 결과 예시: TX-20260424-4521  (8자리 YYYYMMDD)
  ```
- 수정 커밋: Phase 3.2 Finance 완성 작업 내 포함 (2026-04-24)

---

## 4. 검증 (Verification)

- `fin-03.test.ts` TC-F.7 `issueTaxInvoice` 테스트에서 번호 형식 검증 포함
- 전체 회귀 테스트 93/93 PASS 확인 (2026-04-24, `npm run test:regression`)

---

## 5. 예방 (Prevention)

- **체크리스트 추가**: `LIVE_PHASE_2_EXECUTE.md` — "생성 코드(번호, 날짜 문자열)의 형식이 API 명세(`Ds-11`)와 일치하는지 단위 테스트로 검증"
- **코딩 표준 강화**: `toISOString()`에서 날짜 부분 추출 시 반드시 `.slice(0, 10)` 사용. `.slice(2, ...)` 사용 시 ESLint/Biome 규칙으로 경고 검토
- **명세 검토 항목 추가**: API 명세서(`Ds-11`) 작성 시 "출력 형식 예시" 필드 필수 포함하여 구현자가 형식을 오해할 여지 제거
