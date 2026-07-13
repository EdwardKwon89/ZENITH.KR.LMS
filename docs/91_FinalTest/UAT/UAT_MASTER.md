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
| SHIPPER | `uat02_corp_shipper@zenith.kr` | `password1234` | 기존 확인 계정 |
| SHIPPER (보조) | `shipper@zenith.kr` | `password1234` | audit spec 확인 |
| MASTER | `master@zenith.kr` | `password1234` | ⚠️ UAT 전 계정 생성 필요 |
| MANAGER | `manager@zenith.kr` | `password1234` | ⚠️ UAT 전 계정 생성 필요 |

> ⚠️ MASTER·MANAGER 계정은 1차 UAT 시작 전 ADMIN 계정으로 직접 생성·승인 후 사용

---

## 4. 시나리오 인덱스

> **구분 기준** — `필수`: 핵심 비즈니스 플로우·보안·데이터 정합성·Phase K 신규 (38개, 추후 UAT 매 사이클 실행) | `일반`: 부가 기능·엣지케이스 (41개, Full UAT 시에만)

| UAT-ID | 시나리오명 | 주요 역할 | 담당 문서 | 작성 Agent | 상태 | 구분 |
|:------:|:---------|:--------:|:---------|:----------:|:----:|:----:|
| UAT-01-01 | 법인 신규 등록 (CREATE) — 다단계 Wizard | SHIPPER | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-01-06 | 개인회원 가입 | PERSONAL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 일반 |
| UAT-01-07 | 법인 기존 합류 (JOIN) | CORPORATE | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 일반 |
| UAT-01-02 | 로그인 (전 역할) | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-01-03 | 로그아웃 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 일반 |
| UAT-01-04 | 아이디 찾기 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-01-05 | 비밀번호 재설정 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-01-08 | 세션 Idle Timeout 자동 로그아웃 | ALL | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-01-09 | SUSPENDED 계정 접근 차단 | ADMIN/SUSPENDED | [UAT_01](UAT_01_인증_회원가입.md) | D_Kai | ✅ | 필수 |
| UAT-02-01 | 오더 신규 생성 | SHIPPER | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 필수 |
| UAT-02-02 | 오더 목록 조회·검색·필터 | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-03 | 오더 상세 조회 | ADMIN/SHIPPER | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-04 | 오더 상태 전이 — 전체 플로우 (REGISTERED→DELIVERED) | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 필수 |
| UAT-02-05 | HELD 상태 전환 + 원상복구 | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-06 | RETURNED → WAREHOUSED / DISPOSED | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-07 | 오더 취소 (CANCELED) | ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-08 | 역할별 상태 변경 권한 분화 | MANAGER/ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 일반 |
| UAT-02-09 | 경로 옵션 조회 및 선택 | SHIPPER/ADMIN | [UAT_02](UAT_02_오더관리.md) | B_Kai | ✅ | 필수 |
| UAT-02-10 | 특수화물 유형 기재 + 조회 | SHIPPER/ADMIN | [UAT_02](UAT_02_오더관리.md) | Riley | ✅ | 일반 |
| UAT-03-01 | 마스터 오더 생성 | MASTER | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ | 필수 |
| UAT-03-02 | 마스터 오더 목록 조회 | MASTER/ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ | 일반 |
| UAT-03-03 | dissolve (분리) 실행 + 원자성 확인 | ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ | 필수 |
| UAT-03-04 | MASTERED 오더 수정 불가 검증 | ADMIN | [UAT_03](UAT_03_마스터오더_분리.md) | B_Kai | ✅ | 일반 |
| UAT-04-01 | 재고 목록 조회 | MANAGER/ADMIN | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ | 일반 |
| UAT-04-02 | 입고 처리 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ | 필수 |
| UAT-04-03 | 출고 처리 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ | 필수 |
| UAT-04-04 | 재고 현황 대시보드 확인 | ADMIN | [UAT_04](UAT_04_창고_재고.md) | D_Kai | ✅ | 일반 |
| UAT-04-05 | SCR-040 입고 처리 전용 화면 (바코드·검수) | MANAGER | [UAT_04](UAT_04_창고_재고.md) | Riley | ✅ | 필수 |
| UAT-04-06 | SCR-041 출고 처리 + 운송장 PDF 출력 | MANAGER | [UAT_04](UAT_04_창고_재고.md) | B_Kai | ✅ | 필수 |
| UAT-04-07 | SCR-031 오더 패킹 리스트 화면 | MASTER/ADMIN | [UAT_04](UAT_04_창고_재고.md) | B_Kai | ✅ | 일반 |
| UAT-05-01 | 정산 목록 조회 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 일반 |
| UAT-05-02 | 인보이스 생성 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 필수 |
| UAT-05-03 | 인보이스 Excel/PDF 다운로드 | ADMIN/SHIPPER | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 필수 |
| UAT-05-04 | 비용 조회 (finance/costs) | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 일반 |
| UAT-05-05 | 수익 조회 (finance/revenue) | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 일반 |
| UAT-05-06 | 인보이스 상세 링크 이동 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 일반 |
| UAT-05-07 | SHIPPER Settlement 접근 권한 | SHIPPER | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 일반 |
| UAT-05-08 | 단일 carrier 다중 구간 정산 검증 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 필수 |
| UAT-05-09 | 다중 carrier 구간별 정산 분리 검증 | ADMIN | [UAT_05](UAT_05_정산_인보이스.md) | B_Kai | ✅ | 필수 |
| UAT-06-01 | 배송 추적 조회 | SHIPPER | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ | 필수 |
| UAT-06-02 | 스케줄 목록 조회 | ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ | 일반 |
| UAT-06-03 | 스케줄 등록 | ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ | 일반 |
| UAT-06-04 | SHIPPER vs ADMIN 추적 범위 | SHIPPER/ADMIN | [UAT_06](UAT_06_추적_스케줄.md) | B_Kai | ✅ | 일반 |
| UAT-07-01 | VOC 접수 | SHIPPER | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 필수 |
| UAT-07-02 | VOC 처리 (ADMIN 답변) | ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 필수 |
| UAT-07-03 | FAQ 조회 | ALL | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 일반 |
| UAT-07-04 | 공지사항 조회 | ALL | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 일반 |
| UAT-07-05 | QnA 문의 등록 + 답변 | SHIPPER/ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 일반 |
| UAT-07-06 | ADMIN VOC 접수 제한 | ADMIN | [UAT_07](UAT_07_VOC_고객지원.md) | D_Kai | ✅ | 일반 |
| UAT-08-01 | 프로필 조회·수정 | ALL | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 필수 |
| UAT-08-02 | 비밀번호 변경 | ALL | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 일반 |
| UAT-08-03 | 통관 정보 설정 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 일반 |
| UAT-08-04 | 법인 정보 등록 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 필수 |
| UAT-08-05 | 등급 조회 | SHIPPER | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 일반 |
| UAT-08-06 | ADMIN 마이페이지 접근 차단 | ADMIN | [UAT_08](UAT_08_마이페이지.md) | D_Kai | ✅ | 일반 |
| UAT-09-01 | 조직 승인·거부 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 필수 |
| UAT-09-02 | 권한(역할) 변경 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 필수 |
| UAT-09-03 | 요율 설정 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-04 | 운송 비용 설정 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-05 | 통계 조회 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-06 | 오류 로그 조회 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-07 | 코드 관리 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-08 | 업그레이드 요청 처리 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-09-09 | REJECTED 사용자 로그인 차단 | ADMIN/SHIPPER | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 필수 |
| UAT-09-10 | 자기 자신 역할 변경 제한 | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 필수 |
| UAT-09-11 | SCR-091 회원 관리 전용 화면 (등급 변경·정지) | ADMIN | [UAT_09](UAT_09_어드민_운영.md) | D_Kai | ✅ | 일반 |
| UAT-10-01 | 경로 옵션 3종 조회 (COST·TIME·BALANCED) | ADMIN/SHIPPER | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 필수 |
| UAT-10-02 | 최적 경로 선택 및 오더 적용 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 필수 |
| UAT-10-03 | Composite Pricing 항목별 금액 확인 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 필수 |
| UAT-10-04 | 요율 카드 등록·수정·삭제 (ADMIN) | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 일반 |
| UAT-10-05 | 경로 재산출 (오더 변경 후) | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 일반 |
| UAT-10-06 | 라우팅 결과 경로 시각화 확인 | ADMIN/SHIPPER | [UAT_10](UAT_10_지능형라우팅_운임.md) | D_Kai | ✅ | 일반 |
| UAT-10-07 | TISA Dashboard 역할별 표시 (Admin/Shipper/Fallback) | ADMIN/SHIPPER | [UAT_10](UAT_10_지능형라우팅_운임.md) | B_Kai | 🔄 | 일반 |
| UAT-10-08 | Weight Slab max_charge 상한선 적용 검증 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | B_Kai | ✅ | 일반 |
| UAT-10-09 | CBM Slab max_charge 상한선 적용 검증 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | B_Kai | ✅ | 일반 |
| UAT-10-10 | max_charge 미설정 시 정상 운임 적용 확인 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | B_Kai | ✅ | 일반 |
| UAT-10-11 | TISA 스냅샷 8개 신규 컬럼 저장 검증 | ADMIN | [UAT_10](UAT_10_지능형라우팅_운임.md) | B_Kai | ✅ | 일반 |
| UAT-11-01 | 직항 경로 조회 및 비용 확인 | ADMIN/SHIPPER | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-02 | Hub 경유 경로 조회 및 세그먼트별 비용 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-03 | Hub 경로 선택 후 오더 생성 및 경유지 표시 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-04 | 환적 상태 추적 — 레그별 이벤트 등록 및 조회 | ADMIN/SHIPPER | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-05 | 개인정보 활용동의 미체크 시 회원가입 차단 확인 | PERSONAL | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-06 | Rate Limiting — 로그인 반복 시 429 응답 확인 | ALL | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-11-07 | Hub 경유 세그먼트별 캐리어 요율 분리 정산 확인 | ADMIN | [UAT_11](UAT_11_Hub라우팅및P0항목.md) | B_Kai | ✅ | 필수 |
| UAT-12-01 | Carrier 요율 등록 및 오더 생성 (운송 서비스 선택) | ADMIN/CARRIER/SHIPPER | [UAT_12](UAT_P6_서비스요율_멀티배정.md) | Riley | ✅ | 필수 |
| UAT-12-02 | Customs Broker 요율 등록 및 오더 생성 (항공 + 통관 서비스 선택) | CUSTOMS_BROKER/SHIPPER | [UAT_12](UAT_P6_서비스요율_멀티배정.md) | Riley | ✅ | 필수 |
| UAT-12-03 | Delivery Agent 요율 등록(LOCAL+TOTAL) 및 오더 생성 (배송 서비스 선택) | DELIVERY_AGENT/SHIPPER | [UAT_12](UAT_P6_서비스요율_멀티배정.md) | Riley | ✅ | 필수 |
| UAT-12-04 | 역할별 오더 목록 조회 격리 (RLS 검증) | SHIPPER/PARTNERS/ADMIN | [UAT_12](UAT_P6_서비스요율_멀티배정.md) | Riley | ✅ | 필수 |
| UAT-12-05 | 서비스 미지원 시 오더 등록 차단 및 경고 배너 검증 | SHIPPER | [UAT_12](UAT_P6_서비스요율_멀티배정.md) | Riley | ✅ | 필수 |
| UAT-12-06 | CUSTOMS 조직 신규 등록 | ADMIN | [UAT_12](UAT_12_조직관리화면.md) | D_Kai | ✅ | 일반 |
| UAT-12-07 | DELIVERY 조직 신규 등록 | ADMIN | [UAT_12](UAT_12_조직관리화면.md) | D_Kai | ✅ | 일반 |
| UAT-12-08 | 조직 상태 변경 (ACTIVE → SUSPENDED → ACTIVE) | ADMIN | [UAT_12](UAT_12_조직관리화면.md) | D_Kai | ✅ | 일반 |
| UAT-12-09 | 조직 목록 필터링 (유형·상태·검색 복합) | ADMIN | [UAT_12](UAT_12_조직관리화면.md) | D_Kai | ✅ | 일반 |
| UAT-13-01 | 주소록 신규 등록 | SHIPPER | [UAT_13](UAT_13_주소록.md) | Riley | 🔄 | 필수 |
| UAT-13-02 | 주소록 목록 조회 및 정렬 | SHIPPER | [UAT_13](UAT_13_주소록.md) | Riley | 🔄 | 일반 |
| UAT-13-03 | 주소록 항목 수정 | SHIPPER | [UAT_13](UAT_13_주소록.md) | Riley | 🔄 | 일반 |
| UAT-13-04 | 주소록 항목 삭제 | SHIPPER | [UAT_13](UAT_13_주소록.md) | Riley | 🔄 | 일반 |
| UAT-13-05 | 기본 배송지 설정 및 자동 단일화 | SHIPPER | [UAT_13](UAT_13_주소록.md) | Riley | 🔄 | 필수 |
| UAT-14-01 | 일일 출고 내역 집계 | ADMIN | [UAT_14](UAT_14_일마감.md) | Riley | 🔄 | 필수 |
| UAT-14-02 | 일일 매출/매입/마진 집계 및 마진율 | ADMIN | [UAT_14](UAT_14_일마감.md) | Riley | 🔄 | 필수 |
| UAT-14-03 | 기간별 마감 이력 조회 및 일자별 그룹핑 | ADMIN | [UAT_14](UAT_14_일마감.md) | Riley | 🔄 | 필수 |
| UAT-14-04 | 출고 데이터가 없는 날의 집계 처리 | ADMIN | [UAT_14](UAT_14_일마감.md) | Riley | 🔄 | 일반 |
| UAT-14-05 | 일마감 데이터 권한 검증 | ALL | [UAT_14](UAT_14_일마감.md) | Riley | 🔄 | 필수 |
| UAT-15-01 | Agency의 하위 화주(Shipper) 신규 등록 | AGENCY | [UAT_15](UAT_15_Agency화주관리.md) | Riley | 🔄 | 필수 |
| UAT-15-02 | Agency 하위 화주 목록 조회 및 소속 검증 | AGENCY | [UAT_15](UAT_15_Agency화주관리.md) | Riley | 🔄 | 필수 |
| UAT-15-03 | Agency 화주 등급 수정 | AGENCY | [UAT_15](UAT_15_Agency화주관리.md) | Riley | 🔄 | 일반 |
| UAT-16-01 | 대리점 요율 오버라이드 신규 등록 | AGENCY | [UAT_16](UAT_16_Agency요율오버라이드.md) | Riley | 🔄 | 필수 |
| UAT-16-02 | 대리점 요율 오버라이드 목록 조회 및 RLS 검증 | AGENCY | [UAT_16](UAT_16_Agency요율오버라이드.md) | Riley | 🔄 | 필수 |
| UAT-16-03 | 대리점 요율 오버라이드 비활성화 (Deactivate) | AGENCY | [UAT_16](UAT_16_Agency요율오버라이드.md) | Riley | 🔄 | 일반 |
| UAT-17-01 | 직접배송(DIRECT) 선택 오더 등록 및 픽업 입력 차단 검증 | SHIPPER/ADMIN | [UAT_17](UAT_17_UPS특송오더발송.md) | Riley | ✅ | 필수 |
| UAT-17-02 | 픽업배송(PICKUP) 선택 오더 등록 및 픽업 필수값 유효성 검증 | SHIPPER/ADMIN | [UAT_17](UAT_17_UPS특송오더발송.md) | Riley | ✅ | 필수 |
| UAT-17-03 | 대리점 화주 요율 오버라이드가 적용된 UPS 요금 계산 검증 | SHIPPER | [UAT_17](UAT_17_UPS특송오더발송.md) | Riley | 🔄 | 필수 |
| UAT-18-01 | WAREHOUSED 오더 출고 완료 시 UPS 발송 연계 흐름 | MANAGER/ADMIN | [UAT_18](UAT_18_창고출고UPS연계.md) | Riley | ✅ | 필수 |
| UAT-18-02 | UPS 발송 정보 자동 매핑 및 RLS 격리 검증 | SHIPPER | [UAT_18](UAT_18_창고출고UPS연계.md) | Riley | ✅ | 일반 |
| UAT-19-01 | UPS 오더 상세 화면에서 간이 인보이스 PDF 출력(미리보기) 검증 | SHIPPER/ADMIN | [UAT_19](UAT_19_UPS인보이스PDF.md) | Riley | 🔄 | 일반 |
| UAT-19-02 | 인보이스 PDF 다운로드 파일명 및 물류 상세 항목 무결성 검증 | SHIPPER/ADMIN | [UAT_19](UAT_19_UPS인보이스PDF.md) | Riley | 🔄 | 필수 |
| UAT-20-01 | 대리점 정산 요약 정보 확인 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Riley | 🔄 | 필수 |
| UAT-20-02 | 대리점 하위 화주별 정산 목록 조회 및 필터링 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Riley | 🔄 | 필수 |
| UAT-20-03 | 대리점 정산 데이터 CSV 내보내기 (Export) | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Riley | 🔄 | 일반 |
| UAT-20-04 | 대리점 정산 오더번호 검색 — 일치 결과 표시 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Baker | 🔄 | 일반 |
| UAT-20-05 | 대리점 정산 오더번호 검색 — 결과 없음 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Baker | 🔄 | 일반 |
| UAT-20-06 | 대리점 정산 Reconciliation 알림 — 미가격 오더 존재 시 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Baker | 🔄 | 일반 |
| UAT-20-07 | 대리점 정산 Reconciliation — 미가격 오더 미존재 시 알림 미표시 | AGENCY | [UAT_20](UAT_20_Agency정산조회.md) | Baker | 🔄 | 일반 |
| UAT-22-01 | UPS Zone 등록 및 국가 매핑 | ADMIN | [UAT_22](UAT_22_UPS요율Admin등록.md) | D_Kai | ⬜ | 일반 |
| UAT-22-02 | UPS 기준요금 조회 | ADMIN | [UAT_22](UAT_22_UPS요율Admin등록.md) | D_Kai | ⬜ | 일반 |
| UAT-22-03 | UPS 유류할증 및 부가요금 조회 (신규 4종 포함) | ADMIN | [UAT_22](UAT_22_UPS요율Admin등록.md) | D_Kai | ⬜ | 일반 |
| UAT-23-01 | Admin 대리점 할인율 정책 등록 | ADMIN | [UAT_23](UAT_23_UPS_Agency할인율정책.md) | D_Kai | ⬜ | 일반 |
| UAT-23-02 | AGENCY 계정 cost_price 읽기전용 확인 및 자동계산 검증 | AGENCY | [UAT_23](UAT_23_UPS_Agency할인율정책.md) | D_Kai | ⬜ | 일반 |
| UAT-23-03 | 할인율 정책 미등록 시 에러 메시지 확인 | AGENCY | [UAT_23](UAT_23_UPS_Agency할인율정책.md) | D_Kai | ⬜ | 일반 |

