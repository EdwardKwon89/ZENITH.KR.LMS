# TASK-B-177: getnewlabel 응답구조 불일치 수정 (Issue #680, DEF-118)

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#680](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/680) |
| **우선순위** | P1 (Critical) |
| **상태** | 🔔 PR #??? |

## 개요

`getnewlabel` API 실제 응답 구조가 코드 가정과 달라 라벨 URL 추출 상시 실패:
- 가정: `data` 단일 객체, `label_url` 필드
- 실제: `data` 배열, `lable_file` 필드 (SHXK 오타)

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/shxk/order.ts` | `GetNewLabelResponse`: `lable_file` + `getnewlabel()` array 처리 |
| `src/lib/shxk/client.ts` | mock 응답: `label_url`→배열+`lable_file` |
| `src/app/actions/operations/ups-labels.ts` | `label_url`→`lable_file` 3곳 |
| `tests/unit/ups/ups-labels-split.test.ts` | mock `label_url`→`lable_file`, `data: null` 보강 |
| `.agent/defects/DEF-118_getnewlabel_응답구조_불일치_라벨URL_추출실패.md` | 결함 보고서 |

## 검증

| 항목 | 결과 |
|:-----|:------|
| TypeScript | 0 error |
| unit tests (ups-labels 10 + shxk 9 등) | 70/70 PASS |
| build | ✅ |

## 브랜치

- `fix/teamb-def-118-getnewlabel-response` (base `TeamB_Dev`)
