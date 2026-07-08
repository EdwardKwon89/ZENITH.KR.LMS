# TASK-182 — 기준요금 매트릭스 UI 개선 (Issue #271)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-182 |
| **생성일** | 2026-07-08 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **관련 문서** | [An-16](../docs/02_Analysis/An_16_UPS_BaseRate_Matrix_UI.md), Issue #271 |
| **커밋 태그** | `[D_Kai]` |
| **브랜치** | `feature/teama-182-base-rate-matrix` (신규) |
| **상태** | 🔔 |

---

## 배경

UPS 요율 관리 > 기준요금 탭이 단순 리스트(ZenDataGrid)로 되어 있어 1,224건의 데이터를 한눈에 파악하기 어려움. UPS 공식 요금표(PDF/Excel)와 유사한 Zone×중량 매트릭스 형태로 개선.

Issue #271 — Edward 요구사항, Aiden 설계 승인 완료.

## 작업 범위

### 1. `src/components/ups/UpsBaseRateMatrix.tsx` 신규

- 제품 선택 콤보박스 (DOC 상단 / NON_DOC 하단 그룹, cargo_type 기준)
- Zone(Z1~Z10) = 열, 중량(0.5~30kg) = 행의 2D 매트릭스
- 각 셀: 판매가(윗줄) / 원가(아랫줄, 회색)
- 셀 클릭 → 기존 `upsertUpsBaseRate` 모달(기존 BaseRateForm 재사용, productId/zoneId/weightKg 프리필)
- Agency 할인율 미리보기: 드롭다운으로 Agency 선택 시 (기본 OFF), 우측 상단에 할인율 배지 표시

### 2. `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx` 수정

- `BaseRateTable` → `UpsBaseRateMatrix` 교체
- 기준요금 탭 신규등록 버튼 활성화 (조건 제거)

### 3. i18n

필요시 신규 키 추가 (매트릭스 헤더, Agency 미리보기 레이블 등)

## [작업 결과]

### 구현
- `src/components/ups/UpsBaseRateMatrix.tsx` 신규 (239줄)
  - 제품 선택 콤보박스 (DOC/NON_DOC optgroup)
  - Zone(Z1~Z10) × 중량(0.5~30kg) 2D 매트릭스
  - 셀: 판매가(윗줄) / 원가(아랫줄, 회색)
  - 할인율 미리보기: Agency 드롭다운 (기본 OFF) → 할인가 표시 + 배지
  - 셀 클릭 → 수정 모달 (기존 BaseRateForm 재사용, 프리필)
- `ups-rates-client.tsx` — BaseRateTable 제거, 신규등록 버튼 활성화

### 검증
- `npx tsc --noEmit`: 0 errors ✅
- `npm run test:regression`: 81 files / 489 PASS ✅
- 백엔드/DB 변경: 0건

### 작업 주체
- **지시·승인**: Edward (ZEN_CEO) — 실시간 협업 세션에서 UI 배치·표시 항목 직접 지시
- **구현**: D_Kai (DeepSeek)
- **모니터링**: Aiden (Claude) — PR 리뷰 및 R-17 준수 감독

### 관련 링크
- PR: #275 (초기, closed) / #280 (최종)
- Issue: #271

## DoD

- [x] `UpsBaseRateMatrix.tsx` 정상 렌더링 (제품 선택 → 매트릭스 표시)
- [x] 제품 콤보박스 DOC/NON_DOC 그룹핑 정상
- [x] 셀 클릭 시 수정 모달 product/zone/weight 프리필 확인
- [x] 신규등록 버튼 정상 동작
- [x] Agency 미리보기 ON/OFF 정상
- [x] `npm run test:regression` 전체 PASS (489/489)
- [x] `npx tsc --noEmit` 0 errors (신규 코드 기준)

## R-17 완료 보고 절차

1. 코드 커밋: `[D_Kai] feat: TASK-182 기준요금 매트릭스 UI`
2. 문서 커밋: `[D_Kai] docs: TASK-182 완료 보고 🔔`
3. PR 생성 → `develop`
