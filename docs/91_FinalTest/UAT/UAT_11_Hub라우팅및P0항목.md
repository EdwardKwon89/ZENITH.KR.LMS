# UAT_11 — Hub 라우팅 & P0 필수 항목

> **문서번호**: UAT-11
> **작성일**: 2026-05-25
> **작성자**: B_Kai (OpenCode)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **전제 IMP**: IMP-084 (Hub Route Discovery ✅) · IMP-085 (Order-Route Segment ✅) · IMP-086 (303 Stage 1+2 ✅) · IMP-087 (Transit Tracking ✅) · IMP-088 (Privacy Consent ✅) · IMP-046 (Rate Limiting ✅)

---

## [UAT-11-01] 직항 경로 조회 및 비용 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/orders/[id] (오더 상세 → 경로 탭) |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ICN→SIN 직항 가능 오더 1건 존재, ADMIN 또는 SHIPPER 로그인, zen_route_network 시드 데이터 존재 |
| 관련 IMP | IMP-084 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | ADMIN 계정 로그인 후 오더 목록 진입 | `admin@zenith.kr` / `password1234` | 오더 목록 정상 표시 | ☐ |
| 2 | /ko/orders/[id] | ICN→SIN 직항 구간 오더 선택 → 상세 페이지 진입 | — | 오더 상세 정보 표시 | ☐ |
| 3 | /ko/orders/[id] | '경로 탭' 또는 'Route Options' 섹션 클릭 | — | COST·TIME·BALANCED 3종 카드 표시 | ☐ |
| 4 | 각 카드 | 카드 내용 중 segments 배열 확인 | — | 1개 segment만 표시 (직항), segment[0].via = null | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_route_options WHERE order_id = '[orderId]'` | — | option_type = COST/TIME/BALANCED 3행, segments JSON에 1개 segment만 존재 | ☐ |
| 6 | — | SHIPPER 계정 동일 오더 진입 | `shipper@zenith.kr` / `password1234` | SHIPPER도 동일한 3종 경로 옵션 확인 가능 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 직항(1 segment) 경로 옵션 3종 정상 표시
- [ ] segment[0].via = null (경유지 없음)
- [ ] DB zen_route_options 저장 확인
- [ ] SHIPPER도 조회 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-11-02] Hub 경유 경로 조회 및 세그먼트별 비용 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] (오더 상세 → 경로 탭) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | ICN→SIN 또는 ICN→NRT Hub 경유 가능 오더 1건 존재, ADMIN 로그인, zen_route_network + zen_hub_routes 시드 데이터 존재 |
| 관련 IMP | IMP-084 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 계정으로 Hub 경유 가능 오더 진입 | — | 오더 상세 정보 표시 | ☐ |
| 2 | /ko/orders/[id] | '경로 탭' 클릭 | — | 경로 옵션 3종 카드 표시 — Hub 경유 경로 포함 | ☐ |
| 3 | 각 카드 | Hub 경유 카드의 segments 배열 확인 | — | 2개 segment 표시: segment[0] = 출발지→Hub, segment[1] = Hub→도착지 | ☐ |
| 4 | segment[0] | 첫 번째 segment 정보 확인 | — | origin_port → hub_port_code, carrier, cost, days 표시 | ☐ |
| 5 | segment[1] | 두 번째 segment 정보 확인 | — | hub_port_code → dest_port, carrier, cost, days 표시, 직항 segment와 carrier 다를 수 있음 | ☐ |
| 6 | — | 총비용·총소요일 합산 확인 | — | 총비용 = segment[0].cost + segment[1].cost, 총소요일 = segment[0].days + segment[1].days | ☐ |
| 7 | Supabase Studio | `SELECT * FROM zen_route_options WHERE order_id = '[orderId]'` | — | Hub 경유 옵션의 segments에 2개 segment JSON 저장 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] Hub 경유 경로(2 segments) 정상 표시
- [ ] segment별 origin·hub·dest 포트 코드 표시
- [ ] segment별 carrier·cost·days 표시
- [ ] 총비용·총소요일 합산 정확
- [ ] DB 저장 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-11-03] Hub 경로 선택 후 오더 생성 및 경유지 표시 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/orders/[id] (오더 상세 → 경로 탭) |
| 예상 소요 시간 | 10분 |
| 사전 조건 | UAT-11-02 완료 (Hub 경유 경로 2개 segment 조회 완료 상태), ADMIN 로그인 |
| 관련 IMP | IMP-084 · IMP-085 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | ADMIN 계정으로 Hub 경유 가능 오더 진입 | — | COST·TIME·BALANCED 3종 + Hub 경유 옵션 표시 | ☐ |
| 2 | 경로 카드 | Hub 경유 경로 카드의 '선택' 버튼 클릭 | — | 버튼 → '선택됨' 상태 변경 | ☐ |
| 3 | — | 페이지 새로고침 (`F5`) | — | Hub 경유 경로가 계속 선택된 상태 유지 | ☐ |
| 4 | Supabase Studio | `SELECT * FROM zen_order_routes WHERE order_id = '[orderId]'` | — | selected_option_id가 선택한 Hub 경유 옵션 ID와 일치 | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_order_route_segments WHERE order_id = '[orderId]'` | — | segment_index=0,1 두 행 존재, hub_port_code 경유지 일치 | ☐ |
| 6 | /ko/orders/[id] | 오더 상세에서 경유지 정보 표시 확인 | — | 경유 포트 배지 또는 경로 시각화에 경유지 아이콘 표시 | ☐ |
| 7 | — | COST 직항 경로 재선택 → 새로고침 | — | 선택 경로가 직항으로 변경·유지, segments 1개로 변경 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] Hub 경유 경로 선택 가능
- [ ] DB `zen_order_routes` + `zen_order_route_segments` 저장 확인 (2 segments)
- [ ] 새로고침 후 선택 유지
- [ ] 오더 상세 화면에 경유지 정보 표시
- [ ] 직항→Hub→직항 재선택 가능 (UPSERT)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-11-04] 환적 상태 추적 — 레그별 이벤트 등록 및 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/tracking (추적 대시보드) → /ko/orders/[id] (오더 타임라인) |
| 예상 소요 시간 | 15분 |
| 사전 조건 | SHIPPER 계정 로그인, Hub 경유 오더 1건 존재 및 경로 선택 완료 상태 |
| 관련 IMP | IMP-087 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/tracking | SHIPPER 계정으로 추적 대시보드 진입 | `shipper@zenith.kr` / `password1234` | 추적 통계·목록 정상 표시 | ☐ |
| 2 | /ko/tracking | Hub 경유 오더의 Order Info 클릭 | — | 오더 상세 페이지로 이동 | ☐ |
| 3 | /ko/orders/[id] | 타임라인 섹션 확인 | — | 현재까지 등록된 이벤트 표시 (최소 BOOKED) | ☐ |
| 4 | Supabase Studio | `INSERT INTO zen_tracking_events`로 이벤트 수동 등록 (레그1 출발) | event_code=`TRANSIT_DEPARTED`, segment_index=0 | 오더 타임라인에 'Leg 1 · 출발' 레이블로 표시 | ☐ |
| 5 | /ko/orders/[id] | 타임라인 새로고침 | — | TRANSIT_DEPARTED 이벤트가 타임라인에 추가, 아이콘(트럭) + 'Leg 1' 레이블 표시 | ☐ |
| 6 | Supabase Studio | 환적지 도착 이벤트 등록 | event_code=`TRANSIT_ARRIVED_HUB`, segment_index=0, hub_port_code=`HKG` | 타임라인에 'Leg 1 · 환적지 도착' + 허브 마커(맵핀) + hub_port_code 표시 | ☐ |
| 7 | Supabase Studio | 환적지 출발 이벤트 등록 | event_code=`TRANSIT_DEPARTED_HUB`, segment_index=1, hub_port_code=`HKG` | 타임라인에 'Leg 2 · 환적지 출발' 표시 | ☐ |
| 8 | Supabase Studio | 최종 목적지 도착 등록 | event_code=`TRANSIT_ARRIVED_DEST`, segment_index=1 | 타임라인에 'Leg 2 · 목적지 도착' 표시, 상태 배지 DELIVERED | ☐ |
| 9 | /ko/orders/[id] | ADMIN 계정으로 동일 오더 진입 | `admin@zenith.kr` / `password1234` | 동일 타임라인 이벤트 표시 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] TRANSIT_* 4종 이벤트 정상 표시
- [ ] 레그 번호(Leg 1 / Leg 2) label 정확
- [ ] 환적지 도착 시 허브 마커 아이콘(맵핀) 표시
- [ ] TRANSIT_ARRIVED_DEST → 오더 상태 DELIVERED 전이 확인
- [ ] SHIPPER/ADMIN 모두 조회 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-11-05] 개인정보 활용동의 미체크 시 회원가입 차단 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | PERSONAL (비회원 → 신규 가입) |
| 화면 URL | /ko/signup (회원가입 Wizard) |
| 예상 소요 시간 | 8분 |
| 사전 조건 | 신규 브라우저(시크릿 모드), 미로그인 상태, 개인정보동의 기능 활성화 상태 |
| 관련 IMP | IMP-088 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/signup | 회원가입 Wizard 1단계 진입 | — | 약관 및 개인정보 수집·이용 동의 체크박스 2종 표시 | ☐ |
| 2 | /ko/signup | 두 체크박스 모두 미체크 상태로 '다음' 버튼 클릭 | — | '개인정보 수집·이용 및 서비스 이용약관에 모두 동의해야 합니다.' 오류 메시지 표시, 다음 단계 이동 차단 | ☐ |
| 3 | /ko/signup | 서비스 이용약관만 체크 → '다음' | 체크: terms only | 개인정보 미동의 오류 메시지 표시, 다음 단계 차단 | ☐ |
| 4 | /ko/signup | 개인정보 수집·이용만 체크 → '다음' | 체크: privacy only | 약관 미동의 오류 메시지 표시, 다음 단계 차단 | ☐ |
| 5 | /ko/signup | 두 체크박스 모두 체크 → '다음' | 체크: both | 다음 단계(정보 입력)로 정상 이동 | ☐ |
| 6 | /ko/signup | Wizard 완료까지 정상 진행 | 이름·이메일·비밀번호·전화번호·사업자등록번호 | 회원가입 완료, 대시보드 또는 환영 페이지로 이동 | ☐ |
| 7 | Supabase Studio | `SELECT privacy_consent FROM profiles WHERE email = '[newEmail]'` | — | privacy_consent = true 저장 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 약관·개인정보 미체크 시 오류 메시지 + 다음 단계 차단
- [ ] 단일 체크만으로도 다음 단계 차단
- [ ] 두 체크박스 모두 체크 시 정상 진행
- [ ] DB profiles.privacy_consent = true 저장 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-11-06] Rate Limiting — 로그인 반복 시 429 응답 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ALL |
| 화면 URL | /ko/login (로그인 페이지) |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 브라우저 개발자 도구(F12) Network 탭 열기, Rate Limiting 활성화 상태 (10회/분 기준) |
| 관련 IMP | IMP-046 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/login | 로그인 페이지 진입 | — | 로그인 폼 정상 표시 | ☐ |
| 2 | /ko/login | Network 탭 열고 로그인 연속 10회 시도 | 올바른 계정 정보 | 10회 모두 성공 (로그인 가능) — Rate Limit 미도달 | ☐ |
| 3 | /ko/login | 11번째 로그인 시도 (동일 IP, 1분 이내) | 올바른 계정 정보 | 429 Too Many Requests 응답, '요금 제한이 초과되었습니다. 잠시 후 다시 시도해 주세요.' 메시지 표시 | ☐ |
| 4 | /ko/login | 1분 대기 후 재시도 | 올바른 계정 정보 | 정상 로그인 성공 (Rate Limit 리셋) | ☐ |
| 5 | /ko/login | 타 계정으로 10회 초과 시도 | 다른 계정 정보 | 동일 IP는 계정과 무관하게 Rate Limit 공유 — 429 응답 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 10회 이내: 정상 로그인 (200)
- [ ] 11회: 429 Too Many Requests 응답 확인
- [ ] 사용자 친화적 오류 메시지 표시
- [ ] 1분 후 Rate Limit 리셋 — 정상 로그인 복원
- [ ] 동일 IP = Rate Limit 공유 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-25 | B_Kai (OpenCode) | v1.0 초안 작성 — UAT-11-01~06 절차 6개, Hub 라우팅 & P0 필수 항목 검증 범위 정의 |
