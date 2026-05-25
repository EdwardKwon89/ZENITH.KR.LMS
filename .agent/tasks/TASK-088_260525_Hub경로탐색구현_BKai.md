# TASK-088 — Hub 경로 탐색 구현 (DatabaseRouteAdapter BFS 확장)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-088 |
| IMP-ID | IMP-084 |
| 생성일 | 2026-05-25 |
| 담당 Agent | B_Kai |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔄 |
| 파급 효과 | DatabaseRouteAdapter, zen_route_network 시드 데이터, getRouteVisualization |

---

## 배경

Phase J(TASK-075)에서 구현된 `DatabaseRouteAdapter`는 직항 루트만 조회한다 (`from_port_id = origin AND to_port_id = dest`). Phase K 요구사항: 직항이 없거나 화주가 대안 경로를 요청할 경우 경유지(Hub)를 포함한 경로를 자동 탐색하여 제시해야 한다.

**업무 프로세스 확정 (Edward, 2026-05-25)**:
- 직항 우선 제시 → 직항 없거나 대안 요청 시 Hub 경로 제시
- 경유지는 단순 환적(Transit)으로 처리 — 창고 입고/출고 오퍼레이션 없음 (A안)
- 최대 2홉(경유 1회)만 지원

**현재 DB 시드**: ICN→SIN (SEA/AIR/LAND) 3개 루트만 존재. PVG→ICN, ICN→LAX 등 추가 필요.

---

## 작업 지시

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-088 → 📝 반영**

2. **설계 의견 제출 필수** (복잡도 높음):
   - BFS 알고리즘 vs 2-step JOIN 방식 선택
   - 최대 홉 수 설정 (2홉 = 경유 1회 고정 vs 파라미터화)
   - `zen_route_network` 시드 데이터 범위 (PVG→ICN, ICN→LAX 등)
   - `getRouteVisualization()` 포트 좌표 처리 (Mock → zen_ports.lat/lng 연동)

3. **설계 확정 후 구현**:

   **a. `DatabaseRouteAdapter.getPotentialRoutes()` 확장**
   ```typescript
   // 1단계: 직항 조회 (기존 로직 유지)
   // 2단계: origin 출발 전체 루트 조회 → 중간 허브 추출
   // 3단계: 허브 → dest 루트 조회 → 2-leg RouteOption 조합
   // 반환: 직항 + Hub 경로 배열 (RouteOption[])
   ```

   **b. 신규 DB 마이그레이션** — 추가 시드 데이터
   ```
   PVG → ICN (LAND, SEA, AIR 각 캐리어)
   ICN → LAX (SEA, AIR)
   SHA → ICN, ICN → SFO 등 (설계 의견에서 범위 확정)
   ```

   **c. `getRouteVisualization()` 포트 좌표 개선**
   - `src/app/actions/operations/routing.ts` L180~242
   - `MOCK_PORT_COORDS` 하드코딩 → `zen_ports.latitude/longitude` 조회로 전환
   - zen_ports에 lat/lng 컬럼이 없으면 마이그레이션 추가

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **신규 테스트 추가** (`tests/integration/rou-01.test.ts` 또는 신규 파일):
   - Hub 경로 탐색 테스트 (PVG→ICN→LAX)
   - 직항만 있는 경우 Hub 결과 없음 확인
   - Hub 없는 구간 → 빈 배열 반환 확인

6. **코드 커밋**: `[B_Kai] feat: IMP-084 DatabaseRouteAdapter BFS Hub 경로 탐색 + 시드 데이터`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

8. **ACTIVE_TASK.md TASK-088 → 🔔 반영**

9. **`scratch/IMP_PROGRESS.md` IMP-084 행 🔔 갱신**

