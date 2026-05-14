# 아키텍처 기반 심층 개선 IMP 도출 보고서 (B_Kai)

> **수행 주체**: B_Kai
> **도구**: GitNexus 쿼리 + 파일 구조 분석 + EXP-IMP 전수 중복 검증
> **분석 기준**: `origin/main` (87e8fdd, 2026-05-14)
> **일시**: 2026-05-14
> **중복 방지**: `scratch/post_launch_improvements.md` IMP-001~026 전 항목 확인 완료

---

## 중복 검증 요약

| 구분 | 항목 수 | 비고 |
|:----|:-------:|:-----|
| 전수 검토 기존 IMP | IMP-001~026 | post_launch_improvements.md |
| 본 보고서 도출 | **7건** | IMP-027~033 (제안) |
| 완전 중복 제외 | 2건 | IMP-005(console.log) = IMP-013·015, IMP-006(에러핸들링) = IMP-025 |
| 부분 중복 보완 | 3건 | IMP-001·008·010 — 기존 항목의 잔여/확장 이슈 |
| 완전 신규 | 4건 | Maintenance Page, 통관 EDI, 타입 안전성, 정산 엔진 분할 |

---

## [IMP-027] 점검 모드 페이지 누락 — Maintenance Mode 사용자 경험 불완전

- **발견 경위**: GitNexus 미들웨어 실행 흐름(`proc_265_middleware`) 분석 중 `MAINTENANCE_MODE` Feature Flag 활성화 분기 확인
- **현재 상태**: `src/middleware.ts:68-75` — `MAINTENANCE_MODE`가 true이고 관리자가 아닌 경우 `/maintenance`로 보내려 했으나 **해당 페이지가 존재하지 않아** 루트(`/`)로 fallback 후 `error=maintenance` 쿼리 파라미터만 추가함. 사용자에게 점검 중임을 시각적으로 알릴 방법이 전혀 없음.
- **임시 조치**: 없음 (쿼리 파라미터만 추가, UI에서 활용하지 않음)
- **근본 문제**: Feature Flag 토글만 있고 실제 사용자 경험 구현이 누락됨. 점검 시간 동안 사용자는 아무 설명 없이 홈으로 리다이렉트되어 혼란 발생.
- **목표 구현**:
  1. `src/app/[locale]/(maintenance)/page.tsx` 신규 생성
     - 점검 안내 메시지 (아이콘 + "시스템 점검 중입니다" + 예상 완료 시간)
     - 관리자 로그인 링크 별도 표시
     - `globals.css`에 `.maintenance-bg` 테마 토글 (평소와 구분되는 시각적 상태)
  2. `src/middleware.ts` Maintenance 조건에 `/maintenance` 경로 제외 추가 (무한 루프 방지)
  3. `messages/*.json`에 점검 관련 다국어 키 추가
- **관련 파일**: `src/app/[locale]/(maintenance)/page.tsx` (신규), `src/middleware.ts`, `messages/ko.json`, `messages/en.json`, `messages/zh.json`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium (프로덕션 가동 전 마감 필요, 현재는 사용자 경험 결함)

---

## [IMP-028] 통관 자동화 — UNI-PASS EDI 연동 어댑터 확장

- **발견 경위**: GitNexus 분석 중 `src/lib/customs/` 디렉토리와 `customs_declarations` 테이블 흐름(`proc_156_cell`, `proc_287_onsubmit`) 확인
- **현재 상태**: `ICustomsAdapter` 인터페이스와 `customs_adapters` DB 테이블은 설계되어 있으나, 실제 구현체는 `ManualAdapter` 1개뿐. `ManualAdapter.submitDeclaration()`은 DB 저장 없이 `{success: true}`만 반환하는 Mock 수준. 실제 관세청 EDI(UNI-PASS) 또는 세관 신고 API 연동 없음.
- **임시 조치**: 관리자가 수동으로 declaration_no 입력 후 APPROVED 처리
- **근본 문제**: 통관 모듈이 아키텍처 대비 1/3 수준으로 구현됨. 실제 물류 운영에서 EDI 연동 없이 수동 처리로는 확장 불가능. 향후 국가별 세관 연동(Customs Broker API)까지 고려하면 어댑터 패턴은 필수.
- **목표 구현**:
  1. `src/lib/customs/unipass-adapter.ts` — UNI-PASS EDI 연동 어댑터 신규 구현
     - 신고 접수 (`submitDeclaration`)
     - 진행 상태 조회 (`getStatus`)
     - 반려/보완 통보 수신 (`pollStatus`)
  2. `src/lib/customs/adapter-factory.ts` — `AdapterFactory` 패턴 도입
     - `customs_adapters` 테이블의 `adapter_code` 기준 동적 로딩
     - `MANUAL` → `ManualAdapter`, `UNIPASS` → `UnipassAdapter`
  3. Admin customs UI에 어댑터 선택 드롭다운 및 연동 상태 표시 추가
  4. EDI 통신 로그 저장을 위한 `customs_adapter_logs` 테이블 (선택)
