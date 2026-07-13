# TASK-B-030 — DEF-080: country_code ISO 2→3 변환 누락 수정 (IMP-142)

> **Task-ID**: TASK-B-030
> **생성일**: 2026-06-27
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-27)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ✅
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

- [x] `toIso3()` 헬퍼 함수 추가 (ZEN_A4 50줄 이하) — 7줄
- [x] `issueUpsLabel()` 흐름에서 ISO 2→3 변환 적용 확인
- [x] 빌드 PASS (`rtk npm run build`)
- [x] `rtk npm run test:regression` — 380/387 PASS (7건 pre-existing `p6-transport-policy.test.ts`, develop 동일)
- [x] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [x] 코드 커밋 해시 기재: `a68753c`
- [x] 문서 커밋 해시 기재: `d83d9df`
- [x] PR 생성 (`Closes #128`)

---

## [보완 지시] — Jaison (2026-06-28)

> Aiden PR #129 CHANGES_REQUESTED (2026-06-27) 반영

Baker는 아래 2건을 이행한 후 PR #129를 재제출한다.

| # | 항목 | 상세 |
|:-:|:-----|:-----|
| 1 | **DoD 문서 커밋 해시 기재** | DoD item 7(`문서 커밋 해시 기재`): `_(아래 기재)_` → `d83d9df` 기재. `[작업 결과]` 커밋표 문서 행: `_(문서 커밋 후 기재)_` → `d83d9df` 기재 |
| 2 | **ACTIVE_TASK.md ✅ → 🔔 정정** | 브랜치 내 ACTIVE_TASK.md 상태가 ✅로 설정되어 있음. ✅ 전환은 Aiden 단독 권한 — 🔔로 수정 후 커밋 |

**재제출 절차**:
1. `git checkout feature/teamb-task-b-030-country-code-iso`
2. task file DoD item 7 + `[작업 결과]` 커밋표 문서 행에 해시 `d83d9df` 기재
3. ACTIVE_TASK.md 상태 ✅ → 🔔 수정
4. `[Baker] docs: TASK-B-030 보완 — 문서 해시 기재 + ACTIVE_TASK 🔔 정정`으로 단일 커밋 후 PR #129 push
5. PR #129 완료 코멘트 작성

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

### 구현 요약

- `src/app/actions/operations/ups-labels.ts`:
  - `toIso3()` 헬퍼 함수 추가 (KR→KOR, US→USA, CN→CHN, JP→JPN)
  - `issueUpsLabel()` 내 `resolveShxkCode()` 호출 전 `toIso3()` 적용
  - 기존 `countryCode` (ISO2)는 `placeShxkOrder()`에 그대로 전달 (SHXK API ISO2 요구)
- 빌드 PASS | 회귀 380/387 PASS (7건 pre-existing)

### 커밋

| # | 해시 | 유형 | 내용 |
|:-:|:----|:----:|:----|
| 1 | `a68753c` | 코드 | `[Baker] fix: TASK-B-030 toIso3() 헬퍼 추가 — country_code ISO 2→3 변환 (IMP-142)` |
| 2 | `d83d9df` | 문서 | `[Baker] docs: TASK-B-030 완료 보고 — task file + ACTIVE_TASK 🔔` |

### 회귀

380/387 PASS, 7건 pre-existing (`p6-transport-policy.test.ts` — develop 동일, 비차단)

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-27 | Aiden (ZEN_CEO) | TASK-B-030 신규 발령 — DEF-080 · IMP-142 · Edward 승인 (Issue #128) |
| 2026-06-28 | Jaison | **❌ 보완 지시** — Aiden PR#129 CHANGES_REQUESTED 2건: ①DoD+[작업결과] 문서 커밋 해시 d83d9df 기재 ②ACTIVE_TASK.md ✅→🔔 정정 (R-17 자체선언 위반) |
