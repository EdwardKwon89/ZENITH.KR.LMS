# TASK-092 — 303 복합 운임 Stage 1+2 구현 (Route Decomposer + TISA)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-092 |
| IMP-ID | IMP-086 |
| 생성일 | 2026-05-25 |
| 담당 Agent | Riley |
| 우선순위 | P2 |
| 전제조건 | TASK-088 ✅ (Hub 경로 탐색 완료) |
| 상태 | 🚫 블로커 (TASK-088 완료 대기) |
| 파급 효과 | CompositePricingEngine, getRouteOptions(), 오더 비용 정산 |

---

## 배경

Phase J(TASK-076, IMP-082)에서 303 Composite Pricing Engine Stage 3+4(Slab Rate Calculator + Surcharge Overlay)만 구현되었다. Hub 경로를 지원하려면:

- **Stage 1 (Route Decomposer)**: 선택된 경로를 세그먼트별로 분해하고, 각 레그의 담당 캐리어를 식별한다
- **Stage 2 (TISA — Tariff and Interline Settlement Agreement)**: 각 레그에 해당하는 캐리어 + 운송 모드 + 유효 기간에 맞는 rate_card를 매핑한다

**현재 구조**: `CompositePricingEngine`이 단일 route option 전체에 단일 rate_card를 적용.
**목표 구조**: 레그별로 개별 캐리어의 rate_card를 조회·적용하여 합산.

**참고 파일**:
- `docs/03_Design/303_COMPOSITE_PRICING_ENGINE.md` — 4-stage 파이프라인 원본 설계
- `src/lib/logistics/pricing/` — 기존 Stage 3+4 구현 위치
- `src/app/actions/operations/routing.ts` L115-135 — 이미 세그먼트 비용 집계 코드 존재

---

## 작업 지시

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-092 → 📝 반영** (TASK-088 ✅ 후 착수)

2. **설계 의견 제출 필수** (알고리즘 결정 필요):

   검토 필요 사항:
   - Stage 1 구현 위치: `CompositePricingEngine` 내부 vs 별도 `RouteDecomposer` 클래스
   - Stage 2 캐리어 매핑: 세그먼트 carrier_id → `zen_rate_cards` 조회 방식
   - TISA 우선순위 적용 기준 (구간별 계약 요율 vs 공시 요율)
   - 특정 레그에 rate_card 없을 경우 fallback 처리

3. **설계 확정 후 구현**:

   **a. `RouteDecomposer` (Stage 1)**
   ```typescript
   // 입력: RouteOption (segments[])
   // 출력: { segment, carrierId, transportMode }[] (레그별 캐리어 식별)
   ```

   **b. `TISARateMatcher` (Stage 2)**
   ```typescript
   // 입력: { carrierId, transportMode, cargo_type, weight, volume }
   // 출력: 해당 rate_card (zen_rate_cards 조회)
   // 기존 Stage 3+4와 연결
   ```

   **c. `CompositePricingEngine` 통합**
   - Stage 1→2→3→4 파이프라인 완성
   - 레그별 개별 비용 + 할증 합산
   - 기존 `getRouteOptions()` action 호환성 유지

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **신규 테스트 추가**: 레그별 요율 매핑 + 합산 단위 테스트

6. **코드 커밋**: `[Riley] feat: IMP-086 303 Stage1+2 Route Decomposer + TISA 캐리어별 요율 매핑`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

8. **ACTIVE_TASK.md TASK-092 → 🔔 반영**

9. **`scratch/IMP_PROGRESS.md` IMP-086 행 🔔 갱신**

10. **문서 커밋**: `[Riley] docs: TASK-092 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] 설계 의견 제출 (📝) + Aiden 설계 확정 (🔍→🔄)
- [ ] `RouteDecomposer` (Stage 1) 구현 — 레그별 캐리어 식별
- [ ] `TISARateMatcher` (Stage 2) 구현 — 캐리어별 rate_card 조회
- [ ] Stage 1→2→3→4 파이프라인 통합 동작 확인
- [ ] Hub 경로(2-leg) 세그먼트별 개별 비용 합산 확인
- [ ] rate_card 미존재 시 fallback 처리 확인
- [ ] 신규 단위 테스트 추가
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-086 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Riley 작성)

> ⬜ TASK-088 ✅ 후 제출

---

## 설계 확정 (Aiden 작성)

> ⬜ 설계 의견 수신 후 작성

---

## 작업 결과

> ⬜ 구현 완료 후 작성

---

## Aiden 검토

> ⬜ 🔔 보고 후 검토

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-25 | Aiden (Claude) | Task 생성 — Phase K 303 Stage 1+2 Route Decomposer + TISA (IMP-086) |