- **관련 파일**: `src/lib/customs/unipass-adapter.ts` (신규), `src/lib/customs/adapter-factory.ts` (신규), `src/lib/customs/manual-adapter.ts`, `src/app/[locale]/(dashboard)/admin/customs/customs-client.tsx`, `supabase/migrations/*.sql`
- **예상 공수**: 3~5 MD (UNI-PASS 스펙 분석 포함)
- **우선순위**: High (물류 플랫폼 핵심 기능, Phase 5 통관 완결 목표)

---

## [IMP-029] TypeScript 타입 안전성 강화 — `any` 타입 퇴출 및 관계형 타입 제네릭화

- **발견 경위**: GitNexus 타입 정의 탐색 중 `src/types/` 내 `any` 사용 및 불완전 관계형 타입 확인
- **현재 상태**:
  - `src/types/claims.ts:35-38` — `ClaimDetail.order: any` (명시적 타입 없음)
  - `src/types/orders.ts:63-79` — `OrderListItem`, `MasterOrderListItem` 등의 관계형 필드(`shipper`, `origin_port`, `dest_port`)가 병합 타입으로 선언되어 있으나 완전한 타입 안전성 미달
  - `src/types/supabase.ts` — Supabase generated types의 관계(Relationships) 배열은 존재하나, 실제 컴포넌트에서 활용하는 패턴 부재
- **임시 조치**: 없음 (런타임 에러 가능성 내포)
- **근본 문제**: `any` 타입은 컴파일 타임 검증을 무력화하여 리팩토링 시 사이드 이펙트 탐지 불가. DB 스키마 변경 시 영향 범위 특정이 어려움. 신규 개발자가 코드베이스 파악 시 타입 정의만으로 데이터 구조 이해 불가.
- **목표 구현**:
  1. `ClaimDetail.order` → `OrderDetail` 인터페이스 명시 지정 (`src/types/orders.ts`의 `CreateOrderRequest` 또는 신규 `OrderDetail` 타입 활용)
  2. 관계형 타입 패턴 제네릭화: `WithRelations<T, R extends Record<string, Database['public']['Tables'][string]['Row']>>` 유틸리티 타입 신규 정의
  3. `src/types/claims.ts`에 누락된 `ClaimStatus`, `ClaimReason` Enum → `as const` 객체로 통일 (현재 `OrderStatus`는 Enum, `ClaimStatus`는 Type alias로 불일치)
