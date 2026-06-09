# DEF-059: 화물 구분(Special Cargo Type) PKG 단위 전환 검토

| 항목 | 내용 |
|:---|:---|
| **DEF#** | DEF-059 |
| **제목** | special_cargo_type을 Order 레벨 → Package 레벨로 전환 |
| **관련 UAT** | UAT-02-01 |
| **유형** | 기능 개선 |
| **블로킹** | N |
| **상태** | 미수정 |
| **담당자** | — |
| **수정 파일** | (검토 필요) |

---

## 배경

현재 `special_cargo_type`(NONE/DANGEROUS/FROZEN/VALUABLE/USED)은 **Order 레벨 단일 선택**으로, 한 오더 내에 여러 PKG가 각각 다른 화물 구분을 가질 수 없는 구조적 제약이 있음.

실물 환경에서는 일반 박스 1개 + 위험물 박스 1개가 동일 오더에 공존할 수 있으므로, **PKG 단위로 cargo_type을 관리**하는 것이 적합함.

## 수정 필요 사항

### 1. DB Migration (신규)
- `zen_order_packages`에 `special_cargo_type TEXT DEFAULT 'NONE'` ADD COLUMN
- `CHECK (special_cargo_type IN ('NONE','DANGEROUS','FROZEN','VALUABLE','USED'))` 제약

### 2. Zod Validation (`src/lib/validation/order.ts`)
- `orderPackageSchema`에 `special_cargo_type` 필드 추가
- `orderRegistrationSchema`에서 `special_cargo_type` 제거

### 3. RPC (`create_order_atomic`)
- PKG INSERT 구문에 `special_cargo_type` 포함
- JSON → recordset 매핑에 `special_cargo_type` 추가

### 4. UI (`OrderRegistrationForm.tsx`)
- Step 1 좌측 컬럼의 "Special Cargo Selection" 섹션 제거
- 각 PKG 카드 내부에 cargo_type 선택 UI 추가

## 영향 범위

| 영역 | 변경 규모 |
|:-----|:---------|
| DB 스키마 | 마이그레이션 1건 (ADD COLUMN) |
| Zod 스키마 | Package 스키마 +1 필드, Order 스키마 -1 필드 |
| RPC 함수 | INSERT 컬럼 +1 |
| UI | PKG 카드에 UI 추가, 기존 Order 레벨 UI 제거 |
| 가격 엔진 | PKG별 cargo_type 참조 로직 확인 필요 |
| 기존 주문 | 읽기 전용 — 마이그레이션으로 기존 값은 'NONE' 유지 |

## 상태

- **진행**: 미착수
- **협의 필요**: Aiden (ZEN_CEO) — 기획 방향 및 마이그레이션 전략
- **선행 조건**: IMP 우선순위 검토
