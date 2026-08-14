# TASK-B-301 — UPS 오더 상세 상태이력 시각 표시 + 목록보기 전환 + 오더 폼 필수표시 감사

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Baker (구현) · Jaison (검토) |
| **우선순위** | P2 |
| **GitHub Issue** | [#1121](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1121) |
| **관련 결함** | 없음(JSJung 직접 요청 3건) |
| **상태** | 🔄 착수 |

## 배경

JSJung이 `ups-detail` 화면 및 오더 등록/수정 화면에 대한 개선 3건을 요청. Jaison이 사전 조사 후 정확한 범위로 설계.

## 작업 범위 (3건)

### ① UPS 오더 진행 상태 — 단계별 전이 일시(년/월/일/시간) 표시

**현황**: `UpsOrderStatusStepper.tsx`(`src/components/ups/UpsOrderStatusStepper.tsx`)는 현재 상태만 표시하고 각 단계로 전이된 시각 정보를 전혀 표시하지 않는다. `orderId`/`currentStatus`/`trackingNumber`/`canManuallySetDelivered` 4개 prop만 받음.

**데이터 소스 확인 완료**: `order_status_history` 테이블(컬럼: `order_id`, `prev_status`, `next_status`, `created_at`, `changed_by`)에 상태 전이 이력이 이미 기록되고 있음. RLS는 `authenticated` 전체 read 허용(`USING (true)`) — 추가 정책 불필요. ZEN-2026-000073 실측 확인:
```
prev_status | next_status | created_at
            | REGISTERED  | 2026-08-13 22:39:55...
REGISTERED  | WAREHOUSED  | 2026-08-13 22:40:28...
WAREHOUSED  | PACKED      | 2026-08-13 22:40:47...
PACKED      | WAREHOUSED  | 2026-08-13 22:42:41...  ← 같은 상태 재방문 가능(되돌림)
```

**변경**:
1. `ups-detail/page.tsx`에 인라인 쿼리 추가(같은 파일의 `costs`/`invoice` 쿼리와 동일 패턴 — 별도 action 신설 불필요):
   ```js
   const { data: statusHistory } = await supabase
     .from('order_status_history')
     .select('prev_status, next_status, created_at')
     .eq('order_id', orderId)
     .order('created_at', { ascending: true });
   ```
2. `<UpsOrderStatusStepper>` 호출에 `statusHistory={statusHistory || []}` prop 추가
3. `UpsOrderStatusStepper.tsx`의 `UpsOrderStatusStepperProps`에 `statusHistory?: { next_status: string; created_at: string }[]` 추가
4. 각 `STEPPER_STAGES` 항목 렌더링 시, 해당 stage의 `status`와 일치하는 `next_status`를 가진 이력 행 중 **가장 최근 것(같은 상태 재방문 시 최신 시각 우선)**을 찾아 스텝 라벨 아래에 작게 표시:
   ```js
   const stageTime = [...(statusHistory ?? [])].reverse().find((h) => h.next_status === stage.status)?.created_at;
   ```
   표시 형식은 `new Date(stageTime).toLocaleString('ko-KR')` (기존 `ZoneDiscountForm.tsx:211`의 `changed_at` 표시 패턴과 동일하게 통일)
5. 아직 도달하지 않은 단계(이력 없음)는 시각을 표시하지 않는다(빈 문자열/`Invalid Date` 노출 금지)
6. 레이아웃: 기존 스텝 원형 아이콘 + 라벨 아래에 `text-[9px] text-slate-400` 정도의 작은 텍스트로 추가(과설계 금지 — 툴팁/모달 등 신규 UI 패턴 도입 없이 기존 스텝 카드 안에 한 줄만 추가)

### ② "일반 오더 상세 보기로 이동" → "목록보기"(이전 목록으로 돌아가기)

**현황**: [ups-detail/page.tsx:228-234](../../src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx#L228-L234)
```tsx
<Link
  href={`/orders/${orderId}`}
  className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
>
  <ArrowLeft className="w-4 h-4" />
  일반 오더 상세 보기로 이동
</Link>
```
고정 링크로 항상 `/orders/{orderId}`(일반 오더 상세)로 이동 — 사용자가 어느 목록(전체 오더 목록/필터링된 목록/창고 화면 등)에서 진입했는지와 무관하게 항상 같은 곳으로 보냄.

**변경**: 라벨을 "목록보기"로 바꾸고, 클릭 시 `router.back()`으로 진입 직전 목록 화면으로 복귀하도록 변경. `ups-detail/page.tsx`는 서버 컴포넌트라 `useRouter`를 직접 쓸 수 없으므로, 작은 클라이언트 컴포넌트를 신설한다(기존 `QnaDetail.tsx`/`QnaForm.tsx`의 `router.back()` 사용 패턴과 동일):

```tsx
// src/components/ups/UpsDetailBackToListButton.tsx
'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function UpsDetailBackToListButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      목록보기
    </button>
  );
}
```
`page.tsx`에서 기존 `<Link href=... >일반 오더 상세 보기로 이동</Link>` 블록을 `<UpsDetailBackToListButton />`으로 교체, 이제 사용되지 않는 `Link`/`ArrowLeft` import는 정리(단, `ArrowLeft`가 page.tsx 다른 곳에서 쓰이는지 먼저 확인 후 정리 — 미확인 상태로 무조건 삭제 금지).

과설계 금지 — 히스토리 스택이 없는 직접 URL 진입 등 edge case에서 `router.back()`이 아무 데도 못 가는 상황(빈 히스토리)까지 폴백 로직을 만들 필요 없음(브라우저 기본 동작에 맡김).

### ③ 오더 등록/수정 화면 — 필수 입력 항목 중 "필수" 표시 누락분 보완

**조사 완료**: `src/lib/validation/order.ts`(`orderRegistrationSchema`)의 필수 항목 전체를 `OrderRegistrationForm.tsx`(등록 `/orders/new`·수정 `/orders/[orderId]/edit` 공용) 실제 라벨과 대조. 기존에 `<span className="text-rose-500">*</span>` 패턴으로 이미 정확히 표시된 항목: `item_name`·`quantity`·`shipper_id`(shipper_label)·`recipient_name`·`recipient_phone`·`origin_port_id`/`dest_port_id`(공용 헤더)·`pickup_address`/`pickup_contact_name`/`pickup_contact_tel`·`packing_unit`·`gross_weight`. **아래 3곳은 스키마상 필수(조건부 포함)인데 화면에 `*` 표시가 전혀 없음 — 이번 작업 대상**:

1. **`shipper_contact_phone`** — `transport_mode === 'UPS'`일 때 필수(스키마 `superRefine`, SHXK API 요구사항). [OrderRegistrationForm.tsx:1101](../../src/components/orders/OrderRegistrationForm.tsx#L1101)
   ```tsx
   <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('shipper_contact')} (Phone)</p>
   ```
   → UPS 모드일 때만 `*` 추가:
   ```tsx
   <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('shipper_contact')} (Phone){transportMode === 'UPS' && <span className="text-rose-500"> *</span>}</p>
   ```

2. **`recipient_country_code`·`recipient_zipcode`·`recipient_city`** — `transport_mode === 'UPS'`일 때 전부 필수(SHXK API 요구사항, TASK-B-277/TASK-B-283 이력). 현재 `<AddressInput prefix="recipient" ... required />`([OrderRegistrationForm.tsx:1226-1241](../../src/components/orders/OrderRegistrationForm.tsx#L1226-L1241))의 `required` prop은 "주소(Address)" 섹션 헤더에 정적 `*` 하나만 붙일 뿐(`AddressInput.tsx:93`), 국가/우편번호/도시 개별 필드에는 어떤 표시도 없음. `AddressInput`은 대리점 화주 등록/수정·마이페이지 법인정보 등 **다른 3개 화면에서도 공용**으로 쓰이므로, 무조건 항상 표시가 아니라 **호출부에서 조건부로 켤 수 있게** prop을 확장한다:
   ```ts
   // AddressInput.tsx — AddressInputProps에 추가 (전부 기본값 false, 기존 3개 소비처 동작 불변)
   requiredCountry?: boolean;
   requiredZipcode?: boolean;
   requiredCity?: boolean;
   requiredStateProvince?: boolean;
   ```
   각각 대응 라벨(`t('form_country')` L96, `t('form_zipcode')` L124, `t('form_city')` L168 — mode별로 L145/168, L225/248 등 중복 렌더 분기 전부) 옆에 `{requiredX && <span className="text-rose-500"> *</span>}` 추가.

   `OrderRegistrationForm.tsx`의 recipient `<AddressInput>` 호출에 조건부로 전달:
   ```tsx
   requiredCountry={transportMode === 'UPS'}
   requiredZipcode={transportMode === 'UPS'}
   requiredCity={transportMode === 'UPS'}
   ```

3. **`recipient_state_province`** — `recipient_country_code === 'CN'`일 때만 필수(DEF-B-044, Zone이 지역별로 달라짐). 현재는 [OrderRegistrationForm.tsx:1242-1244](../../src/components/orders/OrderRegistrationForm.tsx#L1242-L1244)에 안내 문구(호박색 텍스트)만 있고 다른 필수 필드들과 동일한 `*` 표시 컨벤션이 아님. 위에서 추가한 `requiredStateProvince` prop을 활용:
   ```tsx
   requiredStateProvince={watch('recipient_country_code') === 'CN'}
   ```
   기존 안내 문구(L1242-1244)는 그대로 유지(추가 설명으로 유용) — `*` 표시와 안내 문구 둘 다 존재해도 무방.

**과설계 금지**:
- `AddressInput`의 다른 3개 소비처(대리점 화주 등록/수정, 마이페이지 법인정보)는 새 prop을 아예 전달하지 않으므로(기본값 false) 동작 변화 없음 — 반드시 회귀 테스트로 확인
- shipper/pickup의 `<AddressInput>` 호출부는 이번 대상 아님(스키마상 진짜 항상/조건부 필수인 recipient 3필드만 대상)
- `order_type`은 토글 버튼으로 항상 기본값(B2B)이 채워지는 구조라 "미입력 가능" 상태가 UI상 존재하지 않음 — 표시 대상에서 제외(실질적 갭 아님)
- 전국 모든 필드 재검토·라벨 디자인 전면 개편 등은 범위 밖. 위 3곳만 정확히 보완

## 회귀 테스트 방향

- ① 상태이력: `statusHistory` mock에 REGISTERED→WAREHOUSED→PACKED→WAREHOUSED(재방문) 이력 제공 시, WAREHOUSED 단계에 **가장 최근 시각**이 표시되는지 / 미도달 단계(RELEASED 등)에는 시각 미표시 확인
- ② 목록보기: 컴포넌트 렌더 시 "목록보기" 텍스트 노출 확인 + 클릭 시 `router.back` 호출 여부(mock) 확인
- ③ 필수표시:
  - `transport_mode='UPS'`일 때 `shipper_contact_phone`/국가/우편번호/도시 라벨에 `*` 표시, `transport_mode='AIR'` 등 비UPS일 때는 미표시(조건부 정확성)
  - `recipient_country_code='CN'`일 때만 시/도 라벨에 `*` 표시, 그 외 국가는 미표시
  - **회귀 필수**: `AddressInput`을 쓰는 다른 화면(대리점 화주 등록·마이페이지 법인정보 등 기존 테스트) 기존 스냅샷/테스트가 새 prop 추가로 깨지지 않는지 확인(prop 기본값 false라 영향 없어야 함)
- 전체 회귀 PASS + `LIVE_REGRESSION_TEST_MAP.md` 갱신(R-09)
- **독립 되돌리기 검증 필수** — 3건 각각

## R-10 (실 UI 검증)

3건 모두 생략 불가:
- ZEN-2026-000073 등 실제 오더로 `ups-detail` 화면에서 스텝별 시각 표시 확인 스크린샷
- "목록보기" 버튼 클릭 시 실제로 이전 화면(예: 오더 목록)으로 돌아가는지 확인
- `/orders/new`(또는 edit)에서 UPS 모드 선택 시 화주 연락처/국가/우편번호/도시에 `*`가 나타나고, AIR 등 비UPS 모드에서는 사라지는지 확인 + 중국(CN) 선택 시 시/도에 `*` 나타나는지 확인 + 대리점 화주 등록 화면 등 다른 `AddressInput` 소비처는 기존과 동일하게(신규 `*` 없이) 보이는지 회귀 스크린샷

## [작업 결과]

_(Baker 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
