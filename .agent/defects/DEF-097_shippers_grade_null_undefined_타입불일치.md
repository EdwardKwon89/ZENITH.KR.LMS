# DEF-097 — `createAgencyShipper` grade 필드 null/undefined 타입 불일치로 CI 빌드 전면 실패

> **DEF-ID**: DEF-097
> **발견일**: 2026-07-07
> **발견자**: Aiden (Claude, ZEN_CEO) — Edward "GitHub Action 오류 후속 조치 확인" 질의로 PR Checks 실패 이력 조사 중 발견
> **긴급도**: 즉시
> **상태**: 수정 완료 (본 보고서와 함께 커밋)

---

## 발견 경위

PR#227(TASK-B-065, Baker) 병합 커밋(`8a8b9769`)에서 `src/app/actions/agency/shippers.ts:232`이 변경되며 `next build`(TypeScript 타입체크)가 실패하기 시작함. 이후 `develop`에 머지된 모든 후속 PR의 "PR Checks" CI가 동일 원인으로 계속 빨간불 상태였음.

---

## 현상

```
./src/app/actions/agency/shippers.ts:232:7
Type error: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.
> 232 |       grade: rest.shipper_type === 'INDIVIDUAL' ? (rest.grade ?? 'BRONZE') : null,
```

`npm run build`(Next.js 프로덕션 빌드)가 이 시점부터 실패 — `develop`이 사실상 빌드 불가 상태로 방치되어 있었음.

---

## 원인

`_linkShipperToAgency()`의 `data` 파라미터 타입이 `Pick<CreateAgencyShipperInput, 'shipper_type' | 'discount_rate' | 'grade'>`이며, `CreateAgencyShipperInput.grade`는 `grade?: string`(즉 `string | undefined`)로 정의됨. 그러나 호출부에서 CORPORATE 화주의 경우 `null`을 명시적으로 전달해 타입 불일치 발생.

---

## 영향 범위

- `develop` 브랜치 프로덕션 빌드 불가 (2026-07-07 09:39 ~ 본 수정 전까지)
- PR#227 이후 병합된 모든 PR의 CI(PR Checks) 지속 실패
- 런타임 동작 자체는 문제 없음 — `_linkShipperToAgency` 내부에서 `data.grade ?? null`로 재정규화되어 DB에는 항상 `null`/문자열로 정상 저장됨(타입 체크 실패일 뿐 로직 버그 아님)

---

## 조치 완료 내역

`grade: ... : null` → `grade: ... : undefined`로 수정 (1줄). DB 삽입 시 `data.grade ?? null` 정규화 로직은 그대로이므로 런타임 동작 완전 동일, 타입만 정합.

**검증**:
- `npx tsc --noEmit`: `src/` 하위 타입 오류 0건 확인
- `npm run build`(실 `npm install` 후, symlink 우회 없이): 프로덕션 빌드 성공 확인
- `npm run test:regression`: 485/485 PASS

---

## 관련 파일

- `src/app/actions/agency/shippers.ts` — 수정 파일 (L232)
- `src/types/agency.ts` — `CreateAgencyShipperInput.grade` 타입 정의 (L30)

---

## 예상 공수

Small (1줄 수정 — 완료, 원인 조사 포함 ~20분)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Aiden (Claude, ZEN_CEO) | 최초 작성 및 수정 완료 — Edward CI 오류 질의 계기 발견 |
