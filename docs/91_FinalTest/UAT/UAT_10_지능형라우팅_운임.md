# UAT_10 — 지능형 라우팅 & Composite Pricing Engine

> **문서번호**: UAT-10
> **작성일**: 2026-05-24
> **작성자**: D_Kai (OpenCode)
> **버전**: v3.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **전제 IMP**: IMP-080 (DB 스키마 ✅) · IMP-081 (DatabaseRouteAdapter ✅) · IMP-082 (Composite Pricing ✅) · IMP-083 (Admin 요율 카드 UI ✅)

---

## [UAT-10-01] 경로 옵션 전체 후보 비교 조회 (비교 테이블·추천 배지)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (오더 상세 → Route Optimization 섹션) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | 오더 1건 존재 (origin_port·dest_port 설정, 예: ICN→SIN), ADMIN 또는 SHIPPER 로그인, zen_route_network·zen_carriers 시드 데이터 존재 |
| 관련 IMP | IMP-080·081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | ADMIN 계정 로그인 후 오더 목록 진입 | `admin@zenith.kr` / `password1234` | 오더 목록 정상 표시 | ☐ |
| 2 | /ko/orders/[id] | ICN→SIN 구간 오더 선택 → 상세 페이지 진입 | — | 오더 상세 정보 표시 | ☐ |
| 3 | /ko/orders/[id] | Route Optimization 섹션에서 '경로 계산하기' 버튼 클릭 후 완료 대기 | — | 전체 운송사 후보 **비교 테이블** 표시 — 직항/경유 그룹 분리, 각 행에 운송사·경로·비용·소요일·추천 배지 | ☐ |
| 4 | Supabase Studio | `SELECT recommended_for FROM zen_route_options WHERE order_id = '[orderId]'` | — | DB: `recommended_for` 컬럼에 `["COST"]`·`["TIME"]`·`["BALANCED"]` 값 정상 저장 확인 | ☐ |
| 5 | /ko/logout → /ko/login | SHIPPER 계정으로 로그인 후 동일 오더 진입 | `uat02_corp_shipper@zenith.kr` / `password1234` | SHIPPER도 경로 옵션 전체 후보 비교 조회 가능 (데이터 동일) | ☐ |
| 6 | — | SHIPPER 계정으로 타 조직 오더 URL 직접 입력 시도 | `/ko/orders/[otherOrgOrderId]` | 접근 차단 (403 또는 메인 리다이렉트) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 전체 운송사 후보 비교 테이블 표시 (직항/경유 그룹 분리)
- [ ] 추천 배지 3종(최저비용·최단시간·균형) 해당 행에 정상 표시
- [ ] zen_route_options.recommended_for 컬럼 값 정상 저장 확인
- [ ] 각 행에 운송사·경로·비용·소요일 표시
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
| 사전 조건 | 오더 경로 옵션 전체 후보 조회 완료 상태 (UAT-10-01 선행) |
| 관련 IMP | IMP-081 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 계정으로 경로 옵션이 표시된 오더 진입 | — | 전체 후보 **비교 테이블** 표시 (직항/경유 그룹, 추천 배지) | ☐ |
| 2 | 비교 테이블 | BALANCED 추천 행의 '선택' 버튼 클릭 | — | 해당 행 하이라이트, "경로가 확정되었습니다" 토스트 | ☐ |
| 3 | — | 페이지 새로고침 (`F5`) | — | 선택된 경로 유지, 마일스톤 타임라인 재표시 | ☐ |
| 4 | — | COST 추천 행 재선택 후 새로고침 | — | 선택 경로가 COST로 변경·유지 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_order_routes WHERE order_id = '[orderId]'` | — | selected_option_id가 선택한 옵션 ID와 일치 | ☐ |
| 6 | Supabase Studio | `SELECT o.status FROM zen_orders o WHERE o.id = '[orderId]'` | — | 오더 상태가 이전 상태와 동일 (경로 선택은 상태 전이와 독립) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 비교 테이블에서 경로 옵션 중 1종 선택 가능
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
| 화면 URL | /ko/orders/[id] (오더 상세 → Route Optimization 섹션 → 비교 테이블) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | 오더 1건 존재 (ICN→SIN, 중량 200kg), 요율 카드 + 할증 시드 데이터 등록 완료, ADMIN 로그인 |
| 관련 IMP | IMP-080·082 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 로그인 후 Rates 페이지 진입 (Rate Cards 탭) | `admin@zenith.kr` / `password1234` | 요율 카드 목록 표시 (ZENITH_AIR AIR, ZENITH_SEA SEA 시드 2건) | ☐ |
| 2 | /ko/admin/rates | Surcharges 탭 클릭 | — | 할증 목록 표시 (ZENITH_AIR FSC 15%, ZENITH_SEA SSC $50) | ☐ |
| 3 | /ko/orders | ICN→SIN 구간, 중량 200kg 오더 선택 | — | 오더 상세 페이지 진입 | ☐ |
| 4 | /ko/orders/[id] | '경로 계산하기' 클릭 후 비교 테이블 각 행의 총비용(total_cost) 확인 | — | 각 행에 `총비용(total_cost)` 필드 표시 | ☐ |
| 5 | 비교 테이블 | 최저비용(COST) 추천 행의 기본 운임(base freight) 금액 확인 | — | 예: ZENITH_AIR AIR 200kg → tiers[1] $4.80/kg → $960.00 | ☐ |
| 6 | 비교 테이블 | 최저비용 추천 행의 할증(FSC) 금액 확인 | — | FSC 15% → $960 × 15% = $144.00 표시 | ☐ |
| 7 | 비교 테이블 | 최저비용 추천 행 총 운임(total) = baseFreight + surcharges 합산 확인 | — | $960.00 + $144.00 = $1,104.00 | ☐ |
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
| 화면 URL | /ko/admin/rates (Surcharges 탭 통합) |
| 예상 소요 시간 | 20분 |
| 사전 조건 | ADMIN 계정 로그인, zen_carriers 시드 데이터 존재 |
| 관련 IMP | IMP-080·083 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 로그인 후 Rates 페이지 진입 (Surcharges 탭 통합) | `admin@zenith.kr` / `password1234` | Rate Cards 탭 + Surcharges 탭 표시, 목록에 시드 요율 2건 표시 | ☐ |
| 2 | Rate Cards 탭 | 목록 컬럼 확인 | — | Carrier·Mode·Currency·Tiers·Carrier Cost·Margin Rate·Platform Fee Rate·Valid From·Valid Until·Status·Actions(Edit/Delete) 표시 | ☐ |
| 3 | Rate Cards 탭 | 'Add Rate Card' 버튼 클릭 | — | 신규 등록 폼 오픈 (Carrier·Mode·Currency·Tiers·Carrier Cost·Margin Rate·Platform Fee Rate·Valid From·Valid Until) | ☐ |
| 4 | 신규 폼 | Carrier 선택: ZENITH_AIR, Mode: AIR, Currency: USD | ZENITH_AIR·AIR·USD | 필드 정상 입력 가능 | ☐ |
| 5 | 신규 폼 | Carrier Cost: 4.00, Margin Rate: 15, Platform Fee Rate: 5 입력 | 4.00·15·5 | 3개 필드 정상 입력 가능, 숫자만 허용 | ☐ |
| 6 | 신규 폼 | Tiers 입력: weight_min=0, unit_price=6.00 → +Add Row → weight_min=100, unit_price=5.00 | 2개 티어 행 | 동적 행 추가 가능 | ☐ |
| 7 | 신규 폼 | Valid From: 오늘 날짜, Valid Until: 1년 후 날짜 | 오늘 / 1년 후 | 날짜 선택기 정상 동작 | ☐ |
| 8 | 신규 폼 | 저장(Submit) 클릭 | — | "Rate card created successfully" 메시지, 목록에 신규 카드 표시 | ☐ |
| 9 | Rate Cards 탭 | 신규 카드의 Edit 버튼 클릭 | — | 폼에 기존 데이터 채워짐 (Carrier Cost·Margin Rate·Platform Fee Rate 포함) | ☐ |
| 10 | 수정 폼 | unit_price를 6.50으로 변경 후 저장 | unit_price: 6.50 | 수정 완료 메시지, 목록에 반영 | ☐ |
| 11 | Rate Cards 탭 | 신규 카드의 Delete 버튼 클릭 | — | "Deactivate this rate card?" 확인 모달 표시 | ☐ |
| 12 | 확인 모달 | Deactivate(확인) 클릭 | — | 카드 is_active = false, 목록에서 Status가 'Inactive'로 변경 | ☐ |
| 13 | Surcharges 탭 | 탭 클릭 → 목록 확인 | — | 시드 할증 2건(FSC 15%·SSC $50) 표시 | ☐ |
| 14 | — | SHIPPER 계정으로 /ko/admin/rates 직접 접속 | `shipper@zenith.kr` | 접근 차단 (403 또는 메인 리다이렉트) | ☐ |
| 15 | — | 유효기간 중복 테스트: 동일 Carrier·Mode로 기간 겹치는 카드 등록 시도 | — | "Rate card overlaps with existing" 오류 메시지 (validateRateOverlap) | ☐ |
| 16 | Supabase Studio | `SELECT * FROM zen_rate_cards ORDER BY created_at DESC LIMIT 5` | — | 신규 등록·수정·비활성화 이력 정상 반영 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 요율 카드 목록 조회 (운송사·운송 모드·유효기간별)
- [ ] 신규 요율 카드 등록 (carrier·mode·carrier_cost·margin_rate·platform_fee_rate·weight_slabs·유효기간)
- [ ] Carrier Cost·Margin Rate·Platform Fee Rate 3개 필드 입력 및 저장
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

## [UAT-10-07] TISA Dashboard 역할별 표시

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (Order Detail TISA 패널) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | ① 경로 최적화 완료 오더(rate snapshot 존재) 1건 ② 경로 미선택 오더 1건 |
| 관련 IMP | IMP-092·093 |

### 시나리오 A — Admin 뷰 (전체 필드 표시)

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 로그인 → 경로 최적화 완료 오더의 Order Detail 진입 | `admin@zenith.kr` | TISA Rate Snapshot 패널 표시 | ☐ |
| 2 | TISA 패널 | Rate Card ID / Version / Priority / Validity Period 확인 | — | 4개 항목 모두 표시 | ☐ |
| 3 | TISA 패널 | Cost Breakdown 영역 확인 | — | Carrier Cost · Platform Fee · Total 각각 표시 | ☐ |
| 4 | TISA 패널 | Auto Match 배지 확인 | — | `Auto Matched (자동 매칭)` 배지 + 설명 문구 표시 | ☐ |
| 5 | TISA 패널 | Override Rate 버튼 확인 | — | Override Rate 버튼 표시 (ADMIN 전용) | ☐ |

### 시나리오 B — Shipper 뷰 (기본 정보만)

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | CORPORATE 계정 로그인 → 본인 오더 Order Detail 진입 | `shipper@zenith.kr` | TISA Rate Snapshot 패널 표시 | ☐ |
| 2 | TISA 패널 | Base Amount + Currency 확인 | — | 기준 운임과 통화만 표시 | ☐ |
| 3 | TISA 패널 | Rate Card ID / Version / Cost Breakdown 확인 | — | **비표시** (Shipper는 기본 운임만 확인 가능) | ☐ |
| 4 | TISA 패널 | Auto Match 배지 확인 | — | **비표시** | ☐ |
| 5 | TISA 패널 | Override Rate 버튼 확인 | — | **비표시** (Shipper는 Override 불가) | ☐ |

### 시나리오 C — 경로 미선택 fallback

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | 경로 미선택(route_option_id null) 오더 Order Detail 진입 | — | TISA 패널에 fallback 메시지 표시 | ☐ |
| 2 | TISA 패널 | fallback 메시지 확인 | — | **"No rate snapshot applied yet."** + **"경로 최적화를 완료하면 요율이 자동으로 매칭됩니다."** 표시 | ☐ |

### 합격 기준
- [ ] 시나리오 A: Admin 전체 필드(Rate Card ID·Version·Priority·Cost Breakdown·Auto Match·Override) 표시
- [ ] 시나리오 B: Shipper Base Amount + Currency 만 표시 (Rate Card ID·Version·Cost Breakdown·Auto Match·Override 비표시)
- [ ] 시나리오 C: 경로 미선택 시 fallback 메시지 ("No rate snapshot applied yet." + 안내 문구) 표시
- [ ] 역할별 필드 분기 정상 동작 (Admin ≠ Shipper)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-08] Weight Slab 요율 max_charge 상한선 적용 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/rates (요율 카드 등록) → /ko/orders/[id] (오더 상세 → TISA 패널) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | ADMIN 로그인, Weight Slab 요율 카드에 `max_charge` 설정 가능한 Carrier 존재 (예: ZENITH_AIR) |
| 관련 IMP | IMP-108 §3 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 로그인 후 Rates 페이지 진입, 기존 AIR 요율 카드 Edit | `admin@zenith.kr` | Rate Card 편집 폼 오픈 | ☐ |
| 2 | 편집 폼 | Weight Slab Tier에 max_charge 입력 | 예: weight_min=0, unit_price=6.00, max_charge=150 | max_charge 필드 정상 입력, 저장 성공 | ☐ |
| 3 | /ko/orders | Weight 기반 운임이 max_charge를 초과하는 오더 선택 (예: 중량 200kg, unit_price $6.00/kg → $1,200 > $150) | — | 오더 상세 페이지 진입 | ☐ |
| 4 | TISA 패널 | Rate Snapshot의 Total Freight 확인 | — | Total Freight = $150 (max_charge capping) | ☐ |
| 5 | Supabase Studio | `SELECT total_freight, applied_pricing_basis FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `total_freight = 150`, `applied_pricing_basis = 'MAX_CHARGE'` | ☐ |
| 6 | Supabase Studio | `SELECT applied_weight_cost, applied_cbm_cost FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | weight_cost > cbm_cost (WM: WEIGHT 우세), applied_pricing_basis는 MAX_CHARGE로 override | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] max_charge 설정 후 요율 카드 저장 성공
- [ ] 실제 운임이 max_charge 초과 시 total_freight = max_charge로 capping
- [ ] DB `applied_pricing_basis = 'MAX_CHARGE'` 확인
- [ ] WM 비교 결과와 무관하게 MAX_CHARGE가 최종 pricing_basis로 저장

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-09] CBM Slab 요율 max_charge 상한선 적용 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/rates → /ko/orders/[id] |
| 예상 소요 시간 | 15분 |
| 사전 조건 | ADMIN 로그인, CBM Slab 요율 카드에 max_charge 설정 가능한 Carrier 존재 |
| 관련 IMP | IMP-108 §3 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 로그인 후 Rates 페이지 진입, CBM Slab 요율 카드에 max_charge 입력 | cbm_min=0, unit_price=80.00, max_charge=500 | max_charge 필드 저장 성공 | ☐ |
| 2 | /ko/orders | CBM 기반 운임이 max_charge를 초과하는 오더 선택 (예: CBM 10, unit_price $80/CBM → $800 > $500) | — | 오더 상세 페이지 진입 | ☐ |
| 3 | TISA 패널 | Rate Snapshot의 Total Freight 확인 | — | Total Freight = $500 (max_charge capping) | ☐ |
| 4 | Supabase Studio | `SELECT total_freight, applied_pricing_basis FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `total_freight = 500`, `applied_pricing_basis = 'MAX_CHARGE'` | ☐ |
| 5 | Supabase Studio | WM 비교 결과 확인 | `SELECT applied_cbm_cost, applied_weight_cost FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | cbm_cost > weight_cost (CBM 우세 상황) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] CBM Slab max_charge 설정 저장 성공
- [ ] CBM 기반 운임이 max_charge 초과 시 total_freight = max_charge로 capping
- [ ] DB `applied_pricing_basis = 'MAX_CHARGE'` 확인
- [ ] max_charge capping이 WM 모드(WEIGHT 또는 CBM)보다 우선 적용

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-10] max_charge 미설정 시 정상 운임 적용 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/rates → /ko/orders/[id] |
| 예상 소요 시간 | 10분 |
| 사전 조건 | ADMIN 로그인, max_charge가 NULL인 요율 카드 존재 |
| 관련 IMP | IMP-108 §3 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/rates | ADMIN 로그인 후 max_charge가 설정되지 않은(NULL) 요율 카드 1건 확인 또는 신규 등록 | tiers: `[{weight_min: 0, unit_price: 5.00, max_charge: null}]` | max_charge 필드 미입력 상태로 저장 성공 | ☐ |
| 2 | /ko/orders | 해당 요율이 적용되는 중량(예: 200kg) 오더 선택 | — | 오더 상세 페이지 진입 | ☐ |
| 3 | TISA 패널 | Total Freight = weight × unit_price = $1,000 확인 | — | 정상 운임 $1,000 (capping 없음) | ☐ |
| 4 | Supabase Studio | `SELECT total_freight, applied_pricing_basis FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `total_freight = 1000`, `applied_pricing_basis`는 WM 결과(`'WEIGHT'` 또는 `'CBM'`) | ☐ |
| 5 | Supabase Studio | min_charge도 미설정인 경우 하한선 미적용 확인 | `SELECT * FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | `applied_pricing_basis`가 `'MIN_CHARGE'` 또는 `'MAX_CHARGE'`가 아님 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] max_charge = NULL 저장 성공
- [ ] max_charge 미설정 시 계산된 운임 그대로 적용 (capping 없음)
- [ ] DB applied_pricing_basis가 MAX_CHARGE가 아닌 WM 결과값('WEIGHT' 또는 'CBM')

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-10-11] TISA 스냅샷 저장 검증 (IMP-107 8개 신규 컬럼)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/new (오더 생성) → /ko/orders/[id] (TISA 패널) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | ADMIN 로그인, Weight Slab + CBM Slab이 모두 설정된 요율 카드 존재 (WM 모드 검증 가능) |
| 관련 IMP | IMP-107 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | ADMIN 로그인 후 신규 오더 생성 | 중량 200kg, CBM 5, AIR, ICN→SIN | 오더 생성 완료, 경로 최적화 진행 가능 | ☐ |
| 2 | /ko/orders/[id] | 경로 최적화 실행 후 경로 선택 | — | TISA Rate Snapshot 패널에 자동 매칭 요율 정보 표시 | ☐ |
| 3 | Supabase Studio | `SELECT applied_weight_slab_min, applied_weight_unit_price, applied_weight_cost FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `applied_weight_slab_min` = 매칭된 중량 slab 최소값, `applied_weight_unit_price` = 해당 slab 단가, `applied_weight_cost` = weight_cost 계산값 | ☐ |
| 4 | Supabase Studio | `SELECT applied_cbm_slab_min, applied_cbm_price, applied_cbm_cost FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `applied_cbm_slab_min` = 매칭된 CBM slab 최소값, `applied_cbm_price` = 해당 slab CBM 단가, `applied_cbm_cost` = cbm_cost 계산값 | ☐ |
| 5 | Supabase Studio | `SELECT applied_pricing_basis FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `applied_pricing_basis` = WM 비교 결과 (`'WEIGHT'` 또는 `'CBM'`) | ☐ |
| 6 | Supabase Studio | `SELECT tiers_snapshot FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` | — | `tiers_snapshot` JSONB: 적용된 rate card의 전체 tiers 배열 저장됨 | ☐ |
| 7 | Supabase Studio | `SELECT * FROM zen_order_rate_snapshots WHERE order_id = '[orderId]'` — 전체 컬럼 확인 | — | 8개 신규 컬럼 모두 NULL이 아닌 값으로 저장됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 8개 신규 컬럼 모두 정상 저장 확인 (`applied_weight_slab_min`, `applied_weight_unit_price`, `applied_weight_cost`, `applied_cbm_slab_min`, `applied_cbm_price`, `applied_cbm_cost`, `applied_pricing_basis`, `tiers_snapshot`)
- [ ] weight slab과 cbm slab 각각 매칭된 slab 최소값/단가 정확히 확인
- [ ] applied_pricing_basis — WM 비교 결과('WEIGHT'/'CBM') 정확히 반영
- [ ] tiers_snapshot — JSONB 형식으로 rate card의 전체 tiers 구조 저장 확인
- [ ] 신규 컬럼과 기존 컬럼(total_freight 등) 간 정합성 일치

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
| 2026-05-30 | D_Kai (OpenCode) | v3.0 — UAT-10-01·02 3종 카드 → 전체 후보 비교 테이블 전환, SHIPPER 계정 변경, 화면 URL·절차 업데이트 (DEF-030 반영) |
| 2026-06-01 | B_Kai (OpenCode) | v4.0 — UAT-10-04 Rate Card 폼에 carrier_cost·margin_rate·platform_fee_rate 3개 필드 추가 · UAT-10-07 TISA Dashboard 역할별 표시(Admin/Shipper/Fallback) 신규 3개 시나리오 · TASK-105 |
| 2026-06-09 | B_Kai (OpenCode) | v5.0 — UAT-10-08~10 IMP-108 max_charge 상한선 시나리오 3종 추가 · UAT-10-11 IMP-107 TISA 스냅샷 8개 신규 컬럼 검증 시나리오 추가 · TASK-126 |
