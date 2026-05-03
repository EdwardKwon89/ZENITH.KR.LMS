# Task List - PH14-E2E-03 (마스터 오더 편성 및 창고 입출고)

- `[x]` **PH14-E2E-03-01: 사전 데이터 준비 (Preparation)**
    - [x] `zen_orders` 테이블에 `PACKED` 상태의 하우스 오더 2건 생성 (ICN -> LAX)
    - [x] DB 조회를 통한 데이터 생성 확인
    - **수행 주체**: Riley (Worker) / **검증 주체**: Riley (Auditor)

- `[/]` **PH14-E2E-03-02: 마스터 오더 생성 (Master Order Grouping)**
    - [ ] 어드민 계정(`temp_admin@zenith.kr`) 로그인
    - [ ] `/ko/master-orders` 페이지 접속 및 필터링 (ICN, LAX)
    - [ ] 하우스 오더 2건 선택 및 'CREATE MASTER' 실행
    - [ ] 마스터 오더 번호(Z-MST-XXXX) 생성 확인
    - **수행 주체**: Riley (Worker) / **검증 주체**: Aiden (Auditor)

- `[ ]` **PH14-E2E-03-03: 창고 입고 처리 (Warehouse Inbound)**
    - [ ] `/ko/inventory` 페이지 이동
    - [ ] 마스터 오더 입고 스캔 시뮬레이션
    - [ ] 상태 `WAREHOUSED` 전이 확인
    - **수행 주체**: Riley (Worker) / **검증 주체**: Aiden (Auditor)

- `[ ]` **PH14-E2E-03-04: 창고 출고 처리 (Warehouse Outbound)**
    - [ ] `/ko/inventory` 페이지에서 출고 스캔 실행
    - [ ] 상태 `IN_TRANSIT` 전이 확인
    - **수행 주체**: Riley (Worker) / **검증 주체**: Aiden (Auditor)

- `[ ]` **PH14-E2E-03-05: 최종 검증 및 회귀 테스트**
    - [ ] `rtk npm run test:regression` 수행 (R-08)
    - [ ] `LIVE_REGRESSION_TEST_MAP.md` 업데이트 (R-09)
    - [ ] UI 구동 스크린샷 정리 및 보고 (R-10)
    - **수행 주체**: Riley (Worker) / **검증 주체**: AuditAgent (Auditor)
