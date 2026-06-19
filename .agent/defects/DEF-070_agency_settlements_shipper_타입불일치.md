---
name: DEF-070
description: "agency/settlements page — getAgencyShippers shipper 필드 배열 반환으로 TS 빌드 실패"
metadata:
  type: project
---

# DEF-070 — agency/settlements ShipperDropdownItem 타입 불일치

| 항목 | 내용 |
|:----|:----|
| **DEF#** | DEF-070 |
| **발견일** | 2026-06-19 |
| **발견 경위** | PR #42 (DEF-069 CI fix) CI 로그 분석 중 발견 |
| **긴급도** | High (모든 PR CI 빌드 실패 원인) |
| **담당** | Aiden (즉시 수정) |

## 현상

```
./src/app/[locale]/(dashboard)/agency/settlements/page.tsx:19:7
Type error: Type '{ shipper: { id: any; name: any; biz_no: any; status: any; }[]; ...}[]'
is not assignable to type 'ShipperDropdownItem[]'
```

## 원인

`getAgencyShippers()` Supabase 쿼리에서 FK join(`shipper:shipper_org_id (...)`)시
TypeScript 타입 추론이 `shipper` 필드를 배열(`[]`)로 추론.
`ShipperDropdownItem.shipper`는 단일 객체(`{ id: string; name: string } | null`)를 기대.

## 영향 범위

- `src/app/actions/agency/shippers.ts` — `getAgencyShippers` 반환 타입
- `src/app/[locale]/(dashboard)/agency/settlements/page.tsx` — shippers prop 전달
- CI 빌드 전체 실패 (`npm run build` 단계)

## 조치

`getAgencyShippers` 반환 시 `shipper` 필드를 배열→단일 객체 정규화.

## 상태

✅ PR #42 브랜치에 수정 포함 (2026-06-19 Aiden)