10. **문서 커밋**: `[B_Kai] docs: TASK-088 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] 설계 의견 제출 (📝) + Aiden 설계 확정 (🔍→🔄)
- [ ] `getPotentialRoutes()` Hub BFS 탐색 구현
- [ ] 직항 루트와 Hub 루트 모두 반환 확인
- [ ] 신규 시드 마이그레이션 작성 및 적용 확인
- [ ] `getRouteVisualization()` 포트 좌표 실DB 연동 (또는 Advisory로 근거 명시)
- [ ] 신규 회귀 테스트 추가
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-084 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (B_Kai 작성)

### 1. Hub 탐색 알고리즘: 2-step SQL JOIN (BFS 배제)

| 항목 | BFS (그래프 순회) | 2-step JOIN ✅ (권장) |
|:----|:---------------|:-----------------|
| 복잡도 | 큐/방문셋 별도 구현, n-홉 일반화 | SQL 2회 또는 서브쿼리로 단순 구현 |
| 유지보수 | 인메모리 그래프 상태 관리 필요 | SQL만으로 표현 가능 |
| 제약 대응 | 2홉 고정 시 오버엔지니어링 | 2홉(경유 1회)에 최적 |
| 기존 코드와 결합 | 신규 클래스/함수 필요 | 기존 `getPotentialRoutes()` 내부 확장만으로 가능 |

**권장 방식**: `getPotentialRoutes()` 내부에서 2단계 SQL 조회
```
1단계: 직항 조회 (기존 로직) — zen_route_network WHERE from=origin AND to=dest
2단계: Hub 경로 조회 — zen_route_network WHERE from=origin (leg1) → 추출된 to_port_id → WHERE to=dest (leg2)
```
최대 2회 DB 쿼리로 직항 + Hub 경로 반환. 별도 BFS 자료구조 불필요.

### 2. 최대 홉 수: 2홉 고정 (파라미터화 불필요)

화주 업무 프로세스(A안)에서 "최대 2홉(경유 1회)" 확정. 파라미터화는 향후 필요 시 `maxHops` 옵션 추가 가능하나 현재 오버엔지니어링. **2홉 하드코딩 후 Advisory 기록.**

### 3. 시드 데이터 범위

기존 ICN→SIN 3개 루트에 추가로 Hub 경로 검증 가능한 범위로 제한:

| from | to | mode | carrier | 비고 |
|:----|:---|:----:|:-------|:-----|
| PVG | ICN | AIR | ZENITH_AIR | 상해→인천 항공 |
| PVG | ICN | SEA | ZENITH_SEA | 상해→인천 해상 |
| ICN | LAX | AIR | ZENITH_AIR | 인천→LAX 항공 (PVG→ICN→LAX Hub 경로 검증용) |
| ICN | LAX | SEA | ZENITH_SEA | 인천→LAX 해상 |
| SHA | ICN | AIR | ZENITH_AIR | (선택) 추가 Hub 후보 |

위 데이터로 `PVG→LAX` Hub 경로(PVG→ICN→LAX) 검증 가능. 직항 없음 → Hub 탐색.

### 4. 포트 좌표 시각화: MOCK_PORT_COORDS 확장 (Option B)

zen_ports에 lat/lng 컬럼이 없으므로 **Option B 채택**:
- `MOCK_PORT_COORDS`에 신규 포트(PVG, LAX, SHA, SFO) 좌표 추가
- `getRouteVisualization()`에서 2-segment Hub 경로에 대한 마일스톤 정상 생성 확인
- **Advisory**: zen_ports.latitude/longitude 마이그레이션은 Phase L로 이관 (시각화 고도화 시)

| 포트 | 위도 | 경도 |
|:---|:---:|:---:|
| PVG | 31.1443 | 121.8083 |
| LAX | 33.9416 | -118.4085 |
| SHA | 31.1443 | 121.8083 |
| SFO | 37.6213 | -122.3790 |

### 5. 테스트 전략

- `rou-01.test.ts`에 Hub 경로 케이스 2개 추가:
  1. **PVG→LAX**: Hub 경로(PVG→ICN→LAX) 2개 반환 (AIR+SEA) — 직항 없음
  2. **ICN→SIN**: 직항만 존재 → Hub 경로 없음 (2단계에서 중복 제거)

### 6. 리스크

| 리스크 | 대응 |
|:------|:-----|
| 복수 Hub 경로 과다 반환 (n^n 조합) | 최대 2홉 + 동일 경로 중복 제거(total_transit_days 기준 정렬) |
| 시드 데이터 과도 확장 | 최소 검증 가능 범위로 제한 (PVG·ICN·LAX만 추가) |

---

## 설계 확정 (Aiden 작성)

**판정: ✅ 전항목 확정 — 🔄 착수 승인** (2026-05-25, Aiden)

### 확정 내용

| 항목 | B_Kai 제안 | Aiden 판정 |
|:----|:-----------|:----------|
| 알고리즘 | 2-step SQL JOIN | ✅ 확정 — 2홉 고정 조건에서 BFS는 오버엔지니어링, SQL 2회 조회로 충분 |
| 최대 홉 수 | 2홉 하드코딩 | ✅ 확정 — Advisory로 `maxHops` 향후 파라미터화 가능성 기록 |
| 시드 데이터 | PVG→ICN (AIR/SEA), ICN→LAX (AIR/SEA), SHA→ICN (AIR) 선택 | ✅ 확정 — 필수: 앞 4개. SHA→ICN은 선택(생략 가능) |
| 포트 좌표 | MOCK_PORT_COORDS 확장 (Option B) | ✅ 확정 — zen_ports lat/lng 마이그레이션은 Phase L Advisory 기록 |
| 테스트 전략 | rou-01.test.ts Hub 케이스 2개 추가 | ✅ 확정 |

### Advisory (비차단)

- SHA와 PVG의 MOCK 좌표가 동일값(`31.1443, 121.8083`)으로 설정됨 — SHA(홍차오)와 PVG(푸동)는 실제로 약간 다른 위치이나, Mock 단계에서는 허용. Phase L 실좌표 연동 시 수정.
- `getPotentialRoutes()` 내부 2단계 쿼리 결과에서 직항과 Hub 경로 간 중복 포트 조합 발생 가능 — 중복 제거 로직 포함 필수.

**🔄 착수 승인 — 즉시 구현 시작.**

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
| 2026-05-25 | Aiden (Claude) | Task 생성 — Phase K Hub 경로 탐색 구현 지시 (IMP-084) |
| 2026-05-25 | B_Kai (OpenCode) | 설계 의견 📝 제출 — 2-step JOIN·2홉 고정·시드 4개·MOCK 좌표 확장 제안 |
| 2026-05-25 | Aiden (Claude) | 설계 확정 ✅ — 전항목 승인. SHA/PVG 좌표 Advisory. 🔄 착수 승인 |
