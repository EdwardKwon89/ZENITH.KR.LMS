# DEF-058: 운송 요청 목록 "조회" 버튼 제거 → Debounce 자동 검색 전환

| 항목 | 내용 |
|:---|:---|
| **DEF#** | DEF-058 |
| **제목** | 운송 요청 목록 검색 방식 전환 — 조회 버튼 제거, Debounce 자동 검색 |
| **관련 UAT** | UAT-02-02 |
| **유형** | 기능 개선 |
| **블로킹** | N |
| **상태** | 수정완료 |
| **담당자** | Noah (Codex) |
| **수정 파일** | `src/components/orders/OrderFilterBar.tsx` |

---

## 배경

운송 요청 목록 페이지는 "조회" 버튼 클릭 시 URL params를 변경하여 서버에서 DB를 재조회하는 구조였으나, 운송 서비스 요율 페이지는 `ZenDataGrid`의 `onChange` 즉시 client-side 필터링을 사용하여 별도 버튼 없이 검색 가능. 두 페이지 간 UX 불일치를 해소하고자 "조회" 버튼을 제거하고 Debounce 자동 검색으로 전환.

## 수정 내용

### OrderFilterBar.tsx

- **"조회" 버튼 제거** (`handleSearch` 함수 + 버튼 JSX 삭제)
- **Debounce 자동 검색 도입**: `useEffect` + `setTimeout` 500ms
  - `search`, `selectedStatus`, `selectedType` 3개 상태 변화 감지
  - 마지막 입력 후 500ms 경과 시 자동 `router.push()` 실행
- **초기 마운트 중복 push 방지**: `useRef(isInitialMount)` guard
- **CREATE NEW ORDER 버튼 유지** — 위치/동작 변경 없음

### 영향 범위

- Server-side search 방식 유지 (데이터는 DB에서 조회)
- Debounce 주기 500ms로 설정 — 연속 입력 시 마지막 값만 반영
- `page` 파라미터는 항상 `'1'`로 초기화 (필터 변경 시 첫 페이지 이동)
