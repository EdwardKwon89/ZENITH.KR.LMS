# UAT_02 — 오더 관리

> **문서번호**: UAT-02
> **작성일**: 2026-05-22
> **작성자**: B_Kai (Noah/Codex)
> **버전**: v1.0

---

## [UAT-02-01] 오더 신규 생성

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER |
| 화면 URL | /ko/login → /ko/orders/new |
| 예상 소요 시간 | 10분 |
| 사전 조건 | SHIPPER 계정(`test_corp_1777785263838@zenith.kr`) 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | '신규 오더' 버튼 클릭 | — | /ko/orders/new 로 이동, 오더 생성 폼 표시 | ☐ |
| 2 | /ko/orders/new | Order Type 선택 | 'B2B General Cargo' 선택 | Order Type이 B2B로 설정됨 | ☐ |
| 3 | /ko/orders/new | Transport Mode 선택 | 'AIR (항공)' 선택 | 출발지/도착지 드롭다운이 공항 목록으로 필터링 | ☐ |
| 4 | /ko/orders/new | 출발지(Origin Port) 선택 | 드롭다운에서 'ICN (인천국제공항)' 선택 | 출발지가 ICN으로 표시 | ☐ |
| 5 | /ko/orders/new | 도착지(Destination Port) 선택 | 드롭다운에서 'LAX (로스앤젤레스 국제공항)' 선택 | 도착지가 LAX로 표시 | ☐ |
| 6 | /ko/orders/new | 수하인 정보 입력 - 이름 | '김철수' 입력 | 입력값 표시 | ☐ |
| 7 | /ko/orders/new | 수하인 정보 입력 - 연락처 | '010-5678-1234' 입력 | 입력값 표시 | ☐ |
| 8 | /ko/orders/new | 수하인 정보 입력 - 주소 | '1234 Sunset Blvd, Los Angeles, CA 90001, USA' 입력 | 입력값 표시 | ☐ |
| 9 | /ko/orders/new | Package 1 - 포장단위 선택 | 'BOX' 선택 | 포장단위가 BOX로 표시 | ☐ |
| 10 | /ko/orders/new | Package 1 - 개수 입력 | '2' 입력 | 개수 2로 표시 | ☐ |
| 11 | /ko/orders/new | Package 1 - 중량 입력 | '15.5' 입력 | 중량 15.5 kg 표시 | ☐ |
| 12 | /ko/orders/new | Package 1 - 품목명 입력 | '전자부품 (Electronic Components)' 입력 | 품목명 표시 | ☐ |
| 13 | /ko/orders/new | Package 1 - 품목 수량 입력 | '100' 입력 | 수량 100 표시 | ☐ |
| 14 | /ko/orders/new | Package 1 - HS Code 입력 | '8542.31' 입력 | HS Code 표시 | ☐ |
| 15 | /ko/orders/new | '등록' 버튼 클릭 | — | 오더 생성 완료 토스트 메시지 표시, 오더 상세 페이지로 이동 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 생성된 오더의 status가 'PENDING'으로 표시
- [ ] 오더 상세 페이지에 입력한 모든 정보가 정확히 표시

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-02] 오더 목록 조회·검색·필터

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, 다수의 오더 데이터 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 오더 목록 페이지 접속 | — | 오더 목록 테이블 정상 표시 (주문번호·상태·송하인·수하인·일자 컬럼) | ☐ |
| 2 | /ko/orders | 검색창에 송하인명 입력 후 검색 | '테스트' | 입력한 송하인명이 포함된 오더만 필터링되어 표시 | ☐ |
| 3 | /ko/orders | 검색창 초기화 | 검색어 삭제 | 전체 오더 목록 복원 | ☐ |
| 4 | /ko/orders | 상태(Status) 필터 선택 | 'PENDING' 선택 | PENDING 상태 오더만 표시 | ☐ |
| 5 | /ko/orders | 상태 필터 변경 | 'WAREHOUSED' 선택 | WAREHOUSED 상태 오더만 표시 | ☐ |
| 6 | /ko/orders | 상태 필터 초기화 | '전체' 선택 | 전체 오더 목록 복원 | ☐ |
| 7 | /ko/orders | 페이지네이션 동작 확인 | '2' 페이지 클릭 | 2페이지 오더 목록 로드 | ☐ |
| 8 | /ko/orders | 페이지 당 행 수 변경 | 드롭다운에서 '50' 선택 | 50개씩 표시, 2페이지 이후로 이동 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 검색·필터 결과가 URL 쿼리 파라미터에 반영 (`/ko/orders?status=PENDING`)
- [ ] 페이지네이션 정상 동작

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-03] 오더 상세 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/login → /ko/orders → /ko/orders/{orderId} |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN(`admin@zenith.kr`) 또는 SHIPPER(`test_corp_1777785263838@zenith.kr`) 로그인 상태, 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 오더 목록에서 첫 번째 행 클릭 | — | 오더 상세 페이지로 이동 | ☐ |
| 2 | /ko/orders/{orderId} | 오더 기본 정보 확인 | — | 오더 번호·상태·타입·Transport Mode 표시 | ☐ |
| 3 | /ko/orders/{orderId} | 송하인 정보 섹션 확인 | — | 송하인명·연락처·주소·사업자번호 표시 | ☐ |
| 4 | /ko/orders/{orderId} | 수하인 정보 섹션 확인 | — | 수하인명·연락처·주소 표시 | ☐ |
| 5 | /ko/orders/{orderId} | 포트 정보 확인 | — | 출발지·도착지 표시 | ☐ |
| 6 | /ko/orders/{orderId} | 패키지·품목 정보 확인 | — | 포장단위·개수·중량·품목명·HS Code 표시 | ☐ |
| 7 | /ko/orders/{orderId} | 히스토리 탭 확인 (ADMIN 전용) | — | 오더 상태 변경 이력(변경 전/후·일시·처리자) 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 모든 정보 필드가 정확히 표시 (오더 생성 시 입력한 값과 일치)
- [ ] SHIPPER 역할에서도 자신의 오더 상세 조회 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-04] 오더 상태 전이 전체 플로우 (REGISTERED→DELIVERED)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 20분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, **REGISTERED** 상태 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 오더 목록에서 REGISTERED 상태 오더 검색 | 상태 필터 → 'REGISTERED' | REGISTERED 오더만 표시 | ☐ |
| 2 | /ko/orders | REGISTERED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 SCHEDULED 표시 | ☐ |
| 3 | /ko/orders | REGISTERED→SCHEDULED 전이 | 'SCHEDULED' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 4 | /ko/orders | 상태 배지 색상 확인 (SCHEDULED) | — | 오더 배지가 남색(`bg-indigo-100 text-indigo-800`)으로 변경 | ☐ |
| 5 | /ko/orders | SCHEDULED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 WAREHOUSED 표시 | ☐ |
| 6 | /ko/orders | SCHEDULED→WAREHOUSED 전이 | 'WAREHOUSED' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 7 | /ko/orders | 상태 배지 색상 확인 (WAREHOUSED) | — | 오더 배지가 노랑(`bg-yellow-100 text-yellow-800`)으로 변경 | ☐ |
| 8 | /ko/orders | WAREHOUSED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 PACKED 표시 | ☐ |
| 9 | /ko/orders | WAREHOUSED→PACKED 전이 (UAT-04-07과 교차) | 'PACKED' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 10 | /ko/orders | 상태 배지 색상 확인 (PACKED) | — | 오더 배지가 주황(`bg-orange-100 text-orange-800`)으로 변경 | ☐ |
| 11 | /ko/orders | PACKED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 RELEASED 표시 | ☐ |
| 12 | /ko/orders | PACKED→RELEASED 전이 | 'RELEASED' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 13 | /ko/orders | 상태 배지 색상 확인 (RELEASED) | — | 오더 배지가 보라(`bg-purple-100 text-purple-800`)으로 변경 | ☐ |
| 14 | /ko/orders | RELEASED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 IN_TRANSIT 표시 | ☐ |
| 15 | /ko/orders | RELEASED→IN_TRANSIT 전이 | 'IN_TRANSIT' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 16 | /ko/orders | 상태 배지 색상 확인 (IN_TRANSIT) | — | 오더 배지가 청록(`bg-cyan-100 text-cyan-800`)으로 변경 | ☐ |
| 17 | /ko/orders | IN_TRANSIT 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 상태 목록에 DELIVERED 표시 | ☐ |
| 18 | /ko/orders | IN_TRANSIT→DELIVERED 전이 | 'DELIVERED' 선택 → '변경' 버튼 클릭 | 토스트 "상태가 변경되었습니다" 표시 | ☐ |
| 19 | /ko/orders | 상태 배지 색상 확인 (DELIVERED) | — | 오더 배지가 초록(`bg-green-100 text-green-800`)으로 변경 | ☐ |
| 20 | /ko/orders → /ko/orders/[id] | 오더 상세 → 히스토리 탭 | 오더 클릭 → '히스토리' 탭 선택 | **6개 전이 이력 전체** 기록 확인 (변경 전·변경 후·일시·수행자) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT→DELIVERED 6개 전이 각각 성공
- [ ] 각 전이 후 상태 배지 색상이 ORDER_STATUS_META 정의와 일치
- [ ] 오더 히스토리에 **6개 전이 이력** 전체 기록 (변경 전·후·일시·수행자)
- [ ] WAREHOUSED→PACKED 전이 확인 (UAT-04-07에서 패킹 화면 전용 검증)
- [ ] DELIVERED 이후 정산은 UAT-05에서 검증

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-05] HELD 상태 전환 + 원상복구

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, WAREHOUSED 상태 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 상태 필터 'WAREHOUSED' 선택 | 상태 필터 → 'WAREHOUSED' | WAREHOUSED 오더만 표시 | ☐ |
| 2 | /ko/orders | WAREHOUSED 오더의 상태 배지 클릭 | — | StatusChangeModal 오픈, 전이 가능 목록에 HELD 포함 확인 | ☐ |
| 3 | /ko/orders | WAREHOUSED→HELD 전이 | 'HELD' 선택 → '변경' 버튼 클릭 | 토스트 표시, 상태 배지 HELD(빨간색)로 변경 | ☐ |
| 4 | /ko/orders | HELD 오더 상태 배지 재클릭 | — | StatusChangeModal에 '원상복구' 버튼 및 이전 상태(WAREHOUSED) 레이블 표시 | ☐ |
| 5 | /ko/orders | '원상복구' 버튼 클릭 | — | 토스트 "이전 상태로 성공적으로 복구되었습니다." 표시 | ☐ |
| 6 | /ko/orders | 상태 복구 확인 | — | 오더 상태 배지가 WAREHOUSED로 복귀 | ☐ |
| 7 | /ko/orders | HELD→다른 상태 전이 테스트 | 상태 배지 클릭 → HELD 선택 | StatusChangeModal에 '원상복구' 버튼 및 현재 바로 전 상태 표시 | ☐ |
| 8 | /ko/orders/orderId | HELD 이력 확인 (오더 상세) | 오더 상세 → 히스토리 탭 | 상태 변경 이력에 PENDING→WAREHOUSED→HELD→WAREHOUSED 기록 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] HELD 원상복구 후 상태가 HELD 직전 상태로 정확히 복구
- [ ] 오더 히스토리에 HELD 전환 및 복구 이력 모두 기록

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-06] RETURNED → WAREHOUSED / DISPOSED 전이

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, WAREHOUSED 상태 오더 2건 존재 |

