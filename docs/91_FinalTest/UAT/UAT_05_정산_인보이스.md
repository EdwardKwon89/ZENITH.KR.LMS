# UAT_05 — 정산·인보이스

> **문서번호**: UAT-05
> **작성일**: 2026-05-22
> **작성자**: B_Kai (Noah/Codex)
> **버전**: v1.0

---

## [UAT-05-01] 정산 목록 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/settlement |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, 정산 데이터(인보이스) 1건 이상 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/settlement | 정산 페이지 접속 | — | 3개 통계 카드(Unpaid·Total Outstanding·Recently Paid) 표시 | ☐ |
| 2 | /ko/settlement | 인보이스 테이블 확인 | — | Invoice No·Shipper·Amount·Due Date·Status·Actions 컬럼 표시 | ☐ |
| 3 | /ko/settlement | Status 배지 색상 확인 | — | UNPAID(호박색)·PAID(에메랄드)·OVERDUE(장미색) 배지 표시 | ☐ |
| 4 | /ko/settlement | UNPAID 인보이스의 Actions 버튼 확인 | UNPAID 행의 Actions 영역 확인 | Confirm Payment·Issue PDF·History 아이콘 표시 | ☐ |
| 5 | /ko/settlement | PAID 인보이스의 Actions 버튼 확인 | PAID 행의 Actions 영역 확인 | History 아이콘만 표시 (Confirm Payment 없음) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 통계 카드 수치가 실제 DB 데이터와 일치
- [ ] Status별 배지 색상 정확
- [ ] UNPAID와 PAID 인보이스의 Actions 버튼 차이 정확

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-02] 인보이스 생성 (정산 확인)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/settlement |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, UNPAID 상태 인보이스 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/settlement | UNPAID 인보이스 행 찾기 | — | UNPAID 인보이스 목록에 표시 | ☐ |
| 2 | /ko/settlement | 'Confirm Payment' (CreditCard 아이콘) 버튼 클릭 | — | ConfirmPaymentModal 오픈, 인보이스 번호·금액·송하인 정보 표시 | ☐ |
| 3 | /ko/settlement | 결제 확인 모달에서 '확인' 클릭 | — | 결제 처리 완료 토스트 표시 | ☐ |
| 4 | /ko/settlement | 인보이스 상태 변경 확인 | — | 해당 인보이스 Status 배지가 PAID(에메랄드)로 변경 | ☐ |
| 5 | /ko/settlement | Recently Paid 통계 카드 갱신 확인 | — | Recently Paid 카운트가 1 증가 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] ConfirmPaymentModal에 인보이스 정보 정확히 표시
- [ ] 결제 확인 후 상태 UNPAID→PAID 변경
- [ ] 통계 카드 실시간 갱신

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-03] 인보이스 Excel/PDF 다운로드

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER |
| 화면 URL | /ko/login → /ko/finance |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN(`admin@zenith.kr`) 또는 SHIPPER(`test_corp_1777785263838@zenith.kr`) 계정 로그인 상태, 인보이스 데이터 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/finance | Finance Dashboard 접속 | — | 3개 KPI 카드 + Invoice 테이블 + Revenue Chart + Settlement Health 표시 | ☐ |
| 2 | /ko/finance | 'Export Excel' 버튼 클릭 | — | `.xlsx` 파일 다운로드, 파일명에 일자 포함 | ☐ |
| 3 | /ko/finance | 다운로드된 Excel 파일 열기 | — | Invoice 데이터가 시트에 정상 표시 (컬럼·값 정확) | ☐ |
| 4 | /ko/finance | Invoice 테이블에서 한 행의 'Issue PDF' (FileDown 아이콘) 버튼 클릭 | — | PDF 생성 완료 토스트 표시, PDF 파일 다운로드 | ☐ |
| 5 | /ko/finance | 다운로드된 PDF 파일 열기 | — | 인보이스 PDF가 정상 렌더링 (인보이스 번호·금액·일자·송하인 정보 포함) | ☐ |
| 6 | /ko/finance | 'PDF History' (History 아이콘) 버튼 클릭 | — | InvoiceHistorySheet 바텀 시트 오픈, PDF 발행 이력 목록 표시 | ☐ |
| 7 | /ko/finance | 'Tax Invoice' (FileText 아이콘) 버튼 클릭 | — | TaxInvoiceSheet 바텀 시트 오픈, 세금 계산서 정보 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] Excel Export 정상 다운로드 (파일 포맷·데이터 정합성)
- [ ] PDF 발행 정상 (렌더링·데이터 정확)
- [ ] PDF History 바텀 시트 정상 표시
- [ ] SHIPPER 역할에서도 자신의 인보이스 PDF 다운로드 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-04] 비용 조회 (finance/costs)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/finance/costs |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/finance/costs | 비용 조회 페이지 접속 | — | 3개 KPI 카드(Total Operating Cost·Highest Cost Route·Total Line Items) 표시 | ☐ |
| 2 | /ko/finance/costs | 비용 데이터 테이블 확인 | — | Order No·Shipper·Cost Item·Transport·Amount·Date 컬럼 표시 | ☐ |
| 3 | /ko/finance/costs | Order No 링크 클릭 | 테이블 첫 행의 Order No 클릭 | `/ko/orders/{order_id}`로 이동, 오더 상세 페이지 표시 | ☐ |
| 4 | /ko/finance/costs | 브라우저 뒤로가기 | — | /ko/finance/costs 로 복귀 | ☐ |
| 5 | /ko/finance/costs | 날짜 필터 변경 | 시작일: 2026-04-01, 종료일: 2026-04-30 | 해당 기간 비용 데이터만 필터링 | ☐ |
| 6 | /ko/finance/costs | 서비스 유형 필터 변경 | Service Category → 'FREIGHT' 선택 → 'Filter Costs' 클릭 | FREIGHT 유형 비용만 표시 | ☐ |
| 7 | /ko/finance/costs | 경로(Route) 필터 입력 | 'ICN-LAX' 입력 → 'Filter Costs' 클릭 | ICN-LAX 경로 비용만 표시 | ☐ |
| 8 | /ko/finance/costs | 필터 초기화 | 필터 전부 초기화 | 전체 비용 데이터 복원 | ☐ |
| 9 | /ko/finance/costs | 'Export Excel' 버튼 클릭 | — | `cost_report_{startDate}_{endDate}`.xlsx 다운로드 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] KPI 카드 수치 정확
- [ ] 필터링 정상 동작 (날짜·서비스 유형·경로)
- [ ] URL 쿼리 파라미터에 필터 조건 반영
- [ ] Excel Export 정상

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-05] 수익 조회 (finance/revenue)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/finance/revenue |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/finance/revenue | 수익 조회 페이지 접속 | — | 3개 KPI 카드(Total Revenue·Invoice Count·Avg Ticket Size) 표시 | ☐ |
| 2 | /ko/finance/revenue | 수익 데이터 테이블 확인 | — | Invoice No·Shipper·Transport Mode·Status·Amount·Date 컬럼 표시 | ☐ |
| 3 | /ko/finance/revenue | Status 배지 확인 | — | PAID(초록)·UNPAID(호박색) 배지 표시 | ☐ |
| 4 | /ko/finance/revenue | Invoice No 링크 클릭 | 테이블 첫 행의 Invoice No 클릭 | `/ko/finance/invoices/{id}`로 이동 (또는 적절한 상세 페이지) | ☐ |
| 5 | /ko/finance/revenue | 날짜 필터 변경 | 시작일: 2026-04-01, 종료일: 2026-04-30 → 'Search Reports' 클릭 | 해당 기간 수익 데이터만 필터링 | ☐ |
| 6 | /ko/finance/revenue | Transport Mode 필터 변경 | Transport Mode → 'AIR' 선택 → 'Search Reports' 클릭 | AIR 모드 수익만 표시 | ☐ |
| 7 | /ko/finance/revenue | Shipper(회사) 필터 변경 | Shipper 드롭다운에서 첫 번째 업체 선택 → 'Search Reports' 클릭 | 해당 Shipper의 수익만 표시 | ☐ |
| 8 | /ko/finance/revenue | 'Export Excel' 버튼 클릭 | — | `revenue_report_{startDate}_{endDate}`.xlsx 다운로드 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] KPI 카드 수치 정확
- [ ] 필터링 정상 동작 (날짜·Transport Mode·Shipper)
- [ ] Excel Export 정상
- [ ] Invoice No 링크 클릭 시 상세 페이지 이동 (404 아닐 것)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-06] 인보이스 상세 페이지 링크 이동 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/finance/revenue |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, 인보이스 데이터 1건 이상 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/finance/revenue | 수익 조회 페이지 접속 | — | Revenue 테이블 정상 표시 | ☐ |
| 2 | /ko/finance/revenue | 첫 번째 Invoice No 링크 클릭 | Invoice No 텍스트 클릭 | `/ko/finance/invoices/{id}` 페이지로 이동 | ☐ |
| 3 | /ko/finance/invoices/{id} | 인보이스 상세 정보 확인 | — | 인보이스 번호·금액·송하인·일자·상태 등 상세 정보 표시 | ☐ |
| 4 | /ko/finance/invoices/{id} | 404·500 에러 확인 | — | 페이지 정상 로드, HTTP 오류 없음 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] Invoice No 링크 클릭 시 `/ko/finance/invoices/{id}` 상세 페이지 이동 성공
- [ ] 404·500 에러 없음
- [ ] 인보이스 상세 정보 정확히 표시

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-05-07] SHIPPER의 Settlement 접근 권한 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER |
| 화면 URL | /ko/login → /ko/settlement, /ko/finance |
| 예상 소요 시간 | 8분 |
| 사전 조건 | SHIPPER 계정(`test_corp_1777785263838@zenith.kr`) + ADMIN 계정(`admin@zenith.kr`) 로그인 상태 |

