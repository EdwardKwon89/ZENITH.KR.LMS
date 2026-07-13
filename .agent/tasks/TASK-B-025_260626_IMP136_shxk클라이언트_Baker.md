# TASK-B-025 — IMP-136: shxk HTTP Client + config (Phase 8)

> **Task-ID**: TASK-B-025
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#106](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/106)
> **연관 IMP**: IMP-136
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §4·§5

---

## 업무 개요

shxk.rtb56.com HTTP 클라이언트 기반 모듈 구성 (IMP-136).
An-13 v2.0 §4·§5 명세 기준으로 구현.

---

## 전제조건

없음 — 즉시 착수 가능

---

## 구현 범위

### 신규 파일

```
src/lib/shxk/
├── config.ts        — BASE_URL, APP_TOKEN, APP_KEY 환경변수 로딩
└── client.ts        — shxkRequest<T>() 래퍼 구현
```

### config.ts 핵심

```typescript
export const SHXK_BASE_URL = process.env.SHXK_BASE_URL!;
export const APP_TOKEN = process.env.SHXK_APP_TOKEN!;
export const APP_KEY = process.env.SHXK_APP_KEY!;
```

### client.ts 핵심 (An-13 v2.0 §5)

```typescript
export async function shxkRequest<T>(
  serviceMethod: string,
  paramsJson: object
): Promise<{ success: number; data: T; cnmessage: string; enmessage: string }> {
  const body = new URLSearchParams({
    appToken: APP_TOKEN,
    appKey: APP_KEY,
    serviceMethod,
    paramsJson: JSON.stringify(paramsJson),
  });
  const res = await fetch(SHXK_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (json.success !== 1) {
    throw new Error(`shxk[${serviceMethod}] failed: ${json.enmessage || json.cnmessage}`);
  }
  return json;
}
```

### 환경변수 (.env.local 추가)

```
SHXK_BASE_URL=http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8
SHXK_APP_TOKEN=<실제값>
SHXK_APP_KEY=<실제값>
```

---

## DoD (Definition of Done)

- [ ] `src/lib/shxk/config.ts` 생성 — 환경변수 3종 로딩
- [ ] `src/lib/shxk/client.ts` 생성 — `shxkRequest<T>()` 구현
- [ ] `success !== 1` 시 `enmessage` 우선 에러 throw 구현
- [ ] ZEN_A4 함수 50줄 이하 준수
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-025 신규 발령 — An-13 v2.0 IMP-136 |
