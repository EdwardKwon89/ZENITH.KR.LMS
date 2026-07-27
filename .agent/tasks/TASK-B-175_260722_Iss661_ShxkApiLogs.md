# TASK-B-175: SHXK API 호출 통합 감사 로그 테이블 (Issue #661)

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#661](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/661) |
| **우선순위** | P3 |
| **상태** | 🔔 PR #662 (재작업 반영) |

## 개요

SHXK UPS API 호출 이력이 목적별로 파편화되어 통합 조회 불가능:
- `zen_ups_label_errors`: createorder 실패만 기록
- `zen_ups_labels.shxk_response_message`: 응답 1줄만
- `removeorder`/`getnewlabel` 등은 DB 기록 없음

→ 통합 테이블 `zen_shxk_api_logs` 신설 + `callShxk()` 단일 진입점에 로깅 훅

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `supabase/migrations/20260722000001_iss661_shxk_api_logs.sql` | 신규 테이블 + RLS |
| `src/lib/shxk/client.ts` | `logShxkCall()` 훅 + `IS_MOCK` → `isMock()` 함수로 변경 |
| `tests/unit/shxk/client.test.ts` | 9개 테스트 케이스 신규 |

## 신규 테이블: `zen_shxk_api_logs`

| 컬럼 | 설명 |
|:-----|:------|
| method | ShxkServiceMethod |
| reference_no | params에서 추출한 reference_no |
| request_params | 요청 paramsJson 원본 |
| response_body | 응답 원문 |
| success | 성공 여부 |
| http_status | HTTP 상태 코드 |
| error_message | 에러 메시지 |
| is_mock | SHXK_TEST_MOCK 모드 여부 |

## 테스트

| TC | 내용 | 결과 |
|:---|:-----|:------|
| TC-SHXK-01 | mock 모드 → mock 응답 + 로그 insert 파라미터 검증 | ✅ |
| TC-SHXK-02 | mock 모드 + listorder reference_no 추출 | ✅ |
| TC-SHXK-03 | 실제 호출 성공 → 응답 + 로그 insert | ✅ |
| TC-SHXK-04 | HTTP 500 → 예외 throw + 실패 로그 | ✅ |
| TC-SHXK-05 | 네트워크 오류 → 예외 throw + 실패 로그 | ✅ |
| TC-SHXK-06 | **로그 insert 실패 → logger.error + callShxk 정상 응답** | ✅ |
| TC-SHXK-07 | 로그 실패 + 실제 호출 성공 → logger.error + 응답 정상 | ✅ |
| TC-SHXK-08 | 로그 실패 + HTTP 오류 → logger.error + 원래 예외 | ✅ |
| TC-SHXK-09 | params 없음 → reference_no null | ✅ |

## 브랜치

- `feature/teamb-iss661-shxk-api-logs` (base `TeamB_Dev`)
- PR #662

## 반려 사항 재작업 내역

### 1차 반려 (Jaison, PR#662 review)
- **task file/ACTIVE_TASK.md 누락**: TASK-B-175 생성 완료
- **신규 테스트 누락**: TC-SHXK-01~09 9종 추가 (로깅 실패 시나리오 3종 포함)
- **`IS_MOCK` → `isMock()`**: 테스트에서 `vi.stubEnv`가 모듈 로드 시점에 영향 주도록 수정
