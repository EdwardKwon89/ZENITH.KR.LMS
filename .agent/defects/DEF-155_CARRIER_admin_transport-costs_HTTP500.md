# DEF-155 | 운송사(`CARRIER`)가 `/admin/transport-costs` 진입 시 HTTP 500

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **Low** |
| **발견일 / 발견자** | 2026-11-18 / B_Kai (TASK-1156 §3·§3.1·§8.1 #3) — Aiden 등록 |
| **관련** | Issue #1338 · PR #1383 · DEF-147 |

## 현상
`CARRIER` 세션으로 `/admin/transport-costs` 진입 시 3회 반복 재현 모두 **HTTP 500**. 페이지 게이트(`checkPermission`)는 접근 차단을 의도하므로 기대값은 리다이렉트/403이다. 데이터 노출은 없고 오류 응답만 문제.

## 소유 팀 근거 (git log)
`admin/transport-costs/` 최근 이력 `[D_Kai]`(`99439d1a`, `ab50ae8f`) — Team A.

## 권장 조치
`checkPermission` 실패 경로가 500을 던지는 원인(예외 throw vs redirect) 확인 후 리다이렉트로 정정. DEF-147 P4 게이트(admin 레이아웃 서버 게이트) 구현 Task에 병합 가능.
