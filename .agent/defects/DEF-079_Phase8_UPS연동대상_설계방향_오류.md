# DEF-079 — Phase 8 UPS 연동 대상 오인 — shxk.rtb56.com 기준 재설계 필요

> **DEF-ID**: DEF-079
> **발견일**: 2026-06-25
> **발견자**: Jaison (Team B) — JSJung 현장 확인
> **긴급도**: 즉시
> **상태**: 미해결 (블로커 유지 중)

---

## 발견 경위

JSJung이 IBC로부터 수령한 credentials = API key + token 형식.
`docs/80_RawData/20260609 IBC和UPS Interface.pdf` 확인 결과, UPS 인터페이스 문서 링크:

```
https://shxk.rtb56.com/usercenter/manager/api_document.aspx#gettrack
```

JSJung 현장 확인 (2026-06-25): **실제 연동 대상 = `shxk.rtb56.com` 제3자 플랫폼**

---

## 문제

TASK-B-022 리서치 및 An-13 설계가 **UPS 공식 REST API (OAuth 2.0)** 기준으로 진행됨.
실제 연동 대상은 **`shxk.rtb56.com` 제3자 플랫폼**으로 인증 방식·Endpoint 구조가 전혀 다름.

| 구분 | 기존 설계 | 실제 연동 대상 |
|:--|:--|:--|
| 플랫폼 | UPS 공식 REST API | `shxk.rtb56.com` (제3자) |
| 인증 | OAuth 2.0 | API key + token |
| Endpoint | api.ups.com | shxk.rtb56.com 전용 |

---

## 영향 범위

- TASK-B-022 산출물 (`Phase8_UPS_API_리서치_결과.md`) ❌ 재작성 필요
- An-13 설계 문서 ❌ 전면 재검토 필요
- IMP-136~140 (Issue #106~110) — 블로커 유지

---

## 권장 조치

1. `shxk.rtb56.com` API 문서 기반 신규 리서치 Task 발령 (TASK-B-023)
2. An-13 재설계 (리서치 완료 후)
3. IMP-136~140 블로커 DEF-079 해제 후 재개

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-25 | Aiden (Claude, ZEN_CEO) | DEF-078 번호 충돌로 DEF-079 재채번. 보고서 파일 신규 작성. GitHub Issue #111 연동. |
