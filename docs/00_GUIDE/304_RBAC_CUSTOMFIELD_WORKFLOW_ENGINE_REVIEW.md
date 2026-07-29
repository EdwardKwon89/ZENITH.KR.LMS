---
tags: ["review", "architecture"]
---

# [304] 사용자·권한·Role·메뉴·커스텀필드 관리 + 워크플로우 엔진 — Redmine 참조 비교분석

> **문서 ID**: 304
> **분류**: 운영 & 관리(300-399) — 아키텍처 검토 문서
> **상태**: 🔵 **검토 문서 — 현재 시점 미반영** (Edward 지시, 2026-07-29: "이 검토 사항은 지금 시점에 반영하지 않는다. 향후를 위한 검토 문서로 남겨 줘")
> **목적**: 사용자관리·권한관리·Role관리·메뉴관리·커스텀필드관리 5개 기능 + 워크플로우 엔진을, 성숙한 오픈소스 프로젝트관리 툴 **Redmine**의 실제 구현(소스 코드 확인 기준)과 비교분석하여, ZENITH_LMS 고도화 및 향후 타 프로젝트 적용 시 참조 가능한 자료로 남긴다.
> **대상**: 향후 설계 결정권자(Aiden/Edward), 타 프로젝트 신규 착수 시 참조자
> **작성일**: 2026-07-29
> **작성자**: Aiden (Claude, ZEN_CEO)
> **버전**: v1.0

---

[← 목록으로 돌아가기](./000_README.md)

---

## 0. 이 문서의 성격

본 문서는 **실행계획이 아니다.** ZENITH_LMS의 현재 개발 우선순위(TeamB_Dev 결함 대응 등)와 무관하게, "이런 접근이 있다"는 것을 근거와 함께 남겨 향후 고도화 논의 또는 타 프로젝트 신규 설계 시 즉시 참조할 수 있도록 하는 것이 유일한 목적이다. 어떤 구현도 본 문서 작성만으로 착수되지 않는다 — 실제 적용 여부는 별도의 R-11(API 설계 우선) 절차와 Edward 승인을 거쳐야 한다.

**관련 문서**:
- [205_RBAC_MENU_GOVERNANCE.md](./205_RBAC_MENU_GOVERNANCE.md) — ZENITH 현재 RBAC/메뉴 체계(8대 고정 역할 + `zen_role_permissions` 테이블)
- [302_OO_PERMISSION_ROUTING_GUIDE.md](./302_OO_PERMISSION_ROUTING_GUIDE.md) — ZENITH 현재 권한 라우팅 설계(`ORG_ROUTE_MAP`/`PERMISSION_MAP` 코드 객체)
- [210_AI_AGENT_REWORK_PREVENTION_GUIDE.md](./210_AI_AGENT_REWORK_PREVENTION_GUIDE.md) — 본 문서에서 다루는 반복 결함 패턴(역할×리소스×액션 매트릭스 누락)의 원 근거 자료

---

## 1. 배경 — ZENITH_LMS 현재 상태(As-Is)와 왜 이 검토가 나왔는가

### 1.1 현재 구조

- **역할**: `205_RBAC_MENU_GOVERNANCE.md` 기준 8대 고정 역할(ZENITH_SUPER_ADMIN/ADMIN/MANAGER/OPERATOR/CARRIER/CORPORATE/INDIVIDUAL/USER) + 실제 코드에는 AGENCY/AGENCY_SHIPPER/SUB_ADMIN 등이 추가되어 있어 **문서와 코드가 이미 어긋난 상태**
- **메뉴 권한**: `zen_role_permissions`(role_code+menu_id+path+is_allowed) — DB 테이블 기반, 이미 admin-UI로 관리 가능한 구조
- **기능 권한**: `302_OO_PERMISSION_ROUTING_GUIDE.md`의 `PERMISSION_MAP`/`ORG_ROUTE_MAP` — TypeScript 객체 리터럴("Config over Code"), 코드 배포가 있어야 반영됨
- **상태 전이 가드**: 서버 액션 코드 안에 `if (status !== 'WAREHOUSED') throw` 류로 산재. 역할·배송수단(transport_mode)별 예외가 하드코딩된 조건문으로 분기됨

흥미로운 점은, 302 문서 자체가 2026-04-18 작성 당시 이미 이 한계를 인지하고 있었다는 것이다:

