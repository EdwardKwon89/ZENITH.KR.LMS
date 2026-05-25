# UAT_MASTER — ZENITH_LMS 사용자 수용 테스트 마스터

> **문서번호**: UAT-000
> **작성일**: 2026-05-22
> **작성자**: Aiden (Claude, ZEN_CEO)
> **버전**: v1.0

---

## 1. 개요

### 목적
ZENITH_LMS의 전체 기능이 실제 사용자 관점에서 정상 동작함을 검증한다.
자동화 E2E와 달리, 실 사용자가 UI를 직접 조작하며 각 단계별 기대 결과를 확인한다.

### 검증 범위
- 전체 화면 기능 망라 (인증·오더·창고·정산·추적·VOC·마이페이지·어드민)
- 대상 역할: ADMIN · MASTER · MANAGER · SHIPPER 전 역할

### 진행 단계
| 단계 | 환경 | 대상 | 시기 |
|:---:|:-----|:-----|:-----|
| 1차 | 로컬 (`http://localhost:3000`) | 내부 담당자 직접 검증 | E2E 완료 직후 |
| 2차 | 배포 환경 (Vercel + Cloud Supabase) | 실 사용자 UAT | Rate Limiting 완료 후 |

---

## 2. 테스트 환경 설정

### 로컬 환경 (1차)
```bash
# 1. 로컬 Supabase 시작
rtk supabase start

# 2. 개발 서버 시작
rtk npm run dev

# 3. 접속 URL
http://localhost:3000/ko
```

### 배포 환경 (2차)
```
URL: (배포 후 기재)
Supabase: Cloud 프로젝트 연결
```

---

## 3. 테스트 계정

| 역할 | 이메일 | 비밀번호 | 비고 |
|:----:|:------|:---------|:-----|
| ADMIN | `admin@zenith.kr` | `password1234` | 기존 확인 계정 |
| ADMIN (보조) | `admin_e2e@zenith.kr` | `password1234!` | E2E 전용 계정 |
| SHIPPER | `test_corp_1777785263838@zenith.kr` | `password1234` | 기존 확인 계정 |
| SHIPPER (보조) | `shipper@zenith.kr` | `password1234` | audit spec 확인 |
| MASTER | `master@zenith.kr` | `password1234` | ⚠️ UAT 전 계정 생성 필요 |
| MANAGER | `manager@zenith.kr` | `password1234` | ⚠️ UAT 전 계정 생성 필요 |

> ⚠️ MASTER·MANAGER 계정은 1차 UAT 시작 전 ADMIN 계정으로 직접 생성·승인 후 사용

---

## 4. 시나리오 인덱스

