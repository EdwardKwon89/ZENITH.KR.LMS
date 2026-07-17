# TASK-B-155: Issue #567 — DEF-102 CSP connect-src에 data: 추가

## 개요
- **Task 번호**: TASK-B-155
- **Issue**: #567 (DEF-102)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P1
- **상태**: 🔔
- **PR**: #568
- **커밋 (code)**: `616223f0`
- **커밋 (docs)**: `bc966c2b`

## 배경
JSJung이 실제 브라우저에서 발견. `@react-pdf/renderer`가 의존하는 `yoga-layout`이 WASM 바이너리를 `data:application/octet-stream;base64,...` URI로 로드하는데, CSP `connect-src`에 `data:`가 없어서 CI/PL/UPS Invoice/출고 라벨 등 모든 PDF 다운로드가 차단됨.

## 변경 사항
- `next.config.ts:21` — `connect-src 'self'` 바로 뒤에 `data:` 추가

## 테스트 결과
- `npm run test:regression` → 95/95 ALL PASS (594 tests) ✅