### 테스트 절차 - 케이스 A: RETURNED → WAREHOUSED 재입고

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | WAREHOUSED 오더 1건을 RETURNED로 전환 | 상태 배지 클릭 → 'RETURNED' 선택 → 변경 | 상태 배지 RETURNED(주황색)로 변경 | ☐ |
| 2 | /ko/orders | RETURNED 오더 상태 배지 재클릭 | — | StatusChangeModal에 전이 옵션 3종(WAREHOUSED·CANCELED·DISPOSED) 표시 확인 | ☐ |
| 3 | /ko/orders | RETURNED→WAREHOUSED 전이 | 'WAREHOUSED' 선택 → '변경' 클릭 | 상태 배지 WAREHOUSED(파란색)로 변경 | ☐ |
| 4 | /ko/orders | 상태 변경 확인 | — | 오더 리스트에 WAREHOUSED 상태로 표시 | ☐ |

### 테스트 절차 - 케이스 B: RETURNED → DISPOSED 폐기

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 5 | /ko/orders | 다른 WAREHOUSED 오더를 RETURNED로 전환 | 상태 배지 클릭 → 'RETURNED' 선택 → 변경 | 상태 배지 RETURNED로 변경 | ☐ |
| 6 | /ko/orders | RETURNED→DISPOSED 전이 | 상태 배지 클릭 → 'DISPOSED' 선택 → 변경 | 상태 배지 DISPOSED(회색)로 변경 | ☐ |
| 7 | /ko/orders | DISPOSED 오더 재변경 불가 확인 | 상태 배지 클릭 | StatusChangeModal에 전이 가능 상태 없음 또는 비활성화 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] RETURNED→WAREHOUSED 재입고 성공
- [ ] RETURNED→DISPOSED 폐기 성공
- [ ] DISPOSED 상태에서는 추가 상태 전이 불가
- [ ] 오더 히스토리에 모든 전이 이력 기록

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-07] 오더 취소 (CANCELED)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, PENDING 상태 오더 1건, WAREHOUSED 상태 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | PENDING 오더 상태 배지 클릭 | — | StatusChangeModal에 CANCELED 옵션 표시 | ☐ |
| 2 | /ko/orders | PENDING→CANCELED 전이 | 'CANCELED' 선택 → '변경' 클릭 | 상태 배지 CANCELED(빨간색)로 변경 | ☐ |
| 3 | /ko/orders | CANCELED 오더 재변경 불가 확인 | 상태 배지 클릭 | StatusChangeModal에 전이 가능 상태 없음 | ☐ |
| 4 | /ko/orders | WAREHOUSED→CANCELED 전이 | WAREHOUSED 오더 상태 배지 클릭 → 'CANCELED' 선택 → 변경 | 상태 배지 CANCELED로 변경, 재고 복구 확인 | ☐ |
| 5 | /ko/orders | 재고 확인 (재고 페이지 이동) | /ko/inventory로 이동 | 취소된 오더의 재고가 복구되어 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] PENDING→CANCELED 성공
- [ ] WAREHOUSED→CANCELED 성공 (재고 복구 포함)
- [ ] CANCELED 상태에서는 추가 전이 불가

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-08] 역할별 상태 변경 권한 분화

