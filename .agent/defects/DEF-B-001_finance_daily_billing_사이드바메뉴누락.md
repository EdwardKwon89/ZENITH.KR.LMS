# DEF-B-001: /finance/daily-billing 페이지 사이드바 메뉴 누락

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) |
| **긴급도** | Low |
| **우선순위** | P3 |
| **연결 이슈** | [#811](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/811) |

## 현상

`/finance/daily-billing`(Team A TASK-204/Riley 구현) 페이지가 정상 동작하나 사이드바에 링크가 없어 URL 직접 입력 외 접근 불가.

## 조치

`src/components/layout/NaviSidebar.tsx` finance_group children에 항목 추가 + 4개 언어 파일 키 추가
