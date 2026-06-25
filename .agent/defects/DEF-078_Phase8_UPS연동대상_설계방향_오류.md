# DEF-078 — Phase 8 UPS 연동 대상 오인 — 설계 방향 전면 재검토 필요

> **DEF-ID**: DEF-078
> **발견일**: 2026-06-25
> **발견자**: Jaison (Team B PM) — JSJung 확인
> **긴급도**: 즉시
> **상태**: 미해결

---

## 발견 경위

JSJung이 수령한 UPS credentials가 "API key + token" 형식이라고 보고함.  
Dave TASK-B-022 리서치는 UPS 공식 REST API(OAuth 2.0, Client ID/Secret) 기준으로 진행됨.  
형식 불일치를 확인하기 위해 `docs/80_RawData/20260609 IBC和UPS Interface.pdf` 원문 재확인.

---

## 현상

PDF 내 UPS 인터페이스 문서 링크:

```
https://shxk.rtb56.com/usercenter/manager/api_document.aspx#gettrack
```

이 URL은 **UPS 공식 API(developer.ups.com)가 아닌 제3자 중간 플랫폼(rtb56.com)**의 API 문서임.  
JSJung 확인 결과: **실제 연동 대상 = `shxk.rtb56.com`** (2026-06-25).

---

## 영향 범위

| 항목 | 영향 |
|:----|:-----|
| TASK-B-022 리서치 산출물 | ❌ UPS 공식 REST API 기준 — 실제 연동 대상과 불일치 |
| An-13 Phase 8 설계 문서 | ❌ 전면 재검토 필요 |
| IMP-136 UPS OAuth Client | ❌ OAuth 2.0 방식 → rtb56.com 인증 방식으로 변경 필요 |
| IMP-137 Ship API 레이블 발급 | ❌ Endpoint·Request 구조 변경 필요 |
| IMP-138 DB 마이그레이션 | ⚠️ 스키마 필드 일부 변경 가능성 |
| IMP-139 UpsTrackingProvider | ❌ Tracking API 구조 변경 필요 |
| IMP-140 E2E 테스트 | ❌ API mock 구조 전면 변경 |

---

## 권장 조치

1. **즉시**: IMP-136~140 착수 중단 유지 (현재 blocked 상태 유지)
2. **신규 리서치 TASK 발령**: `shxk.rtb56.com/usercenter/manager/api_document.aspx` 기반 재조사
   - 인증 방식 (API key + token 구조)
   - 레이블 발급 Endpoint
   - 트래킹 조회 Endpoint
   - 요청/응답 구조
3. **An-13 설계 문서 재작성** (Aiden)
4. **JSJung**: rtb56.com API 문서 접속 가능 여부 및 credentials 확인

---

## 관련 파일

- `docs/80_RawData/20260609 IBC和UPS Interface.pdf`
- `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` (재작성 필요)
- `docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md` (재검토 필요)
- GitHub Issues #106~110 (IMP-136~140)