> **"Config over Code"** - 모든 권한과 경로는 하드코딩이 아닌 객체 설정을 통해 통제되어야 하며, **이는 향후 관리자 설정 UI에서 동적으로 DB화하여 관리할 수 있는 토대가 된다.**

본 문서는 302가 4개월 전 예견한 그 "다음 단계"에 대한 구체적 검토다. 같은 방향의 초기 문제의식은 `scratch/post_launch_improvements.md`의 **IMP-001("RBAC 동적 권한 관리 시스템 구축")**에도 이미 기록되어 있다 — `zen_role_permissions` 테이블 자체는 그 결과물이며, 본 문서는 그 다음 단계(기능 권한·워크플로우까지 확장)를 다룬다.

### 1.2 이 검토가 필요했던 정량적 근거

`.agent/defects/`에 기록된 결함 중 "특정 역할·배송수단 변형이 권한/가드 체크에서 누락"되어 발생한 사례:

| DEF | 현상 |
|:---|:---|
| DEF-114 | `ROLE_PERMISSIONS`에 AGENCY 누락 → 창고관리 기능 전체 500 에러 |
| DEF-116 | `checkLabelPermission()`에 AGENCY 누락 → UPS 라벨 기능 7종 침묵 실패 |
| DEF-117 | `zen_order_packages` RLS에 AGENCY SELECT 커버리지 없음 |
| DEF-B-017/019 | RLS 정책에 특정 역할 SELECT 누락 |
| DEF-B-024 | tracking_no 정리가 RLS에 막혀 무효화(화주 본인 UPS 등록 시나리오 누락) |
| DEF-B-025 | UPS 오더 픽업완료가 `route_option_id` 가드에 막혀 항상 실패(가드가 transport_mode 변형을 고려 안 함) |

전부 "고정된 목록/조건문에 특정 변형 하나를 빠뜨림"이라는 동일 근본원인이다. 이는 [210 가이드](./210_AI_AGENT_REWORK_PREVENTION_GUIDE.md) §4에서 이미 1순위 반복 실패 패턴으로 정량화된 것과 정확히 같은 문제군이다.

---

## 2. Redmine 실제 구현 (소스 코드 확인 기준)

> 아래는 `github.com/redmine/redmine` 소스 코드를 직접 확인한 결과다(2026-07-29 조사).

### 2.1 사용자 관리 (`app/models/user.rb`)
- 상태는 boolean이 아닌 **enum형 상태값**: `STATUS_ANONYMOUS`/`STATUS_ACTIVE`/`STATUS_REGISTERED`/`STATUS_LOCKED` + `lock!`/`activate!` 등 상태 전이 메서드
- `belongs_to :auth_source` — 로컬 인증과 LDAP/AD 인증을 한 모델에서 분기(로컬 인증 시에만 비밀번호 변경 허용)
- `admin` 컬럼은 단순 boolean, 변경 권한은 "현재 사용자가 admin일 때만"으로 제한
- API 키는 User 테이블 컬럼이 아니라 **별도 `Token` 모델과 1:1 관계** — 지연 생성(lazy-create)
- **Group**: `has_and_belongs_to_many :groups`(다대다, `groups_users` 조인 테이블) — 조직 계층과 무관한 횡단 그룹 개념

### 2.2 역할/권한 관리 (`app/models/role.rb`, `member_role.rb`)
- `Role.permissions`는 **serialize된 배열 컬럼**(FK 없는 단일 컬럼에 심볼 배열 저장) — `add_permission!(:add_issues)` 식으로 조작
- 프로젝트 스코프 다중 역할: `Member`(user×project) `has_many :member_roles` → 한 사용자가 프로젝트별로 여러 역할을 동시에 가질 수 있음
- **워크플로우 권한**은 별도 개념(2.6 참조)

### 2.3 메뉴 관리 (`lib/redmine/menu_manager.rb`)
- **admin-UI로 관리 불가.** 순수 Ruby DSL: `Redmine::MenuManager.map :admin_menu do |menu| menu.push(...) end`
- ActiveRecord 모델도, 메뉴 테이블도, 관리 화면도 없음 — 메뉴 변경은 코드/플러그인 배포가 필요

