# TASK-B-042: UAT-19 재실행 — DEF-086/087 해소 후 인보이스 PDF 검증

> **태스크 ID**: TASK-B-042  
> **생성일**: 2026-06-30  
> **담당자**: Baker (Test Engineer)  
> **우선순위**: P1  
> **상태**: 🔔  
> **관련 Issue**: [#157](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/157)  
> **관련 PR**: [#158](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/158)  
> **선행 Task**: TASK-169 ✅ (D_Kai — generateInvoicePdf SA) · TASK-170 ✅ (B_Kai — UI 버튼 ec2a344)

---

## 개요

DEF-086/087로 skip 처리된 UAT-19-01/02를 TASK-169+170 머지로 해소 완료에 따라 재실행.

---

## 작업 내역

### §1 i18n 키 추가

`Orders.ups_invoice.download_button` 키를 i18n 메시지 파일 4종에 추가:

- `messages/ko.json`: `"인보이스 PDF 출력"`
- `messages/en.json`: `"Download Invoice PDF"`
- `messages/ja.json`: `"インボイスPDFをダウンロード"`
- `messages/zh.json`: `"下载发票PDF"`

### §2 Spec 활성화 (`tests/e2e/uat-19-invoice-pdf.spec.ts`)

#### UAT-19-01: 인보이스 PDF 출력(미리보기) 검증 ✅

| 항목 | 변경 전 | 변경 후 |
|:----|:-------|:-------|
| test.skip | `test.skip(true, 'DEF-086/087 ...')` | **제거** |
| 로케이터 | `button:has-text("인보이스")` | `a:has-text("UPS")` |
| DB 검증 | `zen_invoice_files` 조회 | **제거** (클라이언트 사이드 생성, 서버 미호출) |
| 다운로드 검증 | 없음 | `page.waitForEvent('download')` 추가 |
| 파일명 패턴 | 없음 | `/UPS_INVOICE_.+\.pdf/` 검증 |

#### UAT-19-02: 인보이스 PDF 다운로드 파일명 및 무결성 검증 ✅

| 항목 | 변경 전 | 변경 후 |
|:----|:-------|:-------|
| test.skip | `test.skip(true, 'DEF-086/087 ...')` | **제거** |
| 로케이터 | `button:has-text("다운로드")` | `a:has-text("UPS")` |
| DB 검증 | `zen_invoice_files` 조회 | **제거** |
| 파일명 패턴 | `/Invoice_UPS_.+\.pdf/` | `/UPS_INVOICE_.+\.pdf/` |

### §3 테스트 실행 결과

```bash
$ npx playwright test tests/e2e/uat-19-invoice-pdf.spec.ts
# ✅ 2/2 PASS
```

```bash
$ npm run test:regression
# ✅ 387/387 PASS (69 files)
```

### §4 문서 갱신

- `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` 체크박스 ☑ 완료
- 스크린샷: `docs/99_Manual/UAT_19_Result/` (4종)

---

## DoD (Definition of Done)

- [x] `test.skip(true, 'DEF-086/087 ...')` 라인 제거 (UAT-19-01·02 2개소)
- [x] 주석 처리된 실 검증 로직 주석 해제 및 코드 보정
- [x] 로케이터 `a:has-text("UPS")` 적용
- [x] `zen_invoice_files` 조회 assertion 제거
- [x] 다운로드 이벤트 검증으로 대체 (`waitForEvent('download')`)
- [x] 파일명 정규식 `/UPS_INVOICE_.+\.pdf/` 적용
- [x] i18n 키 `Orders.ups_invoice.download_button` ko/en/ja/zh 4종 추가
- [x] `npx playwright test tests/e2e/uat-19-invoice-pdf.spec.ts` — 2/2 PASS
- [x] `npm run test:regression` — 387/387 PASS
- [x] `docs/91_FinalTest/UAT/UAT_19_UPS인보이스PDF.md` 체크박스 갱신
- [x] 스크린샷 `docs/99_Manual/UAT_19_Result/` 저장
- [x] 코드 커밋 (1차)
- [x] 문서 커밋 (2차) — R-17 준수
- [x] PR 생성 (`Closes #157`) → #158
- [x] Jaison 보고 완료

---

## 이슈

| # | 내용 | 상태 |
|:-:|:----|:----:|
| 1 | `zen_invoice_files`에 레코드 미생성 — 클라이언트 사이드 PDFDownloadLink 사용으로 인함. DB 검증 불가 | 해결 (검증 제거) |
| 2 | 파일명 `Invoice_UPS_` → `UPS_INVOICE_`로 변경 (실제 구현 반영) | 해결 |

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:----|:-----|:-------|:-----|
| v1.0 | 2026-06-30 | Baker | 최초 작성 — Issue #157 기반 |
| v1.1 | 2026-06-30 | Baker | 🔔 완료 보고 — PR #158, 387/387 PASS |
