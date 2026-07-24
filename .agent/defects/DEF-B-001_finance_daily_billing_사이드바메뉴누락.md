# DEF-B-001: /finance/daily-billing 페이지가 사이드바 메뉴에 연결되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-24 |
| **보고자** | jungjs |
| **긴급도** | Medium |
| **우선순위** | P3 |

## 현상

`/finance/daily-billing`("최종 운임 확정 및 화주별 일별 청구 집계 (W2)", Team A TASK-204/Riley 구현) 페이지가 실제로 구현되어 있고 정상 동작하지만, 사이드바 어디에도 연결 링크가 없어 URL을 직접 입력하지 않으면 접근할 방법이 없음.

## 실측 확인

- 페이지 파일 존재: `src/app/[locale]/(dashboard)/finance/daily-billing/page.tsx` — 권한 체크(ADMIN/MANAGER/AGENCY 등) 포함 정상 구현
- `src/components/layout/NaviSidebar.tsx`의 `finance_group` 하위 메뉴(114-124행)에 `/finance/revenue`, `/finance/costs`, `/admin/transport-costs`, `/finance/documents`, `/settlement`은 있으나 `/finance/daily-billing`은 없음
- 프로젝트 전체 검색 결과 이 경로로 연결되는 링크/버튼이 어디에도 없음(완전히 고립된 라우트)

## 조치안

`src/components/layout/NaviSidebar.tsx` finance_group children 배열에 항목 추가:
```tsx
{ title: t("finance_daily_billing"), href: "/finance/daily-billing" },
```
`messages/ko.json`·`en.json`·`ja.json`·`zh.json`(4개 언어 전체, 프로젝트 관례상 4개 언어 지원) `finance_revenue` 키 근처에 신규 키 `finance_daily_billing` 추가 필요. 값 예시(한국어): "화주별 일별 청구"

## 관련 파일
- `src/components/layout/NaviSidebar.tsx` (114-124행)
- `messages/ko.json`, `messages/en.json`, `messages/ja.json`, `messages/zh.json`
- 참고(정상 동작 페이지, 수정 불필요): `src/app/[locale]/(dashboard)/finance/daily-billing/page.tsx`

## 작업 결과

| 항목 | 내용 |
|:-----|:------|
| **담당자** | Dave |
| **완료일** | 2026-07-24 |
| **커밋** | `c111b16e` (코드) + `4a91d4a1` (문서) |
| **변경 파일** | `NaviSidebar.tsx` + messages 4개 언어 |
| **회귀 테스트** | 810/810 PASS (신규 테스트 없음, R-09 위반 보고됨) |
| **PR** | [#817](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/817) |