### 2.4 커스텀필드 관리 (`app/models/custom_field.rb`, `custom_value.rb`)
- **STI**(Single Table Inheritance): `CustomField` 기반 클래스를 `IssueCustomField`/`UserCustomField`/`ProjectCustomField`/`TimeEntryCustomField` 등이 상속, `type` 컬럼으로 구분
- 필드 형식(`field_format`): string/text/int/float/date/bool/list/user/version/enumeration 등, 형식별 핸들러 클래스 보유
- 역할별 가시성: `has_and_belongs_to_many :roles`(조인 테이블 `custom_fields_roles`)
- 이슈 커스텀필드의 트래커별 연결: `has_and_belongs_to_many :trackers`(조인 테이블 `custom_fields_trackers`)
- 실값 저장: `CustomValue` — **polymorphic EAV**(`customized_type`+`customized_id`+`custom_field_id`+`value`, value는 형식 무관 text 컬럼)
- **알려진 약점**(Redmine 자체 이슈 트래커 확인):
  - Issue #10227: 플러그인이 정의한 CustomField 서브클래스가 제거된 후에도 DB에 값이 남아 `ActiveRecord::SubclassNotFound` 발생
  - Issue #16302: 플러그인 제거 시 커스텀필드 설정 화면 자체가 깨짐
  - `value`가 형식 무관 text 컬럼이라 숫자/날짜 필터링·정렬·집계 시 매번 형식별 캐스팅이 필요(플러그인 생태계에서 `redmine_depending_custom_fields` 등 우회 플러그인이 존재할 정도로 알려진 한계)

### 2.5 워크플로우 엔진 (`workflow_rule.rb`, `workflow_transition.rb`, `workflow_permission.rb`, `issue_status.rb`)
단일 `workflows` 테이블에 STI로 두 규칙이 공존:

| 규칙 | 구성 | 의미 |
|:---|:---|:---|
| `WorkflowTransition` | (role, tracker, old_status→new_status, author/assignee 컨텍스트) | 상태 전이 허용 여부 |
| `WorkflowPermission` | (role, tracker, status, field_name, rule=readonly\|required) | 특정 상태에서 필드 잠금/필수 규칙 |

**런타임 경로**: `Issue#new_statuses_allowed_to(user)` → `IssueStatus.new_statuses_allowed(...)`가 `workflow_transitions_as_new_status` 조인 쿼리 하나로 "현재 사용자·현재 상태에서 갈 수 있는 다음 상태 목록"을 계산 → 상태 드롭다운과 저장 검증 양쪽에 동일하게 공급(단일 진실 공급원).

**Admin UI**(`workflows_controller.rb`): role×tracker 체크박스 매트릭스 편집기(`edit`/`update`, `permissions`/`update_permissions`) + **`copy`/`duplicate` — 다른 tracker/role의 워크플로우를 통째로 복사**하는 기능(`WorkflowRule.copy`).

### 2.6 tracker(이슈 유형) 개념의 중요성

Redmine의 워크플로우·커스텀필드는 전부 **tracker(Bug/Feature/Support 등 이슈 유형)** 축으로 분기된다. 이것이 ZENITH_LMS 검토의 핵심 연결고리다 — 아래 §4 참조.

---

## 3. 상세 비교표

| 기능 | Redmine 방식 | ZENITH 현재 방식 | 격차·리스크 |
|:---|:---|:---|:---|
| **사용자 관리** | enum 상태값 + auth_source 분기 + Group 다대다 + API 키 지연생성 | `zen_profiles.status`(문자열), Group 개념 없음(조직 계층만 존재) | 낮음 — 개념 대부분 이미 있음. Group(횡단 그룹)만 신규 가치 |
| **역할 관리** | `Role.permissions` serialize 배열(FK 없음) — 사실 레거시 약점으로 꼽히는 설계 | 역할이 코드 내 문자열 유니온 타입 + 여러 곳에 흩어진 하드코딩 목록(`ROLE_PERMISSIONS` 등) | 양쪽 다 취약. **Redmine을 그대로 베낄 이유 없음** — §4 참조 |
| **권한 관리** | Role→Member→Project 스코프, `has_permission?(:action)` | `PERMISSION_MAP`(TS 객체, `302` 문서) | ZENITH는 이미 "Config over Code" 방향은 맞았으나 여전히 코드 배포 필요 |
| **메뉴 관리** | ❌ admin-UI 없음, 순수 코드/플러그인 DSL | ✅ `zen_role_permissions` DB 테이블, admin-UI로 관리 가능 | **ZENITH가 이미 Redmine보다 우위** |
| **커스텀필드 관리** | STI + polymorphic EAV, 형식 무관 text 컬럼 | 없음(고정 스키마) | Redmine의 개념(필드 정의+역할별 가시성)은 유용하나, EAV 자체 구현은 Redmine도 자인하는 약점(§2.4) |
| **워크플로우 엔진** | (role, tracker, from→to) 트리플 테이블 + 필드별 readonly/required 규칙 + 매트릭스 UI + 복사 기능 | 서버 액션 코드에 산재한 `if (status !== X) throw` 가드 | **가장 큰 격차이자 가장 큰 기회** — §1.2의 결함 전부가 이 격차에서 기인 |

