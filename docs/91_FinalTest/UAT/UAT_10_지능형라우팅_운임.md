# UAT_10 — 지능형 라우팅 & Composite Pricing Engine

> **문서번호**: UAT-10
> **작성일**: 2026-05-24
> **작성자**: D_Kai (OpenCode)
> **버전**: v2.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **전제 IMP**: IMP-080 (DB 스키마 ✅) · IMP-081 (DatabaseRouteAdapter ❌) · IMP-082 (Composite Pricing ❌) · IMP-083 (Admin 요율 카드 UI ❌)

---

> ⚠️ **UAT-10-01·02·05·06**는 IMP-081(DatabaseRouteAdapter) 구현 후 실제 UI 경로로 보완 필요.
> **UAT-10-03**은 IMP-082(Composite Pricing Engine) 완료 후 보완 필요.
> **UAT-10-04**는 IMP-083(Admin 요율 카드 UI) 완료 후 보완 필요.
> 현재 절차서는 IMP-080 DB 스키마 기반으로 최대한 상세화하였으며, DB 조회 단계는 Supabase Studio 직접 확인 절차 포함.

---

## [UAT-10-01] 경로 옵션 3종 조회 (COST·TIME·BALANCED)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (오더 상세 → 경로 탭) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | 오더 1건 존재 (origin_port·dest_port 설정, 예: ICN→SIN), ADMIN 또는 SHIPPER 로그인, zen_route_network·zen_carriers 시드 데이터 존재 |
| 관련 IMP | IMP-080·081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | ADMIN 계정 로그인 후 오더 목록 진입 | `admin@zenith.kr` / `password1234` | 오더 목록 정상 표시 | ☐ |
| 2 | /ko/orders/[id] | ICN→SIN 구간 오더 선택 → 상세 페이지 진입 | — | 오더 상세 정보 표시 | ☐ |
| 3 | /ko/orders/[id] | '경로 탭' 또는 'Route Options' 섹션 클릭 | — | COST·TIME·BALANCED 3종 카드 표시 | ☐ |
| 4 | 각 카드 | COST 카드 내용 확인 | — | 총비용·총소요일·구간(segments)·스코어 표시 | ☐ |
| 5 | 각 카드 | TIME 카드 내용 확인 | — | 총비용·총소요일·구간(segments)·스코어 표시 | ☐ |
| 6 | 각 카드 | BALANCED 카드 내용 확인 | — | 기본 추천 강조 표시 (하이라이트 또는 뱃지) | ☐ |
| 7 | Supabase Studio | `SELECT * FROM zen_route_options WHERE order_id = '[orderId]'` | — | option_type = COST/TIME/BALANCED 3행 존재 확인 | ☐ |
| 8 | /ko/logout → /ko/login | SHIPPER 계정으로 로그인 후 동일 오더 진입 | `shipper@zenith.kr` / `password1234` | SHIPPER도 경로 옵션 3종 조회 가능 (데이터 동일) | ☐ |
| 9 | — | SHIPPER 계정으로 타 조직 오더 URL 직접 입력 시도 | `/ko/orders/[otherOrgOrderId]` | 접근 차단 (403 또는 메인 리다이렉트) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 경로 옵션 3종 (COST·TIME·BALANCED) 카드 정상 표시
- [ ] 각 카드: 총비용·총소요일·구간(segments) 정보·스코어 표시
- [ ] BALANCED 카드가 기본 추천으로 강조 표시
- [ ] DB `zen_route_options`에 3종 모두 저장 확인
- [ ] SHIPPER 역할에서도 조회 가능 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-02] 최적 경로 선택 및 오더 적용

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] |
| 예상 소요 시간 | 10분 |
| 사전 조건 | 오더 경로 옵션 3종 조회 완료 상태 |
| 관련 IMP | IMP-081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 계정으로 경로 옵션이 표시된 오더 진입 | — | COST·TIME·BALANCED 3종 카드 표시 | ☐ |
| 2 | 경로 카드 | BALANCED 카드의 '선택' 또는 '경로 확정' 버튼 클릭 | — | 버튼 → '선택됨' 또는 활성 상태 변경 | ☐ |
| 3 | — | 페이지 새로고침 (`F5`) | — | BALANCED가 계속 선택된 상태 유지 | ☐ |
| 4 | — | COST 카드 재선택 후 새로고침 | — | 선택 경로가 COST로 변경·유지 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_order_routes WHERE order_id = '[orderId]'` | — | selected_option_id가 선택한 옵션 ID와 일치 | ☐ |
| 6 | Supabase Studio | `SELECT o.status FROM zen_orders o WHERE o.id = '[orderId]'` | — | 오더 상태가 이전 상태와 동일 (경로 선택은 상태 전이와 독립) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 경로 옵션 중 1종 선택 가능
- [ ] DB `zen_order_routes`에 `selected_option_id` 저장 확인
- [ ] 페이지 새로고침 후 선택 경로 유지
- [ ] 경로 변경 (다른 옵션 재선택) 가능 확인 (UPSERT)
- [ ] 경로 확정 후 오더 상태 변화 없음 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-03] Composite Pricing 항목별 금액 확인

> ⬜ **IMP-082(Composite Pricing Engine) 구현 완료 후 작성 예정**

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] (운임 상세 섹션) |
| 예상 소요 시간 | TBD |
| 사전 조건 | 오더 경로 확정 완료, 요율 카드(zen_rate_cards) 데이터 등록 완료 |
| 관련 IMP | IMP-082 |

### DB 사전 확인 (IMP-080 기준)

| 순서 | 수행 액션 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:----:|
| 1 | `SELECT * FROM zen_rate_cards WHERE is_active = true` | 시드 요율 카드 2건 이상 조회 (AIR·SEA) | ☐ |
| 2 | `SELECT * FROM zen_surcharges WHERE is_active = true` | 시드 할증 2건 이상 조회 (FSC·SSC) | ☐ |
| 3 | `SELECT DISTINCT transport_mode FROM zen_rate_cards` | AIR·SEA 최소 2종 모드 확인 | ☐ |

### 합격 기준 (IMP-082 완료 후 적용)
- [ ] 기본 운임 (base freight) 항목별 금액 표시
- [ ] 할증 항목 (surcharges: FSC·SSC 등) 개별 금액 표시
- [ ] 총 운임 = 기본 운임 + 할증 합산 금액 일치 확인
- [ ] 통화 단위 (USD/KRW) 정상 표시
- [ ] 중량 (Chargeable Weight) 기반 금액 산출 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-04] 요율 카드 등록·수정·삭제 (ADMIN)

> ⬜ **IMP-083(Admin 요율 카드 관리 UI) 구현 완료 후 작성 예정**

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/rates (기존 요율 관리 화면 확장) |
| 예상 소요 시간 | TBD |
| 사전 조건 | ADMIN 계정 로그인 |
| 관련 IMP | IMP-083 |

### DB 사전 확인 (IMP-080 기준)

| 순서 | 수행 액션 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:----:|
| 1 | `SELECT * FROM zen_rate_cards ORDER BY created_at` | 시드 요율 카드 데이터 확인 (tiers JSONB 구조 검증) | ☐ |
| 2 | `SELECT * FROM zen_carriers WHERE is_active = true` | ZENITH_AIR·ZENITH_SEA 2건 조회 확인 | ☐ |

### 합격 기준 (IMP-083 완료 후 적용)
- [ ] 요율 카드 목록 조회 (운송사·운송 모드·유효기간별)
- [ ] 신규 요율 카드 등록 (carrier·mode·weight_slabs·유효기간)
- [ ] 기존 요율 카드 수정 및 저장
- [ ] 요율 카드 삭제 (확인 모달 포함)
- [ ] 유효기간 중첩 방지 유효성 검사 (validateRateOverlap)
- [ ] SHIPPER 역할 접근 차단 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-05] 경로 재산출 (오더 변경 후)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] |
| 예상 소요 시간 | 10분 |
| 사전 조건 | 경로 옵션 확정 완료 오더 1건 존재 |
| 관련 IMP | IMP-080·081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 계정으로 경로 확정 완료된 오더 진입 | — | 선택된 경로 정보 표시 | ☐ |
| 2 | — | '경로 재산출' 또는 'Recalculate Routes' 버튼 클릭 | — | 로딩 인디케이터 표시 후 새 경로 옵션 3종 재조회 | ☐ |
| 3 | — | 재산출 완료 후 BALANCED 카드 선택 | — | 새 경로 확정 | ☐ |
| 4 | Supabase Studio | 기존·신규 `zen_route_options` 비교 | `SELECT * FROM zen_route_options WHERE order_id = '[orderId]'` | 기존 옵션 덮어쓰기(UPSERT) — 3행 유지, 내용 변경 | ☐ |
| 5 | — | 오더 수정 → 출발지 변경 후 재산출 시도 | — | 새 출발지 기준 경로 반영 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] '경로 재산출' 버튼 클릭 → 새 경로 옵션 3종 재조회
- [ ] 기존 `zen_route_options` 덮어쓰기 (UPSERT) 확인
- [ ] 출발지·도착지 변경 후 재산출 시 새로운 경로 반영
- [ ] 재산출 중 로딩 인디케이터 표시

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-06] 라우팅 결과 경로 시각화 확인

> ⬜ **IMP-081(DatabaseRouteAdapter) 구현 완료 후 UI 상세 보완 필요**

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (경로 탭 → 시각화 섹션) |
| 예상 소요 시간 | TBD |
| 사전 조건 | 오더 경로 확정 완료 |
| 관련 IMP | IMP-081 |

### DB 사전 확인 (IMP-080 기준)

| 순서 | 수행 액션 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:----:|
| 1 | `SELECT rn.from_port_id, rn.to_port_id, rn.transport_mode, rn.transit_days, c.name as carrier_name FROM zen_route_network rn JOIN zen_carriers c ON c.id = rn.carrier_id WHERE rn.is_active = true` | ICN→SIN 3개 루트(SEA 7일·AIR 1일·LAND 5일) 조회 — 시각화 데이터 기반 | ☐ |

### 합격 기준
- [ ] 선택된 경로의 마일스톤 목록 표시 (출발→경유→도착)
- [ ] 각 구간 운송 수단 아이콘 (SEA/AIR/LAND) 표시
- [ ] 완료된 구간과 미완료 구간 시각적 구분
- [ ] 포트 좌표 기반 지도 폴리라인 또는 타임라인 표시
- [ ] SHIPPER도 본인 오더 시각화 조회 가능 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | v1.0 초안 작성 — UAT-10-01~06 골격 6개, 지능형 라우팅 & Composite Pricing 검증 범위 정의 |
| 2026-05-24 | D_Kai (OpenCode) | v2.0 상세화 — UAT-10-01·02·05 절차표 완성, UAT-10-03·04·06 DB 사전 확인 추가, IMP-081~083 의존성 표기 |