| 항목 | 내용 |
|:----|:----|
| 역할 | MANAGER / ADMIN |
| 화면 URL | /ko/login → /ko/orders |
| 예상 소요 시간 | 10분 |
| 사전 조건 | MANAGER 계정(`manager@zenith.kr`) + ADMIN 계정(`admin@zenith.kr`) 로그인 상태, 각 역할별 오더 데이터 존재 |

### 테스트 절차 — MANAGER 권한 범위

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/login | MANAGER 계정 로그인 | manager@zenith.kr / password1234 | 대시보드 이동 | ☐ |
| 2 | /ko/orders | 오더 목록 접속 | — | 오더 테이블 정상 표시 | ☐ |
| 3 | /ko/orders | PENDING 오더 상태 배지 클릭 | — | StatusChangeModal에 MANAGER 허용 상태(WAREHOUSED·PACKED 등)만 표시 | ☐ |
| 4 | /ko/orders | MANAGER가 WAREHOUSED 상태로 전환 | 'WAREHOUSED' 선택 → '변경' 클릭 | 상태 변경 성공, 토스트 표시 | ☐ |
| 5 | /ko/orders | MANAGER 허용 범위 외 상태 확인 | 다른 오더 상태 배지 클릭 → StatusChangeModal에서 CANCELED·RETURNED·HELD 등 버튼 비활성 또는 미노출 확인 | ADMIN 전용 상태는 MANAGER가 접근 불가 | ☐ |

