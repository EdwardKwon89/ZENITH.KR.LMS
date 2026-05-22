# UAT_03 — 마스터 오더 분리

> **문서번호**: UAT-03
> **작성일**: 2026-05-22
> **작성자**: B_Kai (Noah/Codex)
> **버전**: v1.0

---

## [UAT-03-01] 마스터 오더 생성

| 항목 | 내용 |
|:----|:----|
| 역할 | MASTER / ADMIN |
| 화면 URL | /ko/login → /ko/master-orders |
| 예상 소요 시간 | 10분 |
| 사전 조건 | MASTER(`master@zenith.kr`) 또는 ADMIN(`admin@zenith.kr`) 계정 로그인 상태, REGISTERED 상태 하우스 오더 2건 이상 존재 (동일 출발지·도착지) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/master-orders | 마스터 오더 페이지 접속 | — | 'Active Master Registry' 테이블 + 'Batch Master Generation Tool' 섹션 표시 | ☐ |
| 2 | /ko/master-orders | 통계 카드 확인 | — | 'Active Master' 수와 'Pending House' 수가 정수로 표시 | ☐ |
| 3 | /ko/master-orders | Batch Master Generation Tool에서 출발지 필터 선택 | Origin Port Filter → 'ICN' 선택 | 해당 출발지의 하우스 오더만 테이블에 표시 | ☐ |
| 4 | /ko/master-orders | 도착지 필터 선택 | Destination Port Filter → 'LAX' 선택 | 출발지 ICN + 도착지 LAX 조건에 맞는 하우스 오더만 표시 | ☐ |
| 5 | /ko/master-orders | 하우스 오더 2건 선택 | 첫 번째 체크박스 클릭 + 두 번째 체크박스 클릭 | 선택된 행에 파란색 하이라이트, CREATE MASTER 버튼에 선택 건수 표시 | ☐ |
| 6 | /ko/master-orders | 'CREATE MASTER (2)' 버튼 클릭 | — | 마스터 오더 생성 완료 토스트 표시, Active Master Registry에 새 마스터 오더 행 추가 | ☐ |
| 7 | /ko/master-orders | 생성된 마스터 오더 확인 | Active Master Registry 테이블에서 새 행 확인 | master_no(형식: "M-YYMMDD-NNNN")·경로(ICN→LAX)·House Count(2)·Weight(합계)·상태(CREATED) 표시 | ☐ |
| 8 | /ko/master-orders | Batch Master Generation Tool에서 선택한 오더 사라짐 확인 | — | 해당 하우스 오더가 Batch Master Generation Tool 목록에서 제거됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 마스터 오더 생성 완료 (toast + 테이블 갱신)
- [ ] 하우스 오더 상태가 'MASTERED'로 변경 (오더 상세 페이지에서 확인)
- [ ] 선택된 하우스 오더가 Batch Master Generation Tool 목록에서 제거

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-03-02] 마스터 오더 목록 조회

| 항목 | 내용 |
|:----|:----|
| 역할 | MASTER / ADMIN |
| 화면 URL | /ko/login → /ko/master-orders |
| 예상 소요 시간 | 5분 |
| 사전 조건 | MASTER(`master@zenith.kr`) 또는 ADMIN(`admin@zenith.kr`) 계정 로그인 상태, 마스터 오더 1건 이상 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/master-orders | 마스터 오더 페이지 접속 | — | Active Master Registry 테이블 정상 표시 | ☐ |
| 2 | /ko/master-orders | Master Info 컬럼 확인 | — | master_no·운송사 IATA 코드·Transport Mode 배지·생성일자 표시 | ☐ |
| 3 | /ko/master-orders | Port/Route 컬럼 확인 | — | 출발지(ICN/공항명) → 도착지(LAX/공항명) 형식으로 표시 | ☐ |
| 4 | /ko/master-orders | Aggregation 컬럼 확인 | — | House 건수(정수) + 총 중량(kg) 표시 | ☐ |
| 5 | /ko/master-orders | Status 컬럼 확인 | — | 상태 배지(파란색, 대문자) 표시 (예: CREATED) | ☐ |
| 6 | /ko/master-orders | Tools 컬럼 확인 | — | Manifest(파란색)·Barcode(다크)·Dissolve(빨간색) 아이콘 버튼 3개 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] 마스터 오더 목록의 모든 컬럼 정상 표시
- [ ] 빈 상태일 경우 "No master orders have been created." 메시지 표시

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-03-03] dissolve(분리) 실행 + 원자성 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/login → /ko/master-orders |
| 예상 소요 시간 | 8분 |
| 사전 조건 | ADMIN 계정(`admin@zenith.kr`) 로그인 상태, 마스터 오더 1건 존재 (최소 2개 하우스 오더 바인딩) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/master-orders | Active Master Registry에서 대상 마스터 오더 확인 | — | dissolve 대상 마스터 오더의 master_no 확인 | ☐ |
| 2 | /ko/master-orders | Dissolve(빨간 Trash2) 아이콘 버튼 클릭 | — | 브라우저 confirm() 다이얼로그 표시 ("[경고] 마스터 오더 XXX를 해체하시겠습니까? 모든 하우스 오더가 개별 수정 가능 상태로 복구됩니다.") | ☐ |
| 3 | — | confirm 다이얼로그 '확인' 클릭 | — | Dissolve 버튼에 스피너 표시, 서버 요청 진행 | ☐ |
| 4 | — | dissolve 완료 대기 | — | 토스트 "{master_no} dissolution complete" 표시 | ☐ |
| 5 | /ko/master-orders | Active Master Registry에서 마스터 오더 제거 확인 | — | dissolve된 마스터 오더가 테이블에서 사라짐 | ☐ |
| 6 | /ko/orders | 하우스 오더 상태 확인 | 상태 필터 → 'REGISTERED' | 이전에 바인딩되었던 하우스 오더가 REGISTERED 상태로 표시 | ☐ |
| 7 | /ko/master-orders | Batch Master Generation Tool에서 하우스 오더 복귀 확인 | — | dissolve된 하우스 오더가 다시 선택 가능한 상태로 표시 | ☐ |
| 8 | /ko/master-orders | Dissolve 취소 테스트 | 다른 마스터 오더의 Dissolve 버튼 클릭 → confirm 다이얼로그 '취소' 클릭 | 마스터 오더 유지, 변경 없음 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] dissolve 완료 후 마스터 오더가 테이블에서 제거
- [ ] 하우스 오더 전량 `master_order_id = NULL` + `status = 'REGISTERED'`로 복구
- [ ] 하우스 오더가 Batch Master Generation Tool에서 재선택 가능
- [ ] dissolve 취소 시 마스터 오더 변경 없음
- [ ] (선택) DB 직접 조회 시 `zen_master_order_history`에 해체 이력 기록 확인

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | B_Kai (Noah/Codex) | v1.0 초안 작성 — 3개 시나리오 전량 |
