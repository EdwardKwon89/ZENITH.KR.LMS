# TASK-B-179: 출고처리 화면 UI 개선 4건

| 메타 | 값 |
|:----|:----|
| **Issue** | [#674](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/674) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-22 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. i18n 문구 변경 (4 로케일)
- "UPS 미발급" → "UPS 등록" (ko: 등록, en: Registered, ja: 登録済, zh: 已注册)

#### 2. OutboundProcessForm.tsx 변경
- 패키지별 "#N 번호 미발부" 칩 전체 제거
- "UPS접수취소" 버튼 — 출고확정과 같은 버튼 바에 추가
  - PACKED 선택 시에만 활성화
  - 기존 `undoUpsRegistration()` 재사용
  - 확인 팝업 포함
- 문서 출력 버튼 2종 — PACKED 오더 각각에 개별 버튼
  - "운송장 출력": `fetchAndIssueUpsLabel(orderId, 'WAYBILL')`
  - "운송장+세관신고서+INVOICE 출력": `fetchAndIssueUpsLabel(orderId, 'COMBINED')`

#### 3. DOC_TYPE_CONTENT_MAP 확장
- `COMBINED: '6'` 추가 (SHXK `lable_content_type=6`)

#### 4. fetchAndIssueUpsLabel 파라미터 확장
- `docType`에 `'COMBINED'` 타입 추가

### `markAllPackagesIssued()` 부수효과 판단
- 라벨 발급 시 `intl_ref_locked` 잠금은 의도된 동작
- 별도 출력 전용 경량 함수 불필요

### 파일 목록
- `src/components/warehouse/OutboundProcessForm.tsx` — UI 개선
- `src/app/actions/operations/ups-labels.ts` — COMBINED 타입 추가
- `messages/{ko,en,ja,zh}.json` — i18n 추가

### 검증
- 빌드: ✅ PASS
- 회귀: **110/110 파일 PASS, 730/730 테스트 PASS**
- 커밋 해시: `4a5872d2`
- PR: [#675](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/675)
