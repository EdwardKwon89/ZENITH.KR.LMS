# DEF-057: 운송 요청 목록 UI 레이아웃 조정

| 항목 | 내용 |
|:---|:---|
| **DEF#** | DEF-057 |
| **제목** | 운송 요청 목록 페이지 UI/레이아웃 배치 조정 |
| **관련 UAT** | UAT-02-01 (오더 등록) |
| **유형** | UI 개선 |
| **블로킹** | N |
| **상태** | 수정완료 |
| **담당자** | Noah (Codex) |
| **수정 파일** | `src/app/[locale]/(dashboard)/orders/page.tsx`<br>`src/components/orders/OrderFilterBar.tsx` |

---

## 배경

운송 요청 목록 페이지가 운송 서비스 요율 페이지와 일관된 레이아웃/스타일을 갖추도록 조정하고, 검색 필터 영역의 UX를 개선함.

## 수정 내용

### 1. 페이지 헤더 레이아웃 통일 (`orders/page.tsx`)

- 타이틀 크기 `text-xl` → `text-2xl tracking-tight` (요율 페이지와 일치)
- 설명 문구 추가: "등록된 운송 요청을 조회하고 관리합니다."
- 헤더 구조를 `<div>` wrapper로 통일

### 2. OrderFilterBar UX 개선 (`OrderFilterBar.tsx`)

- **버튼 위치 교환**: "조회" 버튼이 "CREATE NEW ORDER"보다 먼저 배치
- **버튼 텍스트 변경**: "Apply Filters" → "조회"
- **Caption 라벨 제거**: Search/Status/Type 필드명 라벨 삭제

## 미적용 사항

- sidebar collapsed state, 아이콘 변경, 신규 오더 버튼 위치 등은 이전 세션(DEF 범위 외)에서 이미 처리됨
