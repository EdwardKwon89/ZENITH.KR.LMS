# TASK-B-310: 등록/수정 이력 패널 — 그룹 카드 + 클릭 상세보기 재설계

- **GitHub Issue**: [#1143](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1143)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 요청 분석)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ❌ 반려 (PR#1144, 2026-08-17 — CREATE 배지 문구 미반영, 재작업 필요)

## [배경]

JSJung 요청: "등록/수정 이력" 섹션(`UpsOrderEditHistoryPanel.tsx`, TASK-B-303)의 시인성이 떨어짐. 어떤 이력이고 누가/언제/무엇을 작업했는지 명확히, 오더 정보를 그룹화해서 카드의 주요 정보만 표출하고 클릭 시 상세를 보여주는 방식으로 개선 요청.

## [조사 결과 — 현재 문제점]

1. **CREATE 이력 노이즈**: 실제 DB 로그 확인 결과 `new_data`에 32개 핵심 필드가 통째로 들어있고 `computeDiff()`가 `old=null` 대비 값 있는 필드를 전부 "변경"으로 인식 — 등록 1건에 20개 이상의 줄이 `max-h-64` 스크롤 + `text-[11px]`(매우 작은 폰트)에 욱여넣어짐.
2. "누가/언제/무엇" 정보가 한 줄에 우선순위 구분 없이 뒤섞임(액션 영문 그대로, 담당자, 상태뱃지, 시각).
3. 필드가 그룹 감각 없이 개별 나열됨.
4. 접기/펼치기 없이 전부 펼쳐진 상태 고정.

## [설계 확정] (JSJung 승인)

### 1. 필드 그룹 — 기존 분류 재사용

`edit-log-fields.ts`의 `ORDER_EDIT_LOG_CORE_FIELDS`는 이미 화주(12)/수하인(10)/배송(9)/기타(2) 4그룹으로 나뉘어 있음(현재는 주석 구분만 있고 실제 그룹 매핑 데이터는 없음) — 이를 실제 그룹 매핑 구조로 정식화:

```ts
// edit-log-fields.ts에 추가
export const ORDER_EDIT_LOG_FIELD_GROUPS: Record<string, { label: string; fields: readonly string[] }> = {
  shipper: { label: '화주정보', fields: ['shipper_id','shipper_name','shipper_contact_name','shipper_contact_phone','shipper_contact_email','shipper_address','shipper_address_detail','shipper_country_code','shipper_state_province','shipper_city','shipper_zipcode','shipper_biz_no'] },
  recipient: { label: '수하인정보', fields: ['recipient_name','recipient_phone','recipient_email','recipient_address','recipient_address_detail','recipient_country_code','recipient_state_province','recipient_city','recipient_zipcode','recipient_pccc'] },
  delivery: { label: '배송정보', fields: ['transport_mode','delivery_method','incoterms','ups_product_code','ups_service_family','pickup_location','pickup_contact_name','pickup_contact_tel','pickup_address'] },
  misc: { label: '기타', fields: ['description','delivery_notes'] },
};
```

### 2. 카드(요약) 뷰

- 액션 라벨 한글화: CREATE→등록, UPDATE→수정, CANCEL→취소, APPLY→적용 (기존 `actionColor()`의 4개 액션과 매칭, 색상 유지)
- 담당자명 + 상대 시각(`date-fns`의 `formatDistanceToNow`, `locale: ko` — 이 패키지는 이미 의존성에 있으나 상대시각 용도는 이번이 최초 사용, `title` 속성에 절대시각(`toLocaleString('ko-KR')`) 병기해 hover로 정확한 시각 확인 가능)
- 그룹별 변경 배지: 실제 diff가 있는 그룹만 "그룹라벨 N건" 배지로 표출 (예: "화주정보 2건 변경"). UPDATE인데 변경 그룹이 없으면(발생 안 하는 케이스지만) 카드 자체를 렌더링하지 않음(현행 유지)
- CREATE는 "N건 변경"이 아니라 "N건 등록"으로 문구 구분

### 3. 클릭 시 상세 (아코디언)

- 카드 클릭 시 펼쳐져서 그룹 헤딩(화주정보/수하인정보/배송정보/기타) 아래 실제 필드 단위 `기존값 → 신규값`(UPDATE) 또는 등록값(CREATE) 표시 — diff 렌더링 로직(`formatValue`, 취소선 old → bold new)은 기존 로직 그대로 재사용, 그룹별로 묶어서 렌더링만 추가
- 기본은 접힌 상태(요약 배지만 보임), 클릭으로 토글 — **인터랙션이 필요하므로 컴포넌트를 `'use client'`로 전환** (현재 서버 컴포넌트, `history`를 props로만 받으므로 client 전환에 지장 없음)

## [작업 범위]

1. `src/lib/orders/edit-log-fields.ts`: `ORDER_EDIT_LOG_FIELD_GROUPS` 매핑 추가
2. `src/components/ups/UpsOrderEditHistoryPanel.tsx`:
   - `'use client'` 전환
   - `computeDiff()` 결과를 그룹별로 재분류하는 헬퍼 추가
   - 카드 UI를 요약(배지) + 클릭 토글 상세(그룹별 필드 diff)로 재구성
   - 액션 한글 라벨, 상대시각 표시 적용
3. 회귀 테스트 추가 (아래 참조)

## [회귀 테스트 방향]

- CREATE 항목: 카드 요약에 그룹별 "N건 등록" 배지가 보이고, 필드가 개별 나열되지 않는지(접힌 상태 기준)
- UPDATE 항목: 실제 변경된 그룹만 배지로 표출되는지, 변경 없는 그룹은 안 보이는지
- 카드 클릭 시 상세(그룹 헤딩 + old→new)가 나타나고, 다시 클릭 시 접히는지
- 액션 라벨이 한글(등록/수정/취소/적용)로 표출되는지
- 기존 `order-edit-log-b303.test.tsx` 등 관련 테스트가 새 구조에서도 의미상 동등하게 통과하는지(셀렉터 갱신 필요 시 함께 반영)

## [R-10]

등록 이력 1건 + 수정 이력 1건 이상 있는 오더로 UPS 상세페이지 스크린샷 — 카드 요약(접힌 상태) + 클릭 후 펼쳐진 상세 화면 둘 다 첨부.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

**PR#1144 반려 (2026-08-17)** — 상세: [PR#1144 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1144#issuecomment-5309166165)

그룹 매핑·computeGroupChanges·'use client' 전환·아코디언·상대시각·액션 한글라벨 전부 설계대로 정확함(diff 확인, 회귀 201/201·1406/1406 PASS, 빌드 성공). 다만 CREATE 항목의 그룹 배지가 `isCreate` 분기 없이 항상 "N건 변경"으로 표시되어 설계 명시 사항("CREATE는 'N건 등록'으로 문구 구분") 미반영 — 신규 등록 이력에 "N건 변경"이 뜨는 건 이번 재설계의 핵심 동기(등록/수정 오해 방지)와 정면으로 배치되어 반려. 한 줄 조건 분기로 수정 요청, 신규 테스트 없음도 함께 지적(해당 assertion이 있었으면 바로 잡혔을 사례).

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

## [발견 이슈]

없음
