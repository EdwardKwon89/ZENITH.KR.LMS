# TASK-B-309: UPS 상세 "배송 기본 정보" — 화주/수령인 카드 분리 + 좌우 배치

- **GitHub Issue**: [#1141](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1141)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 요청)
- **담당**: Mike
- **우선순위**: P3
- **상태**: ✅ 완료 (PR#1142 머지, 2026-08-17, 병합 커밋 `3d742c30`)

## [배경]

JSJung 요청: "배송 기본 정보 (Shipper / Consignee)" 섹션을 화주 카드/수령인 카드로 분리하고, 글씨 크기 등 통일감 있게, 위아래가 아니라 좌우 배치.

## [현재 구조]

`ups-detail/page.tsx` — 카드 1개(`<ZenCard>`) 안에 화주/수령인 정보가 `<div>` 2개로 세로로 쌓여 있음(위아래 배치). 라벨/값/상세 텍스트 크기가 요소별로 제각각 상속되어 카드 간 통일감이 약함.

## [설계 확정] (JSJung 승인)

1. `<ZenCard>` 1개 → **화주/수령인 각각 별도 `<ZenCard>` 2개**로 분리
2. 두 카드를 `grid grid-cols-1 md:grid-cols-2 gap-6`로 **좌우 배치**(모바일에서는 세로 스택 — 반응형 기본 관례)
3. 두 카드의 대응 요소(제목/이름/라벨/상세줄)에 **동일한 className을 그대로 사용**해 폰트 크기·굵기·색상이 완전히 일치하도록 통일 — 임의로 다른 스타일 적용 금지
4. 카드 내부 항목(이름/연락처/이메일/주소/도시-주-우편번호-국가)과 기존 로직(`resolveShipperStreet`/`resolveConsigneeStreet`/`resolveRegionName`/`resolveCountryName` 등 TASK-B-305/307 결과물)은 그대로 유지 — 이번 작업은 순수 레이아웃/스타일 변경만, 데이터 로직 변경 없음

## [작업 범위]

파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`

기존:
```tsx
<ZenCard className="p-6 flex flex-col gap-4">
  <h3 className="...">배송 기본 정보 (Shipper / Consignee)</h3>
  <div className="flex flex-col gap-3 text-xs">
    <div>...화주...</div>
    <div>...수령인...</div>
  </div>
</ZenCard>
```

변경 후 (예시 — 클래스명은 두 카드에 동일하게):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <ZenCard className="p-6 flex flex-col gap-3">
    <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
      <User className="w-4 h-4 text-primary" />
      화주 (Shipper)
    </h3>
    <div className="flex flex-col gap-1.5 text-xs">
      <span className="font-bold text-slate-800 dark:text-gray-200 text-sm">{...화주명...}</span>
      {/* 연락처/이메일/주소 — 기존 로직 그대로, className만 수령인 카드와 통일 */}
    </div>
  </ZenCard>
  <ZenCard className="p-6 flex flex-col gap-3">
    <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
      <User className="w-4 h-4 text-primary" />
      수령인 (Consignee)
    </h3>
    <div className="flex flex-col gap-1.5 text-xs">
      <span className="font-bold text-slate-800 dark:text-gray-200 text-sm">{...수령인명...}</span>
      {/* 연락처/이메일/주소/도시-주-우편번호-국가 — 기존 로직 그대로 */}
    </div>
  </ZenCard>
</div>
```

## [회귀 테스트 방향]

- 화주/수령인이 각각 별도 카드(별도 컨테이너)로 렌더링되는지 (예: `container.querySelectorAll` 개수 확인)
- 두 카드가 같은 부모 내에서 형제 요소로 나란히 배치되는지(DOM 구조 확인)
- 기존 `ups-detail-b300.test.tsx`/`ups-detail-b301.test.tsx` 등 이 섹션을 검증하던 테스트가 새 DOM 구조에서도 통과하는지(텍스트 내용 자체는 변경 없으므로 대부분 그대로 통과해야 함 — 깨지면 셀렉터 방식 문제이지 로직 문제 아님, 확인 후 필요 시 셀렉터만 갱신)

## [R-10]

ZEN-2026-000007로 UPS 상세페이지 스크린샷 — 화주/수령인 카드가 좌우로 나란히 배치되고 폰트가 통일된 모습 확인.

## [작업 결과]

(Mike 작성, `.agent/tasks/TASK-B-309_ups_detail_shipper_consignee_cards.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ ZenCard 1개 → 화주("화주 (Shipper)")/수령인("수령인 (Consignee)") 각각 별도 ZenCard 2개
2. ✅ `grid grid-cols-1 md:grid-cols-2 gap-6`로 좌우 배치(모바일 세로 스택)
3. ✅ 두 카드 대응 요소(h3/내용 div/각 span) className 완전 동일 — 폰트 통일
4. ✅ 데이터 로직(resolveShipperStreet 등)은 표현식 단위로 무변경 — 순수 레이아웃 리팩터링

빌드 SUCCESS, 회귀 201 test files / 1406 tests ALL PASS(기존 텍스트 기반 테스트 그대로 통과 — 콘텐츠 불변 방증).

- 커밋: `a5d2f752`
- PR: [#1142](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1142)

## [Jaison 최종 검토]

**PR#1142 승인·머지 (2026-08-17)** — 병합 커밋 `3d742c30`

diff로 지시 사항 전부 확인(카드 분리, 좌우 배치, className 통일, 데이터 로직 무변경). 격리 워크트리 재검증: 회귀 201/201·1406/1406 ALL PASS, 빌드 성공, CI 3종 PASS. 순수 구조 변경이라 신규 테스트 없이도 승인(로직 리스크 없음 — TASK-B-306과 동일 기준 적용).

R-10(UPS 상세페이지 실구동, 화주/수령인 카드 좌우 배치 확인) 스크린샷 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음