**총 129개 시나리오** | 작성 완료: **129 / 129 ✅ 전량 완료** | 필수: **60개** | 일반: **69개**

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
| 2026-05-26 | Aiden (Claude) | 필수/일반 구분 컬럼 추가 — 필수 38개·일반 41개. UAT-01~10 도메인별 재정렬(UAT-01-08·09, UAT-02-10 순서 정합). TASK-096 전제조건·상태·UAT-11-07 행 현행화 |
| 2026-05-26 | Aiden (Claude) | UAT-11-01~07 상태 🔔→✅ 정정 — TASK-095·097 Aiden ✅ PASS 반영 누락분 보완 |
| 2026-06-07 | Riley (Gemini) | TASK-120 — Phase 6 UAT 시나리오 5종 (UAT-12-01~05) 추가 및 인덱스 갱신, 총계 85개 갱신 |
| 2026-06-09 | B_Kai (OpenCode) | TASK-126 — IMP-108 max_charge 시나리오 3종(UAT-10-08~10) + IMP-107 TISA 스냅샷 시나리오 1종(UAT-10-11) 추가, 총계 89개 갱신 |
| 2026-06-18 | Riley (Gemini) | TASK-155 — 주소록(UAT-13-01~05) 및 일마감(UAT-14-01~05) 신규 10개 시나리오 추가, 총계 103개 갱신 |
| 2026-06-19 | Riley (Gemini) | TASK-161 — Phase 7 UPS 특송 6개 기능 UAT 시나리오 신규 추가 (UAT-15 ~ 20), 총계 119개 갱신 |
| 2026-06-21 | Baker (Big Pickle) | TASK-B-013 — SPR-06 시나리오 4건 추가 (UAT-20-04~07): 오더번호 검색 2건 + Reconciliation 알림 2건, 총계 123개 갱신 |
| 2026-07-06 | Aiden (Claude) | GH#205 — 개별 UAT 파일 내부 실행 상태(UAT-17-01/02, 18-01/02 각 파일 전 단계 ☑ 확인)가 마스터 인덱스에 반영되지 않고 전체 🔄로 표기되어 있던 것을 ✅로 정정. UAT-17-03은 Team B #181(오더 연동) 완료 전 실행 불가 상태라 🔄 유지. |


