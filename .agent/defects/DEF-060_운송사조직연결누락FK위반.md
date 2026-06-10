# DEF-060: 운송사 조직 연결 누락으로 Order 등록 시 FK 위반

| 항목 | 내용 |
|:---|:---|
| **DEF#** | DEF-060 |
| **제목** | zen_carriers.org_id 미설정으로 zen_order_services FK 위반 |
| **관련 UAT** | 신규 운송 요청 등록 Step 3 제출 |
| **유형** | 기능 오류 |
| **블로킹** | Y |
| **상태** | 수정완료 |
| **담당자** | Aiden (Claude) |
| **수정 파일** | `supabase/migrations/20260610000300_link_carriers_to_orgs.sql` |

---

## 현상

신규 운송 요청 Step 3에서 운송사 및 통관사 선택 후 제출 시 아래 오류 발생:

```
Order services creation failed: insert or update on table "zen_order_services"
violates foreign key constraint "zen_order_services_provider_id_fkey"
```

## 원인

`zen_order_services.provider_id` → `zen_organizations.id` FK 제약 존재.

`OrderRegistrationForm.tsx`에서 transport 서비스의 `provider_id`를:
```ts
provider_id: selected.orgId || selected.carrierId
```
로 매핑하는데, `zen_carriers` 13개 중 9개의 `org_id = null`이어서 `orgId`가 빈 값으로 반환됨.

결과적으로 `carrierId`(zen_carriers.id)가 `provider_id`로 전달되지만, 이는 `zen_organizations`에 존재하지 않는 UUID이므로 FK 위반 발생.

## 영향 범위

| 영역 | 내용 |
|:-----|:-----|
| 신규 운송 요청 등록 | 운송사 선택 후 제출 전면 불가 (블로킹) |
| 영향 carrier | ZENITH Air Cargo, ZENITH Maritime Logistics, Korean Air Cargo, Asiana Cargo, DHL Express, FedEx Express, HMM Shipping, MSC Mediterranean Shipping, Evergreen Marine (9개) |

## 수정 내용

`supabase/migrations/20260610000300_link_carriers_to_orgs.sql` 마이그레이션 적용:

1. **FedEx Express**: `zen_organizations`에 동명 레코드 존재 → 직접 `org_id` 연결
2. **나머지 8개**: `zen_organizations`에 동명 레코드 없음 → `type = 'CARRIER'`로 신규 조직 생성 후 `zen_carriers.org_id` 연결

```
수정 후: 13/13 carrier 전부 org_id 연결 완료
```

## 검증

| 항목 | 결과 |
|:-----|:----:|
| 마이그레이션 적용 | ✅ |
| 빌드 | ✅ PASS |
| 회귀 테스트 | ✅ 316/316 PASS |
