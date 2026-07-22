# TASK-B-180: getnewlabel 응답구조 불일치 수정 (Issue #680, DEF-118)

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
| `src/lib/shxk/order.ts` | `GetNewLabelItem` (단일→전체 array 반환), `getnewlabel()` 모든 항목 유지 |
| `src/lib/shxk/client.ts` | mock 응답: `label_url`→배열+`lable_file` |
| `src/app/actions/operations/ups-labels.ts` | `label_url`→`lable_file` + COMBINED(`content_type=6`) 다중 URL 처리 |
| `src/components/warehouse/OutboundProcessForm.tsx` | COMBINED 버튼 추가 + `window.open` 다중 탭 |
| `tests/unit/ups/ups-labels-split.test.ts` | mock `GetNewLabelResponse`→`GetNewLabelItem[]` |
| `tests/unit/shxk/client.test.ts` | getnewlabel mock 응답 array 검증 |
| `.agent/defects/DEF-118_getnewlabel_응답구조_불일치_라벨URL_추출실패.md` | 결함 보고서 |

## 검증

| 항목 | 결과 |
|:-----|:------|
| TypeScript | 0 error |
| unit tests (ups-labels 10 + shxk 9 등) | 70/70 PASS |
| build | ✅ |

## 브랜치

- `fix/teamb-def-118-getnewlabel-response` (base `TeamB_Dev`)
- PR #681
