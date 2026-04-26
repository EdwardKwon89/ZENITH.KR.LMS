# SAR - ROU-01 경로 옵션 UPSERT 정책 명세 누락 (BUG-07-A)

**문서번호:** SAR-2026-04-24-002  
**날짜:** 2026-04-24  
**작성자:** Aiden (AI Agent)  
**심각도:** MINOR (데이터 무결성 위험 — 명세 누락으로 인한 구현 정책 미확정)

---

## 1. 현상 (What)

`Ds_11_DETAIL_ROUTING.md` (ROU-01 상세 명세)의 초안에 `zen_route_options` 테이블의 **데이터 저장 정책**이 명시되지 않았습니다.

- **누락 항목**: 동일 오더에 대해 `getRouteOptions`를 재호출할 때 기존 레코드를 어떻게 처리하는가 — INSERT(중복 생성) vs UPSERT(최신 교체)
- **결과**: 명세만으로는 구현자가 `INSERT`와 `UPSERT` 중 어느 정책을 적용해야 하는지 알 수 없는 상태

---

## 2. 원인 (Why)

- **직접 원인**: API 명세 작성 시 `zen_route_options`의 (`order_id`, `option_type`) 복합 UNIQUE 제약과 이에 따른 충돌 해소 정책(UPSERT)을 명세서에 기술하지 않음.
- **근본 원인**: R-11(API 설계 우선 원칙) 준수 과정에서 "엔드포인트 동작" 기술에 집중하고 "데이터 영속성 정책(Insert/Upsert/Replace)"을 설계 체크포인트로 관리하지 않았음.
- **위험 시나리오**: INSERT 정책 적용 시 동일 오더의 `COST`/`TIME`/`BALANCED` 옵션이 재생성될 때마다 누적되어 총 9건, 27건... 증가하여 최신 옵션 판별 불가.
- **탐지 경위**: Aiden의 ROU-01 명세 심사(2026-04-24) 중 발견 — `getRouteOptions` 재호출 시나리오 검토 과정에서 명세 공백 확인.

---

## 3. 조치 (How)

Riley가 명세 보완 및 구현에 UPSERT 정책을 적용 완료하였습니다.

- **명세 보완** (`Ds_11_DETAIL_ROUTING.md:14`):
  ```
  데이터 정책 (UPSERT): 동일 오더에 대해 재계산 시 기존 레코드를 교체(Overwrite)하여 
  최신 결과만 유지함. (order_id, option_type 기준 UNIQUE)
  ```
- **구현 코드** (`src/app/actions/routing.ts:31-42`):
  ```typescript
  await supabase.from("zen_route_options").upsert(
    { order_id, option_type, segments, total_cost, total_transit_days, score },
    { onConflict: 'order_id, option_type' }
  );
  ```
- `zen_order_routes`의 `selectRoute`도 동일하게 `onConflict: 'order_id'` UPSERT 적용

---

## 4. 검증 (Verification)

- `rou-01.test.ts` TC-R.4d: `zen_route_options.upsert` 호출 검증
- `rou-01.test.ts` TC-R.5a: `zen_order_routes.upsert` 및 `onConflict` 정책 검증
- 전체 회귀 테스트 93/93 PASS 확인 (2026-04-24, `npm run test:regression`)

---

## 5. 예방 (Prevention)

- **명세 체크포인트 추가**: `LIVE_PHASE_1_DESIGN.md` — "DB 쓰기 API 명세 시 '데이터 저장 정책(Insert/Upsert/Delete)' 및 충돌 해소 전략 명시" 항목 필수화
- **R-11 체크리스트 강화**: API 명세서 심사 항목에 "동일 리소스 재생성 시 중복 처리 정책" 포함
- **DB 설계 연계**: 테이블 설계 시 UNIQUE 제약과 연결된 쓰기 정책을 ERD 주석 또는 명세서에 명시적으로 기록하여 구현자 오해 방지