| UAT-ID | 시나리오명 | 주요 역할 | 담당 문서 | 작성 Agent | 상태 |
|:------:|:---------|:--------:|:---------|:----------:|:----:|
| UAT-01-01 | 법인 신규 등록 (CREATE) — 다단계 Wizard | SHIPPER | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-06 | 개인회원 가입 | PERSONAL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-07 | 법인 기존 합류 (JOIN) | CORPORATE | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-02 | 로그인 (전 역할) | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-03 | 로그아웃 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-04 | 아이디 찾기 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-05 | 비밀번호 재설정 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-02-01 | 오더 신규 생성 | SHIPPER | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-02 | 오더 목록 조회·검색·필터 | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-03 | 오더 상세 조회 | ADMIN/SHIPPER | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-04 | 오더 상태 전이 — 전체 플로우 | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-05 | HELD 상태 전환 + 원상복구 | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-06 | RETURNED → WAREHOUSED / DISPOSED | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-07 | 오더 취소 (CANCELED) | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-08 | 역할별 상태 변경 권한 분화 | MANAGER/ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-02-09 | 경로 옵션 조회 및 선택 | SHIPPER/ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ |
| UAT-03-01 | 마스터 오더 생성 | MASTER | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ |
| UAT-03-02 | 마스터 오더 목록 조회 | MASTER/ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ |
| UAT-03-03 | dissolve (분리) 실행 + 원자성 확인 | ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ |
| UAT-03-04 | MASTERED 오더 수정 불가 검증 | ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ |
| UAT-04-01 | 재고 목록 조회 | MANAGER/ADMIN | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ |
| UAT-04-02 | 입고 처리 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ |
| UAT-04-03 | 출고 처리 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ |
| UAT-04-04 | 재고 현황 대시보드 확인 | ADMIN | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ |
| UAT-05-01 | 정산 목록 조회 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-02 | 인보이스 생성 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-03 | 인보이스 Excel/PDF 다운로드 | ADMIN/SHIPPER | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-04 | 비용 조회 (finance/costs) | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-05 | 수익 조회 (finance/revenue) | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-06 | 인보이스 상세 링크 이동 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-07 | SHIPPER Settlement 접근 권한 | SHIPPER | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-08 | 단일 carrier 다중 구간 정산 검증 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-05-09 | 다중 carrier 구간별 정산 분리 검증 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ |
| UAT-06-01 | 배송 추적 조회 | SHIPPER | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ |
| UAT-06-02 | 스케줄 목록 조회 | ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ |
| UAT-06-03 | 스케줄 등록 | ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ |
| UAT-06-04 | SHIPPER vs ADMIN 추적 범위 | SHIPPER/ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ |
| UAT-07-01 | VOC 접수 | SHIPPER | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-07-02 | VOC 처리 (ADMIN 답변) | ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-07-03 | FAQ 조회 | ALL | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-07-04 | 공지사항 조회 | ALL | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-07-05 | QnA 문의 등록 + 답변 | SHIPPER/ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-07-06 | ADMIN VOC 접수 제한 | ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ |
| UAT-08-01 | 프로필 조회·수정 | ALL | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-08-02 | 비밀번호 변경 | ALL | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-08-03 | 통관 정보 설정 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-08-04 | 법인 정보 등록 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-08-05 | 등급 조회 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-08-06 | ADMIN 마이페이지 접근 차단 | ADMIN | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ |
| UAT-09-01 | 조직 승인·거부 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-02 | 권한(역할) 변경 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-03 | 요율 설정 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-04 | 운송 비용 설정 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-05 | 통계 조회 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-06 | 오류 로그 조회 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-07 | 코드 관리 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-08 | 업그레이드 요청 처리 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-09 | REJECTED 사용자 로그인 차단 | ADMIN/SHIPPER | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-10 | 자기 자신 역할 변경 제한 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-09-11 | SCR-091 회원 관리 전용 화면 (등급 변경·정지) | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ |
| UAT-01-08 | 세션 Idle Timeout 자동 로그아웃 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-01-09 | SUSPENDED 계정 접근 차단 | ADMIN/SUSPENDED | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ |
| UAT-02-10 | 특수화물 유형 기재 + 조회 | SHIPPER/ADMIN | [UAT_02](UAT_02_오더관리.md) | Riley | ✅ |
| UAT-04-05 | SCR-040 입고 처리 전용 화면 (바코드·검수) | MANAGER | [UAT_04](UAT_04_창고_재고.md) | Riley | ✅ |
| UAT-04-06 | SCR-041 출고 처리 + 운송장 PDF 출력 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | B_Kai | ✅ |
| UAT-04-07 | SCR-031 오더 패킹 리스트 화면 | MASTER/ADMIN | [UAT_04](UAT_04_창고_재고.md) | B_Kai | ✅ |
| UAT-10-01 | 경로 옵션 3종 조회 (COST·TIME·BALANCED) | ADMIN/SHIPPER | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-10-02 | 최적 경로 선택 및 오더 적용 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-10-03 | Composite Pricing 항목별 금액 확인 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-10-04 | 요율 카드 등록·수정·삭제 (ADMIN) | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-10-05 | 경로 재산출 (오더 변경 후) | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-10-06 | 라우팅 결과 경로 시각화 확인 | ADMIN/SHIPPER | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ |
| UAT-11-01 | 직항 경로 조회 및 비용 확인 | ADMIN/SHIPPER | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-02 | Hub 경유 경로 조회 및 세그먼트별 비용 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-03 | Hub 경로 선택 후 오더 생성 및 경유지 표시 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-04 | 환적 상태 추적 — 레그별 이벤트 등록 및 조회 | ADMIN/SHIPPER | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-05 | 개인정보 활용동의 미체크 시 회원가입 차단 확인 | PERSONAL | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-06 | Rate Limiting — 로그인 반복 시 429 응답 확인 | ALL | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |
| UAT-11-07 | Hub 경유 세그먼트별 캐리어 요율 분리 정산 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | 🔔 |

**총 79개 시나리오** | 작성 완료: **79 / 79 ✅ 전량 완료**

---

## 5. 합격 기준 (Acceptance Criteria)