### 테스트 절차 — ADMIN 전용 상태 검증

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 6 | /ko/login | ADMIN 계정 로그인 | admin@zenith.kr / password1234 | 대시보드 이동 | ☐ |
| 7 | /ko/orders | ADMIN이 CANCELED·RETURNED·HELD 전이 | 상태 배지 클릭 → 각 전이 실행 | ADMIN은 모든 상태 전이 가능 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] MANAGER는 WAREHOUSED·PACKED 등 허용 상태만 전환 가능 (CANCELED·RETURNED·HELD 등 차단)
- [ ] ADMIN은 제한 없이 모든 상태 전이 가능
- [ ] MANAGER가 StatusChangeModal에서 ADMIN 전용 상태 버튼이 비활성화 또는 미노출

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-09] 경로 옵션 조회 및 선택

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER / ADMIN |
| 화면 URL | /ko/login → /ko/orders/{orderId} |
| 예상 소요 시간 | 8분 |
| 사전 조건 | SHIPPER(`test_corp_1777785263838@zenith.kr`) 또는 ADMIN(`admin@zenith.kr`) 로그인 상태, PENDING 또는 WAREHOUSED 상태 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/{orderId} | 오더 상세 페이지 접속 | — | 오더 기본 정보 표시, '경로 최적화 (Route Optimization)' 섹션 표시 | ☐ |
| 2 | /ko/orders/{orderId} | '경로 계산하기' 버튼 클릭 | — | '최적의 경로를 분석하고 있습니다...' 로딩 메시지 표시 | ☐ |
| 3 | /ko/orders/{orderId} | 경로 옵션 계산 완료 대기 | — | 3종 카드(최저비용·최단시간·최적균형) 각각 표시 (grid 1x3 레이아웃) | ☐ |
| 4 | /ko/orders/{orderId} | 경로 옵션 카드 정보 확인 | — | 각 카드에 Total Cost($), Transit Time(일), 구간 세부정보, Efficiency Score 표시 | ☐ |
| 5 | /ko/orders/{orderId} | '최저비용' 카드 클릭 | '이 경로 선택' 버튼 클릭 | 버튼이 '선택됨'으로 변경, '경로가 확정되었습니다' 토스트 표시 | ☐ |
| 6 | /ko/orders/{orderId} | 마일스톤 타임라인 표시 확인 | — | 확정 경로의 운송 마일스톤 타임라인 시각화 표시, '최종 확정된 경로입니다' 문구 표시 | ☐ |
| 7 | /ko/orders/{orderId} | 브라우저 새로고침 | F5 | 선택된 경로가 유지됨, 마일스톤 타임라인 재표시 | ☐ |
| 8 | /ko/orders/{orderId} | '경로 재계산' 버튼 클릭 | — | 경로 옵션 재계산, 3종 카드 다시 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 3종 경로 카드(COST·TIME·BALANCED) 정상 표시
- [ ] 카드에 총비용·총소요일·구간정보·스코어 모두 표시
- [ ] 경로 선택 후 토스트 및 마일스톤 타임라인 표시
- [ ] 페이지 새로고침 후 선택 유지
- [ ] SHIPPER 역할에서도 경로 조회·선택 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-02-10] 특수화물 유형 기재 + 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (등록) / ADMIN·MANAGER (조회) |
| 화면 URL | /ko/orders/new (등록), /ko/orders/[id] (조회) |
| 예상 소요 시간 | 5분 |
| 사전 조건 | SHIPPER 계정(`shipper@zenith.kr`) 로그인 상태 |
| 관련 IMP | IMP-076 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/login | 화주(SHIPPER) 계정으로 로그인 | shipper@zenith.kr / password1234 | 로그인 성공 후 화주 대시보드로 이동 | ☐ |
| 2 | /ko/orders/new | 신규 오더 등록 페이지 접속 및 특수화물 라디오 그룹 확인 | — | 특수화물 유형 라디오 옵션 5종(일반화물, 위험물, 냉동화물, 고가화물, 중고화물)이 노출되고 '일반화물'이 선택되어 있음 | ☐ |
| 3 | /ko/orders/new | 특수화물 유형을 '위험물'로 선택하고 오더 생성 정보 입력 후 '등록' 클릭 | 수하인 정보, 패키지 정보 등 | 오더 생성 완료 토스트 메시지 표시 후 오더 상세 페이지로 이동 | ☐ |
| 4 | /ko/orders/[id] | 오더 상세 페이지에서 특수화물 유형 표시 확인 | — | '특수화물' 항목에 '위험물 (DANGEROUS)' 또는 이에 상응하는 특수화물 라벨이 정상적으로 표시됨 | ☐ |
| 5 | /ko/login | 플랫폼 관리자(ADMIN) 계정으로 세션 전환 | admin@zenith.kr / password1234 | 관리자 로그인 완료 | ☐ |
| 6 | /ko/orders | 오더 목록 페이지에서 특수화물 필터 기능 테스트 | 필터: '위험물' 선택 | DB `special_cargo_type`이 'DANGEROUS'인 오더만 필터링되어 출력됨 | ☐ |

### 합격 기준
- [ ] 오더 신규 등록 폼에 특수화물 유형 라디오 그룹 표시 (NONE/DANGEROUS/FROZEN/VALUABLE/USED)
- [ ] 기본값 `NONE` 선택 상태
- [ ] 유형 선택 후 오더 저장 → DB `special_cargo_type` 컬럼 정상 저장
- [ ] 오더 상세 페이지에서 특수화물 유형 정상 표시
- [ ] ADMIN 오더 목록에서 특수화물 유형 필터링 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | B_Kai (Noah/Codex) | v1.0 초안 작성 — 7개 시나리오 전량 |
| 2026-05-23 | B_Kai (Noah/Codex) | UAT-02-08 추가 — 역할별 상태 변경 권한 분화 |
| 2026-05-23 | B_Kai (Noah/Codex) | UAT-02-09 추가 — 경로 옵션 조회 및 선택 |
| 2026-05-23 | Aiden (Claude) | UAT-02-10 추가 — 특수화물 유형 기재 (IMP-076 골격)
