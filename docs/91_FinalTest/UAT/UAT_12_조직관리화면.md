# UAT_12 — Admin 조직 관리 화면

> **문서번호**: UAT-12
> **작성일**: 2026-06-09
> **작성자**: D_Kai (OpenCode)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-131 — Admin 조직 정보 관리 화면 구축

---

## [UAT-12-01] CUSTOMS 조직 신규 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/organizations/manage |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정 로그인 (`admin@zenith.kr`) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/organizations/manage | 사이드바 > 조직 관리 > [조직 관리] 메뉴 클릭 | — | 조직 관리 전용 페이지 진입 — 조직 목록 테이블 표시 | ☐ |
| 2 | /ko/admin/organizations/manage | [신규 등록] 버튼 클릭 | — | 등록 모달(또는 폼) 표시 — 조직명·유형(select)·사업자번호·대표자명 입력 필드 | ☐ |
| 3 | /ko/admin/organizations/manage | 조직 정보 입력 후 [등록] 버튼 클릭 | 조직명: `UAT Customs Test` / 유형: `CUSTOMS` / 사업자번호: `123-45-67890` / 대표자명: `홍길동` | "조직이 등록되었습니다." 메시지 표시 | ☐ |
| 4 | /ko/admin/organizations/manage | 목록 확인 | — | 조직 목록에 `UAT Customs Test` 행 표시 — 상태 badge: `ACTIVE` | ☐ |
| 5 | Supabase Studio | `SELECT * FROM zen_organizations WHERE name = 'UAT Customs Test'` | — | `org_type = 'CUSTOMS'`, `status = 'ACTIVE'` 레코드 존재 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] ADMIN만 접근 가능 (타 역할 접근 차단)
- [ ] [신규 등록] 버튼 → 모달 정상 표시
- [ ] CUSTOMS 타입 조직 DB 정상 저장 (org_type·status·created_at)
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-02] DELIVERY 조직 신규 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/organizations/manage |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정 로그인 (`admin@zenith.kr`) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/organizations/manage | [신규 등록] 버튼 클릭 | — | 등록 모달 표시 | ☐ |
| 2 | /ko/admin/organizations/manage | 조직 정보 입력 — 유형 = DELIVERY | 조직명: `UAT Delivery Test` / 유형: `DELIVERY` / 사업자번호: `987-65-43210` / 대표자명: `김철수` | — | ☐ |
| 3 | /ko/admin/organizations/manage | [등록] 버튼 클릭 | — | "조직이 등록되었습니다." 메시지 표시 | ☐ |
| 4 | /ko/admin/organizations/manage | 목록 확인 | — | `UAT Delivery Test` 행 표시 — `org_type` badge = `DELIVERY`, 상태 = `ACTIVE` | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] DELIVERY 타입 조직 DB 정상 저장 (`org_type = 'DELIVERY'`)
- [ ] CUSTOMS(01)와 동일한 UI 패턴으로 정상 동작
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-03] 조직 상태 변경 (ACTIVE → SUSPENDED)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/organizations/manage |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정 로그인, ACTIVE 상태 조직 1건 이상 존재 (UAT-12-01·02로 생성) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/organizations/manage | 대상 조직 행의 상태 액션 버튼(토글/메뉴) 클릭 | — | 상태 변경 옵션 드롭다운 또는 confirm 대화상자 표시 | ☐ |
| 2 | /ko/admin/organizations/manage | [SUSPENDED] 또는 [정지] 옵션 선택 | — | "해당 조직을 정지하시겠습니까?" confirm 대화상자 표시 | ☐ |
| 3 | 확인 대화상자 | [확인] 또는 [예] 클릭 | — | 상태 badge → `SUSPENDED`(red) 전환 | ☐ |
| 4 | /ko/login | SUSPENDED 조직 소속 계정 로그인 시도 | (해당 조직 user 계정) | 로그인 차단 — "조직이 정지되었습니다." 안내 메시지 표시 | ☐ |
| 5 | /ko/admin/organizations/manage | 동일 조직 [ACTIVE]로 복구 | — | 상태 → `ACTIVE` 복원, 해당 조직 사용자 로그인 정상화 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 상태 변경 (ACTIVE ↔ SUSPENDED) 정상 동작
- [ ] SUSPENDED 상태 조직 사용자 로그인 차단 확인
- [ ] ACTIVE 복구 후 사용자 로그인 정상화 확인
- [ ] DB `zen_organizations.status` 컬럼 정상 반영
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-12-04] 조직 목록 필터링 (유형별·상태별 필터 + 검색)

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN |
| 화면 URL | /ko/admin/organizations/manage |
| 예상 소요 시간 | 5분 |
| 사전 조건 | ADMIN 계정 로그인, CUSTOMS·DELIVERY·CARRIER 조직 각 1건 이상 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/organizations/manage | 유형 필터 클릭 → [CUSTOMS] 선택 | — | 목록에 CUSTOMS 타입 조직만 표시 — DELIVERY·CARRIER 행 숨김 | ☐ |
| 2 | /ko/admin/organizations/manage | 유형 필터 초기화 (전체) | — | 전체 조직 목록 복원 | ☐ |
| 3 | /ko/admin/organizations/manage | 상태 필터 클릭 → [ACTIVE] 선택 | — | ACTIVE 상태 조직만 표시 — SUSPENDED 행 숨김 | ☐ |
| 4 | /ko/admin/organizations/manage | 상태 필터 초기화 | — | 전체 목록 복원 | ☐ |
| 5 | /ko/admin/organizations/manage | 검색 입력창에 조직명 입력 | `UAT` | 조직명에 "UAT" 포함된 항목만 필터링 | ☐ |
| 6 | /ko/admin/organizations/manage | 검색어 초기화 | — | 전체 목록 복원 | ☐ |
| 7 | /ko/admin/organizations/manage | 유형·상태·검색 복합 필터 적용 | 유형: CUSTOMS / 상태: ACTIVE / 검색: `Test` | 3개 조건 모두 충족하는 조직만 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 유형 필터 (CUSTOMS / DELIVERY / CARRIER / 전체) 정상 동작
- [ ] 상태 필터 (ACTIVE / SUSPENDED / 전체) 정상 동작
- [ ] 검색 필터 (조직명·사업자번호 부분 일치) 정상 동작
- [ ] 복합 필터 정상 동작
- [ ] 필터 초기화 시 전체 목록 복원
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
