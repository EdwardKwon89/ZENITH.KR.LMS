# TASK-B-194: DEF-122 — getGlobalTrackingOverview isUnassigned 배열 인덱싱 오류

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#760](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/760) (DEF-122) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-23 |
| **우선순위** | P3 |
| **상태** | 🔔 |

## 근본 원인

`tracking.ts:230` — PostgREST 임베딩으로 `order`는 객체인데 `?.[0]`으로 배열 인덱싱 → 항상 `undefined` → `is_unassigned` 항상 true.

## 수정 내용

`config.order?.[0]?.shipper_id` → `config.order?.shipper_id` (1줄)

## 검증

- 회귀 테스트 2건 추가: `tests/unit/operations/tracking-actions.test.ts` (객체/널 케이스)
- 전체 회귀: 115 files / 773 tests ALL PASS

## 커밋

- 코드: (커밋 해시 기입)
- 문서: (커밋 해시 기입)

## PR

- (PR URL 기입)
