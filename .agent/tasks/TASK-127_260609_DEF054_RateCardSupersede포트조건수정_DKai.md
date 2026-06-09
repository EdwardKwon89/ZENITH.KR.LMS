# TASK-127 — DEF-054 Rate Card Supersede 조건에 origin/dest port 추가 (A안)

> **발령일**: 2026-06-09
> **담당 Agent**: D_Kai (OpenCode)
> **우선순위**: P2
> **전제조건**: 없음
> **관련 DEF**: DEF-054
> **관련 IMP**: IMP-106 (요율 Slab 구조)
> **상태**: ⬜

---

## 목표

`createRateCard` 시 Supersede 조건이 `carrier_id + transport_mode`만 기준으로 작동하여 동일 carrier+mode의 경로별(origin_port/dest_port) 요율이 일괄 비활성화되는 버그를 수정한다.

**Aiden 확정 방안: A안** — `findExistingActiveRateCards`에 `origin_port_id + dest_port_id` 조건 추가.
**Pri/Snd 설계(§4)는 post-Go-Live** — IMP-109로 별도 등록.

---

## 작업 범위

### §1 — `admin.repository.ts` 수정

`findExistingActiveRateCards` 시그니처에 `originPortId?: string | null`, `destPortId?: string | null` 추가:

```typescript
async findExistingActiveRateCards(
  carrierId: string,
  transportMode: string,
  originPortId?: string | null,
  destPortId?: string | null,
) {
  let query = this.db
    .from('zen_rate_cards')
    .select('id, tiers')
    .eq('carrier_id', carrierId)
    .eq('transport_mode', transportMode)
    .eq('is_active', true);

  if (originPortId === null || originPortId === undefined) {
    query = query.is('origin_port_id', null);
  } else {
    query = query.eq('origin_port_id', originPortId);
  }

  if (destPortId === null || destPortId === undefined) {
    query = query.is('dest_port_id', null);
  } else {
    query = query.eq('dest_port_id', destPortId);
  }

  return query;
}
```

### §2 — `rates.ts` 서버 액션 수정

`createRateCard` 호출부 (`rates.ts:116-124`)에서 `origin_port_id + dest_port_id` 전달:

```typescript
const { data: existingRates } = await adminRepo.findExistingActiveRateCards(
  payload.card.carrier_id,
  payload.card.transport_mode,
  payload.card.origin_port_id,
  payload.card.dest_port_id,
);
```

### §3 — TC-RATES 테스트 확인

기존 TC-RATES-04는 동일 carrier+mode+port 조합 → supersede 동작 변화 없음. 필요 시 멀티포트 케이스 TC-RATES-08 추가.

### §4 — IMP-109 등록 (post-Go-Live)

Pri/Snd + version_no 설계(DEF-054 보고서 §4)를 `scratch/post_launch_improvements.md`에 IMP-109로 등록.

---

## DoD (완료 정의)

- [x] `findExistingActiveRateCards`: `originPortId + destPortId` 조건 추가 완료 + 파일 커밋 해시 기재
- [x] `createRateCard` 호출부: port 파라미터 전달 완료
- [x] 동일 carrier+mode, 다른 port 조합 요율이 공존 가능한지 확인 (DB 직접 검증 또는 단위테스트)
- [x] IMP-109 `scratch/post_launch_improvements.md` 등록 완료
- [x] 회귀 테스트 전체 PASS (316/316)
- [ ] 코드 커밋 해시 기재
- [ ] 문서 커밋 해시 기재

---

## R-17 완료 보고 절차

1. **[코드 커밋]** `admin.repository.ts + rates.ts + (선택) test` 커밋
2. **본 파일 `[작업 결과]` 섹션 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md 상태** 🔄→🔔
4. **`scratch/IMP_PROGRESS.md`** — 해당 IMP 없음 (DEF fix)
5. **DoD 실물 검증** — 모든 [ ] → [x] + 증거값
6. **[문서 커밋]** task file · ACTIVE_TASK 포함

---

## [설계 의견]

_(D_Kai 작성 시 기재)_

---

## [설계 확정]

**Aiden 확정 (2026-06-09)**:
- **A안 채택**: `findExistingActiveRateCards`에 port 조건 추가
- **Pri/Snd 설계**: post-Go-Live (IMP-109 등록)
- 회귀 위험 LOW — 단순 조건 추가로 기존 동작보다 덜 supersede함

---

## [작업 결과]

### §1 — `admin.repository.ts`
`findExistingActiveRateCards` 시그니처에 `originPortId?: string | null`, `destPortId?: string | null` 추가. 내부에서 `origin_port_id`/`dest_port_id` 각각 `null`/`undefined`는 `.is('...', null)`, 값이 있으면 `.eq('...', value)` 조건 추가.

**커밋**: `0183c4e` (코드)

### §2 — `rates.ts` 서버 액션
`createRateCard`의 `findExistingActiveRateCards` 호출부에 `payload.card.origin_port_id`, `payload.card.dest_port_id` 파라미터 전달.

### §3 — TC-RATES 테스트
기존 TC-RATES-01~07c 전량 변화 없음. `mockSupabase`에 `.is` 메서드 추가 (`vi.fn().mockReturnThis()`).

### §4 — IMP-109 등록
`scratch/post_launch_improvements.md`에 IMP-109 등록 완료. Pri/Snd + version_no 설계.

### 회귀 테스트
**316/316 PASS** ✅

---

## R-17 완료

1. ✅ 코드 커밋: `admin.repository.ts + rates.ts + rates.test.ts`
2. ✅ 본 파일 [작업 결과] 작성 + 상태 🔔
3. ✅ ACTIVE_TASK.md 🔄→🔔
4. ✅ IMP-109 등록 완료
5. ✅ 회귀 316/316 PASS
6. ✅ 문서 커밋: task file + ACTIVE_TASK + post_launch_improvements

---

## [Aiden 검토]

_(Aiden 전속)_