---

## 4. 합리성 분석 — 어떤 방식이 더 합리적인가

항목별로 "Redmine 그대로" / "Redmine 개념만 차용, 구현은 다르게" / "채택 불필요"로 판단한다.

### 4.1 메뉴 관리 — **참조 불필요**
Redmine은 애초에 admin-UI 메뉴 관리 기능이 없다. ZENITH의 `zen_role_permissions` 테이블 기반 접근이 이미 더 발전된 형태다. 이 항목은 Redmine에서 배울 것이 없다.

### 4.2 역할/권한 관리 — **개념은 채택, 저장 방식은 Redmine보다 관계형으로**
Redmine의 `Role.permissions` serialize 컬럼은 FK가 없는 단일 컬럼 배열 저장 방식으로, 관계형 무결성 관점에서는 오히려 약점으로 꼽히는 legacy 설계다(왜 이렇게 됐는지는 Redmine 자체의 역사적 부채 — 새 설계라면 이렇게 안 할 것). ZENITH가 이 컬럼 구조를 그대로 베끼는 것은 **비합리적**이다.

대신 합리적인 방향은:
- `zen_role_permissions`(이미 존재)를 **기능 단위 권한까지 확장**하여 `PERMISSION_MAP`(코드 객체)을 대체 — Redmine의 "역할=권한 집합"이라는 *개념*은 채택하되, *저장*은 이미 ZENITH가 갖고 있는 조인 테이블 방식(관계형, FK 존재)으로 하는 것이 Redmine의 원본 구현보다 합리적이다.

