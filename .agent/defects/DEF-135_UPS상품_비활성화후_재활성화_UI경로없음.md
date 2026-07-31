# DEF-135: `/admin/ups-rates` 상품 관리 — 비활성화한 UPS 상품을 다시 활성화할 UI 경로가 없음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-31 |
| **보고자** | Aiden — DEF-134 후속으로 WW_FLIGHT를 화면에서 비활성화한 Edward가 "다시 활성화하려면 어떻게 하냐" 질문하여 확인 중 발견 |
| **긴급도** | Medium |
| **우선순위** | P2 |

## 현상

`/admin/ups-rates` "제품 관리" 탭에서 상품을 비활성화(소프트 삭제)하면, 화면 목록에서 완전히 사라지고 이후 UI만으로는 다시 활성화할 방법이 없음. 편도(one-way) 기능.

## 근본 원인

- `getUpsProducts()`(`src/app/actions/ups/rates.ts:28-38`)가 조회 시 `.eq('is_active', true)` 필터를 걸어 비활성 상품을 결과에서 아예 제외(33번 줄).
- `admin/ups-rates/page.tsx:11`이 이 함수를 그대로 사용하므로 화면 목록에도 비활성 상품이 노출되지 않음.
- `ProductTable`/`ProductForm`(`ups-rates-client.tsx:394-424, 607-619`)에 활성/비활성 전환 필터나 "전체 보기" 토글이 없어, 목록에 없는 항목은 편집 폼(`openEdit`)에 도달할 경로 자체가 없음.
- 같은 `product_code`로 "신규 등록"을 재시도해도 `product_code VARCHAR(20) UNIQUE` 제약(`20260614000100_ups_002_products.sql:7`)에 걸려 우회 불가.
- `updateUpsProduct`(`rates-mutation.ts:93-104`)는 `is_active`를 받아 정상적으로 업데이트 가능하지만, 위 이유로 UI에서 호출될 경로가 없을 뿐임 — 서버 액션 자체의 결함은 아님.

## 영향

- 상품을 잘못 비활성화하거나(오조작), DEF-134처럼 임시 조치로 비활성화한 뒤 원가 자료 확보 후 되돌리려는 정상적인 케이스 모두 DB 직접 조작 없이는 복구 불가.
- 현재 WW_FLIGHT가 이 상태로 비활성화되어 있음(DEF-134 임시조치, 의도된 상태이나 UI로 되돌릴 수 없음이 이번에 확인됨).

## 권장 조치

- `getUpsProducts()`에 `includeInactive` 옵션 추가하거나, `ProductTable`에 "비활성 포함 보기" 토글 추가
- 비활성 상품 행에는 "활성화" 버튼(또는 `ActionsCell`에 상태별 분기)을 노출하여 `updateUpsProduct(id, { is_active: true })` 호출 가능하게 함
- 별도 TASK로 발령 필요(범위: UI 조회 옵션 + 액션 버튼, server action은 이미 존재하므로 프론트엔드 변경 위주)

## 임시 우회 방법 (UI 수정 전)

DB 직접 UPDATE로만 재활성화 가능:
```sql
UPDATE zen_ups_products SET is_active = true, updated_at = now() WHERE product_code = 'WW_FLIGHT';
```

## 검증

- 코드 확인만 수행(재현 테스트는 실제 비활성화된 WW_FLIGHT 상태로 화면에서 직접 확인됨 — Edward 보고)
- 회귀 테스트 영향 없음(신규 코드 변경 없음, 결함 보고서만 등록)
