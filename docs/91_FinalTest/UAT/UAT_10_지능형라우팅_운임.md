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

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] (오더 상세 → 경로 탭 → 각 옵션 카드) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | 오더 1건 존재 (ICN→SIN, 중량 200kg), 요율 카드 + 할증 시드 데이터 등록 완료, ADMIN 로그인 |
| 관련 IMP | IMP-080·082 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rate-cards | ADMIN 로그인 후 Rate Cards 탭 진입 | `admin@zenith.kr` / `password1234` | 요율 카드 목록 표시 (ZENITH_AIR AIR, ZENITH_SEA SEA 시드 2건) | ☐ |
| 2 | /ko/admin/rate-cards | Surcharges 탭 클릭 | — | 할증 목록 표시 (ZENITH_AIR FSC 15%, ZENITH_SEA SSC $50) | ☐ |
| 3 | /ko/orders | ICN→SIN 구간, 중량 200kg 오더 선택 | — | 오더 상세 페이지 진입 | ☐ |
| 4 | /ko/orders/[id] | 경로 탭 클릭 → COST/TIME/BALANCED 3종 카드 확인 | — | 각 카드에 `총비용(total_cost)` 필드 표시 | ☐ |
| 5 | COST 카드 | 기본 운임(base freight) 금액 확인 | — | 예: ZENITH_AIR AIR 200kg → tiers[1] $4.80/kg → $960.00 | ☐ |
| 6 | COST 카드 | 할증(FSC) 금액 확인 | — | FSC 15% → $960 × 15% = $144.00 표시 | ☐ |
| 7 | COST 카드 | 총 운임(total) = baseFreight + surcharges 합산 확인 | — | $960.00 + $144.00 = $1,104.00 | ☐ |
| 8 | Supabase Studio | `SELECT * FROM zen_route_options WHERE order_id = '[orderId]'` → pricing_breakdown 컬럼 확인 | — | 각 옵션의 pricing_breakdown에 baseFreight·surcharges[]·total 포함 | ☐ |
| 9 | Supabase Studio | `SELECT * FROM zen_rate_cards rc JOIN zen_carriers c ON c.id = rc.carrier_id WHERE c.code = 'ZENITH_AIR'` | — | tiers JSONB: `[{"weight_min":0,"unit_price":5.50},...]` — 3개 티어 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 기본 운임 (base freight) 항목별 금액 표시
- [ ] 할증 항목 (surcharges: FSC·SSC 등) 개별 금액 표시
- [ ] 총 운임 = 기본 운임 + 할증 합산 금액 일치 확인
- [ ] 통화 단위 (USD) 정상 표시
- [ ] 중량 (Chargeable Weight) 기반 금액 산출 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-04] 요율 카드 등록·수정·삭제 (ADMIN)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/rate-cards (Phase-J 전용 Rate Cards Management) |
| 예상 소요 시간 | 20분 |
| 사전 조건 | ADMIN 계정 로그인, zen_carriers 시드 데이터 존재 |
| 관련 IMP | IMP-080·083 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rate-cards | ADMIN 로그인 후 Rate Cards 페이지 진입 | `admin@zenith.kr` / `password1234` | Rate Cards 탭 + Surcharges 탭 표시, 목록에 시드 요율 2건 표시 | ☐ |
| 2 | Rate Cards 탭 | 목록 컬럼 확인 | — | Carrier·Mode·Currency·Tiers·Valid From·Valid Until·Status·Actions(Edit/Delete) 표시 | ☐ |
| 3 | Rate Cards 탭 | 'Add Rate Card' 버튼 클릭 | — | 신규 등록 폼 오픈 (Carrier·Mode·Currency·Tiers·Valid From·Valid Until) | ☐ |
| 4 | 신규 폼 | Carrier 선택: ZENITH_AIR, Mode: AIR, Currency: USD | ZENITH_AIR·AIR·USD | 필드 정상 입력 가능 | ☐ |
| 5 | 신규 폼 | Tiers 입력: weight_min=0, unit_price=6.00 → +Add Row → weight_min=100, unit_price=5.00 | 2개 티어 행 | 동적 행 추가 가능 | ☐ |
| 6 | 신규 폼 | Valid From: 오늘 날짜, Valid Until: 1년 후 날짜 | 오늘 / 1년 후 | 날짜 선택기 정상 동작 | ☐ |
| 7 | 신규 폼 | 저장(Submit) 클릭 | — | "Rate card created successfully" 메시지, 목록에 신규 카드 표시 | ☐ |
| 8 | Rate Cards 탭 | 신규 카드의 Edit 버튼 클릭 | — | 폼에 기존 데이터 채워짐 | ☐ |
| 9 | 수정 폼 | unit_price를 6.50으로 변경 후 저장 | unit_price: 6.50 | 수정 완료 메시지, 목록에 반영 | ☐ |
| 10 | Rate Cards 탭 | 신규 카드의 Delete 버튼 클릭 | — | "Deactivate this rate card?" 확인 모달 표시 | ☐ |
| 11 | 확인 모달 | Deactivate(확인) 클릭 | — | 카드 is_active = false, 목록에서 Status가 'Inactive'로 변경 | ☐ |
| 12 | Surcharges 탭 | 탭 클릭 → 목록 확인 | — | 시드 할증 2건(FSC 15%·SSC $50) 표시 | ☐ |
| 13 | — | SHIPPER 계정으로 /ko/admin/rate-cards 직접 접속 | `shipper@zenith.kr` | 접근 차단 (403 또는 메인 리다이렉트) | ☐ |
| 14 | — | 유효기간 중복 테스트: 동일 Carrier·Mode로 기간 겹치는 카드 등록 시도 | — | "Rate card overlaps with existing" 오류 메시지 (validateRateOverlap) | ☐ |
| 15 | Supabase Studio | `SELECT * FROM zen_rate_cards ORDER BY created_at DESC LIMIT 5` | — | 신규 등록·수정·비활성화 이력 정상 반영 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 요율 카드 목록 조회 (운송사·운송 모드·유효기간별)
- [ ] 신규 요율 카드 등록 (carrier·mode·weight_slabs·유효기간)
- [ ] 기존 요율 카드 수정 및 저장
- [ ] 요율 카드 삭제 (soft delete — is_active = false + 확인 모달)
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

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (경로 탭 → 시각화 섹션) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | 오더 경로 선택 완료 (UAT-10-02 9단계 수행 후), ADMIN·SHIPPER 각각 로그인 |
| 관련 IMP | IMP-080·081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 로그인, 경로 선택 완료된 오더 진입 | `admin@zenith.kr` | 오더 상세 페이지 표시 | ☐ |
| 2 | /ko/orders/[id] | 경로 탭 클릭 → 시각화 섹션 확인 | — | 선택된 경로 마일스톤 목록 표시 (출발지→도착지) | ☐ |
| 3 | 시각화 섹션 | 마일스톤 순서 확인 | — | ICN → SIN 순서 정렬 (직항) | ☐ |
| 4 | 시각화 섹션 | 각 구간 운송 수단 아이콘 확인 | — | SEA/AIR/LAND 아이콘 표시 | ☐ |
| 5 | 시각화 섹션 | 각 구간 소요 시간(transit_days) 표시 확인 | — | 예: SEA 7일, AIR 1일 | ☐ |
| 6 | 시각화 섹션 | 폴리라인/목업 지도 시각화 요소 표시 확인 | — | 포트 간 연결선 및 포트 좌표 아이콘 표시 | ☐ |
| 7 | /ko/orders | SHIPPER 계정으로 본인 오더 진입 | `shipper@zenith.kr` | SHIPPER도 본인 오더 시각화 조회 가능 | ☐ |
| 8 | — | 모바일 뷰포트(375px)로 전환 | — | 시각화 영역 수직 스택 정렬, 가로 스크롤 없음 | ☐ |
| 9 | Supabase | `SELECT rn.from_port_id, rn.to_port_id, rn.transport_mode, rn.transit_days, c.name FROM zen_route_network rn JOIN zen_carriers c ON c.id = rn.carrier_id WHERE rn.is_active = true` | — | ICN→SIN 3개 루트(SEA 7·AIR 1·LAND 5) 시각화 데이터 기반 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 선택된 경로의 마일스톤 목록 표시 (출발→경유→도착)
- [ ] 각 구간 운송 수단 아이콘 (SEA/AIR/LAND) 표시
- [ ] 완료된 구간과 미완료 구간 시각적 구분
- [ ] 포트 좌표 기반 지도 폴리라인 또는 타임라인 표시
- [ ] 모바일(375px) 레이아웃 정상
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
| 2026-05-24 | D_Kai (OpenCode) | v2.0 — UAT-10-01·02·05 절차표 완성, UAT-10-03·04·06 DB 사전 확인 추가 |
| 2026-05-24 | D_Kai (OpenCode) | v2.1 — UAT-10-03·04·06 절차표 전면 완성 (IMP-081·082·083 구현 반영), 3건 ⬜→✅ |