### 테스트 절차 — 시나리오 A: SHIPPER의 Settlement 직접 접근

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/login | SHIPPER 계정 로그인 | test_corp_1777785263838@zenith.kr / password1234 | 대시보드 이동 | ☐ |
| 2 | /ko/settlement | `/ko/settlement` 직접 URL 입력 접근 | 브라우저 주소창에 입력 | 권한 오류 메시지 표시 또는 `/ko/finance` 등 허용된 페이지로 리다이렉트 | ☐ |

### 테스트 절차 — 시나리오 B: SHIPPER의 Finance 데이터 범위

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 3 | /ko/login | SHIPPER 계정 유지 | — | 로그인 상태 유지 | ☐ |
| 4 | /ko/finance | Finance Dashboard 접속 | — | SHIPPER 본인 조직의 인보이스만 표시 (타 조직 인보이스 미노출) | ☐ |
| 5 | /ko/finance | Invoice 테이블 데이터 확인 | — | 테이블에 SHIPPER 소속 인보이스만 노출 | ☐ |

### 테스트 절차 — 시나리오 C: ADMIN의 전체 데이터 접근

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 6 | /ko/login | ADMIN 계정 로그인 | admin@zenith.kr / password1234 | 대시보드 이동 | ☐ |
| 7 | /ko/settlement | `/ko/settlement` 접속 | — | 정산 페이지 정상 표시 (전체 인보이스) | ☐ |
| 8 | /ko/finance | Finance Dashboard 접속 | — | 전체 조직 인보이스 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] SHIPPER의 `/ko/settlement` 직접 접근 차단 또는 리다이렉트
- [ ] SHIPPER는 본인 조직 인보이스만 조회 가능
- [ ] ADMIN은 전체 인보이스 조회 가능

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | B_Kai (Noah/Codex) | v1.0 초안 작성 — 5개 시나리오 전량 |
| 2026-05-23 | B_Kai (Noah/Codex) | UAT-05-06·07 추가 — 인보이스 링크 + SHIPPER Settlement 접근 권한 |
