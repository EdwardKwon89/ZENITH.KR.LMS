# TASK-170 — DEF-086/087 인보이스 PDF — 오더 상세 화면 UI 버튼 구현

> **Task-ID**: TASK-170
> **생성일**: 2026-06-30
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-30)
> **담당**: B_Kai (Team A)
> **우선순위**: P2
> **상태**: 🔔
> **GitHub Issue**: [#152](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/152)
> **연관 DEF**: DEF-086, DEF-087
> **연관 Task**: TASK-169 (D_Kai — DB + Server Action, **전제조건**)
> **전제조건**: TASK-169 ✅ (D_Kai `generateInvoicePdf` Server Action 완료)
> **목표 완료일**: 2026-07-02

---

## 업무 개요

TASK-169(D_Kai)에서 `generateInvoicePdf` Server Action이 완성되면, 오더 상세 화면에 [인보이스 PDF 출력] 버튼을 추가하여 DEF-087을 해소한다.

**B_Kai 담당 범위**: UI 버튼 컴포넌트 + Server Action 연결 + UX

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-169 ✅ — `generateInvoicePdf` Server Action 구현 완료 | 🚫 |
| develop 최신 pull (TASK-169 코드 포함) | 착수 시 수행 |

---

## 구현 범위

### Git 동기화 (착수 전 필수 — R-17 §0)

```bash
git fetch origin
git checkout develop
git pull origin develop  # TASK-169 머지 확인 필수
git checkout -b feature/teama-task-170-invoice-pdf-ui-bkai
```

---

### §1 — 오더 상세 화면 UI 버튼 추가

**대상 파일**: 오더 상세 화면 컴포넌트 (경로 확인 필요 — `src/app/[lang]/orders/[id]/` 또는 유사 경로)

**구현 내용**:
1. [인보이스 PDF 출력] 버튼 추가 (기존 버튼 스타일 일관성 유지)
2. 버튼 클릭 → `generateInvoicePdf(orderId)` Server Action 호출
3. 로딩 상태 처리 (버튼 disabled + 스피너)
4. 성공 시: PDF 다운로드 또는 새 탭 열기 (`file_url` 사용)
5. 실패 시: 에러 토스트 메시지

```typescript
// 예시 (실제 컴포넌트 구조에 맞게 수정)
import { generateInvoicePdf } from '@/actions/invoicePdf'

// 버튼 onClick
const handlePdfDownload = async () => {
  setLoading(true)
  try {
    const { fileUrl } = await generateInvoicePdf(orderId)
    window.open(fileUrl, '_blank')
  } catch (e) {
    toast.error('PDF 생성 실패')
  } finally {
    setLoading(false)
  }
}
```

---

### §2 — i18n 메시지 추가

**대상**: `messages/ko.json`, `messages/en.json`

```json
// 추가 키
"orders": {
  "invoicePdf": {
    "button": "인보이스 PDF 출력",
    "generating": "PDF 생성 중...",
    "error": "PDF 생성에 실패했습니다."
  }
}
```

---

### §3 — 빌드 확인

```bash
rtk npm run build
```

---

### §4 — 회귀 테스트

```bash
rtk npm run test:regression
```

---

## DoD (Definition of Done)

- [x] Git 동기화 + 브랜치 `feature/teama-task-170-invoice-pdf-ui-bkai` 생성
- [x] §1 오더 상세 화면 [인보이스 PDF 출력] 버튼 추가 완료
- [x] §1 버튼 클릭 → `generateInvoicePdf` 정상 호출 확인 (로컬 테스트)
- [x] §1 로딩 상태·에러 처리 구현 확인
- [x] §2 i18n 키 추가 완료 (`ko.json`, `en.json`)
- [x] §3 `npm run build` PASS
- [x] §4 `npm run test:regression` PASS + 결과 기재
- [x] 스크린샷: `docs/99_Manual/TASK-170_Result/01_invoice_pdf_button.png` (버튼 UI)
- [x] 스크린샷: `docs/99_Manual/TASK-170_Result/02_pdf_download.png` (PDF 다운로드 확인)
- [x] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [x] 코드 커밋 해시 기재: `ad9d1d1`
- [x] 문서 커밋 해시 기재: `a9fd5fc`
- [x] PR 생성 (`References #152`)

---

## [설계 의견]

_B_Kai 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

### §1 — 오더 상세 화면 PDF 버튼 ✅
- `OrderFinanceSummary.tsx`에 인보이스 생성 후 [Download Invoice PDF] 버튼 추가
- 버튼 클릭 → `generateInvoicePdf(orderId)` Server Action 호출
- 로딩 상태 처리 (스피너 + 버튼 disabled)
- 에러 시 toast.error 표시
- 기존 "View Full Invoice" 스텁 버튼을 실제 PDF 다운로드 버튼으로 교체
- `Download` 아이콘 사용 (lucide-react)

### §2 — i18n 메시지 ✅
- `messages/ko.json`: `Finance` 섹션 신규 추가 (active_invoice, download_invoice_pdf, pdf_generating, pdf_generate_error)
- `messages/en.json`: `Finance` 섹션에 키 4종 추가

### §3 — 빌드 ✅
- `npm run build` PASS (Errors: 0, Warnings: 0)
- D_Kai TASK-169 `invoice-files.ts` 타입 오류(`never[]`) 수정 — `InvoicePdfData` 타입 명시

### §4 — 회귀 테스트 ✅
- `npm run test:regression` PASS
- `LAST_REGRESSION_RESULT`: PASS

### 코드 커밋 해시
| 해시 | 설명 |
|:----|:-----|
| `ad9d1d1` | feat: TASK-170 인보이스 PDF 출력 UI 버튼 + i18n + invoice-files.ts 타입 수정 |

---

## [발견 이슈]

1. **D_Kai TASK-169 `invoice-files.ts` 타입 오류**: `pdfData` 객체의 `costs: []`가 `never[]`로 추론되어 `npm run build` 실패. `InvoicePdfData` 타입 명시로 수정 완료 (TASK-170 범위 내에서 해결)
2. **`OrderFinanceSummary.tsx` i18n 미적용**: 기존 하드코딩된 영문 문자열(`Settlement Preview`, `Generate Final Invoice` 등)은 i18n 미적용 상태. 향후 별도 Task에서 i18n 전환 권장

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-30 | Aiden (ZEN_CEO) | TASK-170 신규 발령 — DEF-086/087 UI 버튼 · B_Kai · Issue #152 · 전제: TASK-169 ✅ · Edward 승인 |