### 시나리오 단위
- 전 단계 ☑ 체크 완료
- 기대 결과와 실제 결과 일치
- 오류 메시지·500 에러 없음

### 전체 UAT 합격 조건
| 등급 | 기준 |
|:----:|:-----|
| PASS | Critical·High 결함 0건, 전체 시나리오 100% 완료 |
| 조건부 PASS | Critical 0건 + High 결함 수정 계획 수립 |
| FAIL | Critical 결함 1건 이상 |

---

## 6. 결함 분류 기준

| 심각도 | 정의 | 예시 |
|:------:|:-----|:-----|
| Critical | 시스템 사용 불가·데이터 손실·보안 취약 | 로그인 불가, 오더 저장 실패, 권한 우회 |
| High | 핵심 업무 기능 오동작 | 상태 전이 오류, 정산 금액 불일치 |
| Medium | 부가 기능 오동작·UI 오류 | 필터 미작동, 날짜 형식 오류 |
| Low | 미관·문구 오류 | 오탈자, 레이아웃 경미한 깨짐 |

---

## 7. 결함 관리 원장

> 각 시나리오 문서에서 발견된 결함을 아래 원장에 취합하여 관리한다.

| 결함-ID | 발견일 | UAT-ID | 단계 | 현상 | 심각도 | 상태 | 담당 |
|:-------:|:------|:------:|:---:|:-----|:------:|:----:|:----:|
| — | — | — | — | — | — | — | — |

---

## 8. 시나리오 문서 작성 템플릿

> 각 UAT_0N 문서는 아래 템플릿을 반복 사용하여 작성한다.

```markdown
## [UAT-NN-NN] 시나리오명

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN / SHIPPER / MASTER / MANAGER |
| 화면 URL | /ko/orders |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 로그인 상태, 오더 1건 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/login | 이메일·비밀번호 입력 후 '로그인' 클릭 | admin@zenith.kr / password1234 | 대시보드로 이동 | ☐ |
| 2 | /ko/orders | 오더 목록 확인 | — | 오더 테이블 정상 표시 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 오류 메시지 없음
- [ ] (시나리오별 추가 기준)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
```

---

## 9. 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | Aiden (Claude) | v1.0 초안 작성 — 테스트 계정·인덱스 46개·합격기준·템플릿 정의 |
| 2026-05-22 | B_Kai (OpenCode) | 인덱스 45개 갱신 (TASK-058·059·061·062 작성 완료 반영) |
| 2026-05-24 | Riley (Gemini) | TASK-081 — UAT-02-10 특수화물 및 UAT-04-05 입고처리 UAT 절차서 작성 완료, 총계 67개 갱신 |
| 2026-05-24 | B_Kai (OpenCode) | TASK-077 🔔 완료 — 27de276 · 220/220 · 10파일 914줄. rate-cards page + Server Actions + NaviSidebar + i18n 전량 구현 |
| 2026-05-23 | D_Kai (OpenCode) | TASK-064 — UAT-01-01 비고 갱신·UAT-01-06·01-07·07-06·08-06·09-09·09-10 6개 행 추가, 총계 56개 갱신 |
| 2026-05-23 | B_Kai (Noah/Codex) | TASK-066 — UAT-02-09·05-08·05-09 3개 행 추가, 총계 59개 갱신 |
| 2026-05-23 | Aiden (Claude) | 누락 기능 UAT 7건 추가 (UAT-01-08·09, UAT-02-10, UAT-04-05·06·07, UAT-09-11) + 지능형 라우팅 UAT_10 신규 6건 추가, 총계 72개 갱신 |
| 2026-05-24 | D_Kai (OpenCode) | TASK-083 — UAT-01-08·09·09-11 절차서 완성 (IMP-071·072·077 반영), 총계 68개 갱신 |
| 2026-05-24 | B_Kai (OpenCode) | TASK-082 — UAT-04-06·04-07 절차서 완성 (IMP-074·075 반영), 총계 70개 갱신 |
| 2026-05-25 | B_Kai (OpenCode) | TASK-095 — UAT-11 신규 6개 시나리오 추가 (UAT-11-01~06), 총계 78개 갱신 |
| 2026-05-25 | B_Kai (OpenCode) | TASK-097 — UAT-11-03 쿼리 오류 수정, UAT-11-04 비고 추가, UAT-11-07 신규 (IMP-086), 총계 79개 갱신 |
