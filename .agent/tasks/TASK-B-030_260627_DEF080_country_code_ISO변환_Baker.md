# TASK-B-030 — DEF-080: country_code ISO 2→3 변환 누락 수정 (IMP-142)

> **Task-ID**: TASK-B-030
> **생성일**: 2026-06-27
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-27)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#128](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/128)
> **연관 IMP**: IMP-142
> **연관 DEF**: DEF-080
> **전제조건**: TASK-B-025 ✅ (shxk client)
> **설계 참조**: [An-13 §5](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) · DEF-080 보고서

---

## 업무 개요

`issueUpsLabel()` 실행 시 한국 목적지 패키지의 country_code 포맷 불일치로 shipping method 조회 실패.
`zen_ports.country_code` CHAR(2) `'KR'` vs `zen_ups_shxk_country_map.country_code` VARCHAR(3) `'KOR'` 불일치 해소.

**방안 B**: `src/app/actions/operations/ups-labels.ts`에 ISO 2→3 변환 로직 추가.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-025 ✅ (shxk client) | ✅ |

---

## 구현 범위

### 수정 파일

```
src/app/actions/operations/ups-labels.ts
```

### 구현 방향 (방안 B)

`resolveCountryCode()` 반환 직후 또는 `resolveShxkCode()` 호출 전에 ISO 2→3 변환 적용.

```typescript
// ISO 3166-1 alpha-2 → alpha-3 변환 헬퍼 (zen_ups_shxk_country_map 기준)
function toIso3(code2: string): string {
  const map: Record<string, string> = {
    KR: 'KOR', US: 'USA', CN: 'CHN', JP: 'JPN',
    // zen_ups_shxk_country_map에 실제 등재된 국가 기준으로 확장
  };
  return map[code2] ?? code2;
}
```

- `toIso3()` 함수 추가 (ZEN_A4 50줄 이하)
- `resolveShxkCode()` 호출 전 `countryCode = toIso3(countryCode)` 적용
- `zen_ups_shxk_country_map`의 실제 seed 국가 코드 기준으로 맵 구성

---

## DoD (Definition of Done)

- [ ] `toIso3()` 헬퍼 함수 추가 (ZEN_A4 50줄 이하)
- [ ] `issueUpsLabel()` 흐름에서 ISO 2→3 변환 적용 확인
- [ ] 빌드 PASS (`rtk npm run build`)
- [ ] `rtk npm run test:regression` — 387/387 PASS
- [ ] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [ ] 코드 커밋 해시 기재: _(구현 후 기재)_
- [ ] 문서 커밋 해시 기재: _(구현 후 기재)_
- [ ] PR 생성 (`Closes #128`)

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_구현 완료 후 Baker 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-27 | Aiden (ZEN_CEO) | TASK-B-030 신규 발령 — DEF-080 · IMP-142 · Edward 승인 (Issue #128) |