### 4.3 커스텀필드 관리 — **순수 EAV는 기각, JSONB+필드정의 테이블 하이브리드가 합리적**
Redmine의 polymorphic EAV(`CustomValue`)는 실제로 Redmine 생태계 내에서도 알려진 두 가지 문제를 안고 있다(§2.4, Issue #10227/#16302 — 플러그인 STI 서브클래스 소실 시 깨짐, 형식 무관 text 컬럼의 캐스팅 비용). 이를 Postgres/Supabase 위에 그대로 이식하는 것은 **비합리적**이다.

Postgres는 JSONB 네이티브 타입 + GIN 인덱스를 지원하므로:
- `custom_field_definitions`(entity_type, field_key, field_format, is_required, visible_roles 등 — Redmine의 `CustomField` 개념에 대응)
- 실값은 EAV 테이블이 아니라 **엔티티 본 테이블의 JSONB 컬럼**(예: `zen_orders.custom_data jsonb`)에 저장

이 방식은 Redmine의 "필드 정의를 메타데이터로 분리한다"는 *개념*은 그대로 채택하면서, Redmine이 못 가진 Postgres의 타입 시스템(JSONB 연산자, GIN 인덱스)을 활용해 §2.4의 두 약점을 원천 회피한다 — **Redmine보다 합리적인 구현**이 가능한 명확한 사례다.

### 4.4 워크플로우 엔진 — **가장 강하게 채택 권장, tracker=transport_mode 대응이 핵심 근거**
Redmine에서 워크플로우·커스텀필드가 분기되는 축인 **tracker**(이슈 유형: Bug/Feature/Support)는, ZENITH_LMS에서 정확히 같은 역할을 하는 축인 **`transport_mode`**(UPS/AIR/SEA/LAND)와 구조적으로 동일하다. §1.2에 나열한 결함(DEF-B-024/025 등)은 전부 "이 변형(주로 UPS)을 가드가 하드코딩으로 놓침" 패턴이며, 이는 Redmine이 tracker별로 워크플로우를 분리해 관리하는 이유와 정확히 같은 문제다.

합리적 설계:

| 테이블 | 역할 |
|:---|:---|
| `zen_workflow_transitions` | entity_type(ORDER 등) × variant(transport_mode) × role_code × from_status → to_status |
| `zen_workflow_field_rules`(2단계, 후순위) | entity_type × variant × status × field_name × rule(readonly\|required) |

엔진 함수 `getAllowedTransitions(entityType, variant, role, currentStatus)` 하나로 산재한 가드를 대체하고, admin UI는 Redmine처럼 매트릭스 편집기 + "UPS 워크플로우를 신규 배송모드에 복사" 기능을 참조 가능하다.

**필드 레벨 규칙(`WorkflowPermission` 대응)**은 발생 빈도가 낮은 결함군이므로 2단계 후순위로 판단한다 — 1단계(상태 전이)만으로 §1.2에 나열된 결함 전부가 해소된다.

### 4.5 종합 판단

| 항목 | 판단 |
|:---|:---|
| 메뉴 관리 | 채택 불필요(ZENITH가 이미 우위) |
| 역할/권한 저장 방식 | Redmine 방식 기각, 개념만 채택 → 관계형 조인 테이블로 구현 |
| 커스텀필드 | Redmine 순수 EAV 기각, JSONB+필드정의 테이블 하이브리드가 더 합리적 |
| **워크플로우 엔진** | **가장 강하게 채택 권장** — ROI 최상위, transport_mode 대응관계로 결함 재발 구조적 차단 가능 |

---

## 5. 도입 시 고려사항 (실제 적용 시점을 위한 메모 — 현재는 미실행)

빅뱅 전면 재작성은 리스크가 크다. 실제 착수 시 아래 순서를 권장:

1. **1단계**: 워크플로우 엔진 테이블만 만들고, 기존 코드의 하드코딩 가드를 역설계해 데이터로 채워 넣기 — 이 작업 자체가 현재 숨어있는 불일치를 드러내는 감사 효과를 가짐
2. **2단계**: 결함 밀도가 가장 높은 UPS 관련 가드부터 엔진 조회로 교체, 신규 기능은 처음부터 엔진 사용
3. **3단계**: 커스텀필드(JSONB 방식) 도입 — 상품/화주별 확장 필드 요구가 실제로 생겼을 때
4. **4단계**: 필드 레벨 워크플로우 규칙 — 낮은 우선순위

전체 오더 라이프사이클·창고 처리·정산까지 영향 범위가 넓은 플랫폼급 변경이므로, 실제 착수 시 R-11(API 설계 우선) 절차에 따라 정식 설계 문서(`Ds-XX`) 승인을 먼저 거쳐야 한다.

---

## 6. 타 프로젝트 신규 착수 시 적용 가이드

신규 프로젝트에서 이 5+1 기능을 처음부터 설계한다면 아래 순서를 권장한다([210 가이드](./210_AI_AGENT_REWORK_PREVENTION_GUIDE.md) Part B와 동일한 원칙 — 하드 메커니즘 우선):

1. **역할×리소스×액션 권한 매트릭스**(Redmine의 Role/Permission 개념)를 요구사항 설계 단계에서 표로 확정 — 코드보다 먼저
2. 이 매트릭스에 **변형 축(tracker/transport_mode에 해당하는 도메인 고유 분기 기준)이 있는지** 먼저 확인 — 있다면 처음부터 워크플로우 엔진 형태(관계형 트리플 테이블)로 설계, 없다면 단순 역할×액션 매트릭스로 충분
3. 메뉴 관리는 Redmine을 참조하지 말 것 — DB 기반 role×menu 테이블을 처음부터 채택(ZENITH의 `zen_role_permissions`가 좋은 출발점)
4. 커스텀필드가 필요한 경우, 순수 EAV보다 **JSONB+필드정의 테이블** 하이브리드를 기본값으로 검토(Postgres 기반일 경우)

---

## 7. 미반영 사유

본 문서 작성 시점(2026-07-29)에 Edward가 명시적으로 지시: **"이 검토 사항은 지금 시점에 반영하지 않는다. 향후를 위한 검토 문서로 남겨 줘."** 따라서 위 어떤 설계도 현재 ACTIVE_TASK/WBS에 반영되지 않았으며, 착수 여부는 별도 지시를 기다린다.

---

[← 목록으로 돌아가기](./000_README.md)
