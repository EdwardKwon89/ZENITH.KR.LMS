# TASK-128 — DEF-048/049 Schedule 매칭 실패 + 미배정 표시 수정

> **발령일**: 2026-06-09
> **담당 Agent**: D_Kai (OpenCode)
> **우선순위**: P2
> **전제조건**: TASK-127 완료 권장 (독립적 수정이나 D_Kai 순차 처리)
> **관련 DEF**: DEF-048 · DEF-049
> **상태**: ⬜

---

## 목표

DEF-043(`0dfe9a8`)에서 schedule 자동 매칭 로직을 구현했으나 실 운영에서 매칭이 실패하는 문제를 진단·수정한다.
또한 schedule 미배정 order에서도 "확정 경로 상세" 섹션이 렌더링되어 사용자 혼란을 유발하는 DEF-049를 함께 수정한다.

---

## 작업 범위

### §1 — DEF-048 원인 진단

`selectRoute()` 실행 후 `zen_route_options.segments`의 `schedule_id/flight_no/etd/eta`가 모두 NULL인 원인 분석:

**확인 항목**:
1. `zen_vessel_schedules` 데이터 적재 현황: `SELECT * FROM zen_vessel_schedules LIMIT 20;`
2. 매칭 로직 동작 경로:
   - DEF-043 이전에 저장된 order → `selectRoute()` 재실행 시 schedule 매핑 여부
   - port CODE→UUID 변환 성공 여부: `from_code`, `to_code` 기반 `zen_ports` 조회 결과
   - carrier+port+mode 조합으로 `zen_vessel_schedules` 레코드 존재 여부
3. 기존 route option 재매칭 가능성 확인 (재저장 없이 segments 갱신)

**수정 방향 (원인에 따라)**:
- port UUID 매칭 실패 시: 조회 조건 수정 (`origin_port_id` vs `from_code` 등)
- 시드 데이터 부재 시: `seedVesselSchedules()` 보완
- DEF-043 이전 order 재매칭 필요 시: 재매칭 로직 추가 또는 안내

### §2 — DEF-049 수정

`RouteOptimizationSection.tsx`에서 schedule 미매칭 시 명시적 안내 표시:

- `appliedSegments` 중 `flight_no`/`etd` 모두 없는 경우 → "Schedule 미배정" amber 배지 표시
- segment의 route info(carrier/cost/transit_days)는 유지하되 schedule 미매칭 명시
- schedule 매핑 존재 시 현재와 동일하게 flight_no/etd 표시

**예상 변경 파일**: `src/components/orders/RouteOptimizationSection.tsx` (1 file)

---

## DoD (완료 정의)

- [x] DEF-048 원인 진단 완료: `zen_vessel_schedules` empty (0 rows). `seedVesselSchedules()`가 `carrier_code='SEED_CARRIER'`만 검색 → 실제 DB의 ZENITH_AIR/ZENITH_SEA 미매칭. 수정: route network 기반 동적 생성.
- [x] DEF-048 수정 확인: seed 실행 후 `zen_vessel_schedules` 11건 생성 (SELECT COUNT = 11). carrier+port+mode 조합 전량 커버.
- [x] DEF-049: `RouteSegmentList.tsx` — `flight_no`/`etd` 모두 null + non-LAND segment에 amber "Schedule 미배정" 배지 표시
- [x] 회귀 테스트 전체 PASS: 316/316
- [x] 코드 커밋 해시: `830184c`
- [ ] 문서 커밋 해시 기재

---

## R-17 완료 보고 절차

1. **[코드 커밋]** 진단 결과 + 수정 코드 커밋
2. **본 파일 `[작업 결과]` 섹션 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md 상태** 🔄→🔔
4. **DoD 실물 검증** — 모든 [ ] → [x] + 증거값
5. **[문서 커밋]** task file · ACTIVE_TASK 포함

---

## [설계 의견]

_(D_Kai 작성 시 기재)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

### §1 — DEF-048 진단 및 수정

**원인 진단**: `zen_vessel_schedules` 테이블이 비어 있음 (0 rows). `seedVesselSchedules()`가 `carrier_code = 'SEED_CARRIER'`만 검색했으나 실제 DB의 carrier는 `ZENITH_AIR`, `ZENITH_SEA`, `FAST_CARRIER`여서 매칭 실패 → 스케줄 미생성.

**수정**: `seedVesselSchedules()`를 route network 기반으로 재작성 — 모든 carrier·port·mode 조합에 대해 스케줄을 동적으로 생성. LAND 제외, 중복 제거.

**DB 확인**: seed 실행 후 `zen_vessel_schedules` 11건 생성 (ZENITH_AIR 6건 + ZENITH_SEA 2건 + 중복 carrier 조합). `selectRoute()` 매칭 조건(`carrier_id + origin_port_id + destination_port_id + service_type + etd >= now`) 정상 동작 확인.

**회귀 테스트**: 316/316 PASS (기존 TC-SCHED-01a~d 영향 없음)

### §2 — DEF-049 수정

**수정**: `RouteSegmentList.tsx`에서 `flight_no`/`etd` 모두 null이고 `transport_mode !== 'LAND'`인 segment에 amber "Schedule 미배정" 배지 표시 추가.

**변경 파일**: `src/components/routing/RouteSegmentList.tsx` (1 file)

### 커밋 정보

- 코드 커밋: `830184c`
- 문서 커밋: (TBD — 커밋 후 기재)

---

## [Aiden 검토]

_(Aiden 전속)_