- **관련 파일**: `src/types/claims.ts`, `src/types/orders.ts`, `src/types/supabase.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium (타입 안전성 및 유지보수성)

---

## [IMP-030] 정산 엔진 단일 책임 원칙 위반 — `SettlementEngine` 책임 분할

- **발견 경위**: GitNexus 재무 클러스터(Finance, cohesion 0.82) 분석 중 `src/lib/finance/settlement.ts`의 `SettlementEngine` 클래스 실행 흐름(`proc_0_handlescan`, `proc_2_handlegenerateinvoic`) 확인
- **현재 상태**: `SettlementEngine` 클래스(185줄)가 운송비 계산(`calculateOrderCosts` 120+줄), 슬래브 요율 적용, 총액 집계, 정산 검증을 모두 단일 메서드에 처리. `InvoiceGenerator`(94줄)도 별도 책임이나 동일 파일에 결합.
- **임시 조치**: 없음 (복잡도 누적 중)
- **근본 문제**: 단일 메서드(`calculateOrderCosts`)가 120줄을 초과하여 가독성 저하. 슬래브 요율 계산 로직 변경 시 정산 검증 로직도 영향을 받음. 단위 테스트 작성 시 전체 `SettlementEngine`을 목(mock) 처리해야 하므로 테스트 비용 증가.
- **목표 구현**:
  1. `src/lib/finance/settlement/slab-calculator.ts` — `SlabRateCalculator` 클래스
     - `calculate(weight, rateCard, surcharges): SlabResult`
     - 슬래브 매칭 + 할증 적용 + 통화 변환
  2. `src/lib/finance/settlement/cost-aggregator.ts` — `CostAggregator` 클래스
     - `aggregate(orderId, slabResults): CostSummary`
     - 운송비 + 부가비용 + 할인 총액 집계
  3. `src/lib/finance/settlement/settlement-validator.ts` — `SettlementValidator` 클래스
     - `validate(costSummary, invoice): ValidationResult`
     - 최소 운임 검증, 신용 한도 검증, 등급 할인율 적용
  4. 기존 `SettlementEngine`은 3개 클래스를 조합하는 Facade로 전환
- **관련 파일**: `src/lib/finance/settlement.ts` → `src/lib/finance/settlement/slab-calculator.ts` (신규), `src/lib/finance/settlement/cost-aggregator.ts` (신규), `src/lib/finance/settlement/settlement-validator.ts` (신규)
- **예상 공수**: 2~3 MD
- **우선순위**: Medium (장기 유지보수성, 기존 정산 로직 변경 없음)

---

## [IMP-031] RBAC 이중 상태 잔여 정리 — `STATIC_PERMISSIONS` DB 전환 로드맵

- **발견 경위**: GitNexus 권한 클러스터 분석 중 `src/lib/auth/rbac.ts`의 `STATIC_PERMISSIONS`와 DB 기반 `checkPermissionDB` 병존 확인
- **현재 상태**: IMP-001(동적 RBAC) 완료로 `zen_role_permissions` DB 테이블 + `getPermissionsByRole`(cache) 기반 권한 조회가 구현됨. 그러나 `checkPermission()` 함수는 여전히 `STATIC_PERMISSIONS` fallback을 1순위(`allowedPaths` 미제공 시)로 사용. 실제로 서버 액션 `validateAdminAction()`은 `checkPermission(role, "/admin")`을 호출하므로 항상 STATIC 경로로 검증됨.
- **임시 조치**: 없음 (DB와 Static이 병존, 어느 쪽이 우선인지 불명확)
- **근본 문제**:
  - `checkPermission()` 호출 시 `allowedPaths` 인자를 제공하지 않으면 항상 `STATIC_PERMISSIONS` fallback 사용
  - `validateAdminAction()` 등 주요 가드 함수가 `checkPermission()` 사용 → DB 권한 설정을 무시할 수 있음
  - `STATIC_PERMISSIONS`와 DB가 불일치할 경우 어느 쪽이 기준인지 예측 불가능
- **목표 구현**:
  1. `checkPermission()` 기본 동작을 `STATIC_PERMISSIONS` → `allowedPaths` 우선으로 변경하지 않고, **DB 조회 결과를 우선**하도록 `checkPermissionDB()`를 모든 가드 함수에 적용
  2. `STATIC_PERMISSIONS` → "초기 시드 데이터"로 역할 재정의. `zen_role_permissions` 시드 생성 시 이 값을 사용
  3. `validateAdminAction()`, `validateUserAction()` 등에서 `checkPermission()` 대신 `checkPermissionDB()` 사용
  4. 3개월 후 `STATIC_PERMISSIONS` 제거를 목표로 Deprecation 경고 주석 추가
- **관련 파일**: `src/lib/auth/rbac.ts`, `src/lib/auth/guards.ts`, `supabase/migrations/*.sql` (시드 데이터)
- **예상 공수**: 1 MD
- **우선순위**: High (보안 정책 예측 가능성 및 일관성)

---

## [IMP-032] 다국어 번역 커버리지 전수 감사 및 CI 게이트 도입

- **발견 경위**: GitNexus Messages 클러스터 분석 + FB-011(E2E-10) 반려 이력(다국어 미등록) 확인
- **현재 상태**:
  - `next-intl` 기반 다국어(`ko`/`en`/`zh`/`ja`) 적용 중
  - `messages/` 내 JSON 파일에 번역 키 존재
  - `ORDER_STATUS_META`(`src/types/orders.ts:25-37`)는 한글 레이블로 하드코딩되어 i18n 체계 밖에 있음
  - FB-011 반려 사유 중 "신규 페이지 다국어 키 미등록" 포함 — 반복 발생 중
  - `src/lib/constants.ts`에 하드코딩된 UI 라벨 존재
- **임시 조치**: 각 태스크 완료 시 수동 확인 (R-09)
- **근본 문제**: 번역 누락을 자동으로 탐지하는 체계가 없음. 신규 페이지/컴포넌트 추가 시마다 수동 확인에 의존하여 휴먼 에러 발생. `ORDER_STATUS_META`와 같은 핵심 상태 레이블이 i18n으로 관리되지 않아 다국어 확장 시 일괄 변경 불가.
- **목표 구현**:
  1. `scripts/audit-i18n.ts` 신규 — 소스 코드 내 `useTranslations` / `t()` 호출과 `messages/*.json` 키를 교차 분석하여 누락 키 리포트 생성
  2. `ORDER_STATUS_META`를 i18n 메시지 키 기반으로 전환: `order.status.registered.label`, `order.status.registered.desc` 등
  3. `src/lib/constants.ts` 하드코딩 라벨을 i18n 참조로 마이그레이션
  4. `package.json`에 `"check:i18n": "tsx scripts/audit-i18n.ts"` 스크립트 추가
  5. CI gate: `check:i18n` 결과 누락 키 0건 미만 시 빌드 실패
- **관련 파일**: `scripts/audit-i18n.ts` (신규), `src/types/orders.ts`, `src/lib/constants.ts`, `messages/ko.json`, `messages/en.json`, `messages/zh.json`, `package.json`
- **예상 공수**: 2 MD
- **우선순위**: High (다국어 품질 및 신규 기능 추가 속도 직결)

---

## [IMP-033] Server Actions 도메인 분할 리팩토링 — 200줄 상한 적용

- **발견 경위**: GitNexus Actions 클러스터(cohesion 0.35~0.54) 분석 결과 4개 커뮤니티로 분산된 Actions 심볼 확인 + `src/app/actions/` 18개 파일 구조 분석
- **현재 상태**:
  - `src/app/actions/finance.ts` — 732줄 (인보이스 생성, 결제 상태 갱신, 세금계산서 발행, 비용 계산, PDF 생성 등 5개 이상 책임 혼재)
  - `src/app/actions/orders.ts` — 681줄 (주문 생성·수정·삭제·상태 변경·알림 등)
  - 총 18개 파일, 이 중 5개가 400줄 초과
  - 단일 파일에 여러 도메인 책임이 혼재되어 단위 테스트 Mock 설정 복잡
- **임시 조치**: 없음 (파일 분할 미진행)
- **근본 문제**: 파일 규모 비대로 인한 탐색 비용 증가. 단일 파일 내 응집도가 낮아 특정 기능 수정 시 연관 없는 코드까지 읽어야 함. 향후 Repository 패턴(IMP-016) 도입 전 선행 조건으로 파일 분할이 효과적.
- **목표 구현** (IMP-016의 Service Layer 도입보다 선행):
  1. `src/app/actions/finance/` 하위 분할:
     - `invoice.ts` — 인보이스 생성/조회/취소
     - `payment.ts` — 결제 상태 갱신/입금 확인
     - `tax-invoice.ts` — 세금계산서 발행/조회
     - `export.ts` — PDF/Excel 내보내기
     - `stats.ts` — 재무 통계/대시보드
  2. `src/app/actions/orders/` 하위 분할:
     - `create.ts` — 주문 생성
     - `status.ts` — 상태 변경/히스토리
     - `master.ts` — 마스터 오더
     - `tracking.ts` — 트래킹 연동
  3. 기존 파일 유지 + re-export만 하는 얇은 shim 파일로 하위 호환성 확보
  4. 각 파일 200줄 상한 적용
- **관련 파일**: `src/app/actions/finance.ts` → `src/app/actions/finance/invoice.ts` 외 4개 (신규), `src/app/actions/orders.ts` → `src/app/actions/orders/create.ts` 외 3개 (신규)
- **예상 공수**: 2~3 MD
- **우선순위**: Medium (유지보수성 및 테스트 용이성)

---

## IMP 항목 요약

| IMP | 내용 | 영역 | 우선순위 | 예상 공수 | 관련 파일 |
|:---|:-----|:----:|:--------:|:--------:|:---------|
| **027** | Maintenance Mode 페이지 | 기능 | Medium | 0.5 MD | 1개 신규 + 2개 수정 |
| **028** | 통관 UNI-PASS EDI 어댑터 | 기능/아키텍처 | **High** | **3~5 MD** | 2개 신규 + 2개 수정 |
| **029** | 타입 안전성 — any 퇴출 | 아키텍처 | Medium | 1 MD | 3개 파일 |
| **030** | 정산 엔진 단일 책임 분할 | 아키텍처 | Medium | 2~3 MD | 3개 신규 + 1개 분할 |
| **031** | RBAC STATIC_FALLBACK 정리 | 보안/아키텍처 | **High** | 1 MD | 2개 수정 |
| **032** | 다국어 커버리지 감사 + CI | 기능/품질 | **High** | 2 MD | 1개 신규 + 4개 수정 |
| **033** | Actions 도메인 분할 200줄 | 아키텍처 | Medium | 2~3 MD | 9개 신규 + 2개 shim |

---

> **비고**: 본 보고서의 IMP 번호(027~033)는 제안 번호입니다.  
> `scratch/post_launch_improvements.md` 등재 시점의 마지막 등록 번호 이후 연속 번호로 Aiden 검토 후 확정합니다.
