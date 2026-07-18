# TASK-B-166: Issue #597 — DEF-110 createorder reference_no 하이픈 제거

| 메타 | 값 |
|:----|:----|
| **Issue** | [#597](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/597) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-19 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `src/lib/ups/label-mapping.ts` 수정 (1곳)

**DEF-110 원인**: `buildCreateOrderPayload()`가 `order.order_no`(하이픈 포함, 예: `ZEN-2026-000001`)를 `reference_no`에 그대로 전달 → SHXK createorder API가 하이픈 포함 reference_no를 거부. DEF-107(child_number)·DEF-108(getnewlabel/removeorder)과 동일 패턴.

- **78행**: `reference_no: order.order_no as string` → `reference_no: (order.order_no as string).replace(/-/g, '')`

> `cargovolume[].child_number`(13행)는 이미 DEF-107에서 `.replace(/-/g, '')` 적용 완료. 그 외 하이픈 포함 참조번호류 필드 없음 확인.

#### 2. 테스트 추가 (`tests/unit/ups/ups-labels-mapping.test.ts`)

- `buildCreateOrderPayload` 호출 시 `reference_no`에서 하이픈 제거 검증 (`toBe`)
- 하이픈 없는 `order_no`는 그대로 전달 검증
- 실제 ZENITH 주문번호 패턴(`ZEN-2026-000123`) 검증
- 기존 테스트 기대값 갱신 (`'ORD-001'` → `'ORD001'`)

### 검증
- **회귀 테스트**: 97개 파일, 629개 테스트 ALL PASS ✅

### 커밋
- 코드 커밋: `e8b75ca6`

### 발견 이슈
- 없음
