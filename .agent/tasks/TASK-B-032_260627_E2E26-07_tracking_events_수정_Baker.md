# TASK-B-032 — E2E-26-07 zen_ups_tracking_events insert 수정 (필수 컬럼 누락 + 컬럼명 오류)

> **Task-ID**: TASK-B-032
> **생성일**: 2026-06-27
> **발령자**: Jaison (Team B AI 총괄)
> **담당**: Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **연관 Task**: TASK-B-029 (IMP-140)
> **전제조건**: TASK-B-029 🔄 (mock 모드 구현 완료)

---

## 업무 개요

E2E-26-07 (gettrack polling 첫 호출 → zen_ups_tracking_events 저장 확인) 테스트가 실패하는 원인을 수정한다.

### 현재 증상

```
expect(events!.length).toBeGreaterThan(0)
→ Received: events.length = 0
```

`zen_ups_tracking_events` insert가 NOT NULL 제약 위반으로 실패하고, `events` 조회 결과가 빈 배열.

### 확인된 버그 (수정 필수)

**`tests/e2e/e2e-26-ups-label-flow.spec.ts` — E2E-26-07 (line 410~415)**

```typescript
// 현재 (버그):
await supabase.from('zen_ups_tracking_events').insert({
  label_id: label.id,
  event_code: 'IT',
  event_time: new Date().toISOString(),  // TIME 타입 불일치
  raw_payload: mockPayload,              // 컬럼명 오류 (raw_response가 맞음)
});
// → NOT NULL 위반: order_id, tracking_number, event_date 누락
// → 컬럼명 오류: raw_payload (없음) → raw_response (실제 컬럼명)
```

### 스키마 확인 근거

`supabase/migrations/20260626000000_ups_008_labels_tracking_shxk_map.sql` —  
`zen_ups_tracking_events` 필수 컬럼:

| 컬럼 | 타입 | 제약 |
|:-----|:-----|:-----|
| `order_id` | UUID | NOT NULL |
| `tracking_number` | TEXT | NOT NULL |
| `event_code` | VARCHAR(10) | NOT NULL |
| `event_date` | DATE | NOT NULL |
| `event_time` | TIME | nullable |
| `raw_response` | JSONB | nullable (raw_payload 아님) |

---

## 구현 범위

### 수정 파일

```
tests/e2e/e2e-26-ups-label-flow.spec.ts
```

### 수정 내용 (E2E-26-07, line 408~415)

```typescript
// 수정 후:
const mockPayload = { tracking_number: label.tracking_number, status: 'IN_TRANSIT' };
const now = new Date();

// label에서 order_id 조회 (zen_ups_labels.order_id 컬럼 사용)
const { data: labelWithOrder } = await supabase
  .from('zen_ups_labels')
  .select('id, tracking_number, order_id')
  .eq('id', label.id)
  .single();

await supabase.from('zen_ups_tracking_events').insert({
  label_id: label.id,
  order_id: labelWithOrder!.order_id,           // NOT NULL 필수
  tracking_number: labelWithOrder!.tracking_number,  // NOT NULL 필수
  event_code: 'IT',
  event_date: now.toISOString().split('T')[0],  // DATE 타입 (YYYY-MM-DD)
  event_time: now.toTimeString().slice(0, 8),   // TIME 타입 (HH:MM:SS)
  raw_response: mockPayload,                     // 올바른 컬럼명
});
```

### 주의 사항

- E2E-26-07 앞 부분 `label.tracking_number` 체크는 유지 (`test.skip()` 로직 보존)
- 기존 `const mockPayload = { ... }` 라인 위치 이동 금지 (label.tracking_number 참조 후)

---

## DoD (Definition of Done)

- [x] E2E-26-07 저장 insert 수정 완료
- [x] `rtk npm run test:regression` 전체 PASS — 380/387 (7건 pre-existing)
- [x] 코드 커밋 해시: `a72301a`
- [x] 문서 커밋 해시: `e5b6c83`
- [x] 코드 커밋: `[Baker] fix: TASK-B-032 E2E-26-07 tracking_events insert 필수 컬럼 추가`
- [x] 문서 커밋: `[Baker] docs: TASK-B-032 완료 보고 — task file 🔔`

---

## [작업 결과]

### 구현 요약

- `tests/e2e/e2e-26-ups-label-flow.spec.ts` E2E-26-07 insert 수정:
  - `order_id` (NOT NULL) — `zen_ups_labels` 조회 후 전달
  - `tracking_number` (NOT NULL) — 동일 조회 결과 사용
  - `event_date` (DATE) — `now.toISOString().split('T')[0]` (YYYY-MM-DD)
  - `event_time` (TIME) — `now.toTimeString().slice(0, 8)` (HH:MM:SS)
  - `raw_payload` → `raw_response` 컬럼명 오류 수정
- 브랜치: `feature/teamb-task-b-032-e2e26-07-tracking-events` (B-029 기반)
- 빌드 PASS | 회귀 380/387 PASS (7건 pre-existing)

### 커밋

| # | 해시 | 유형 | 내용 |
|:-:|:----|:----:|:----|
| 1 | `a72301a` | 코드 | fix: TASK-B-032 E2E-26-07 tracking_events insert 필수 컬럼 추가 |
| 2 | `e5b6c83` | 문서 | docs: TASK-B-032 완료 보고 — task file 🔔 |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-27 | Jaison | TASK-B-032 신규 발령 — TASK-B-029 E2E-26-07 수정 서브태스크 |
