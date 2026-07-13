# TASK-B-037 — DEF-084 `OutboundProcessForm.tsx` 재발급 버튼 pkgs.find() scope 오류 수정

> **Task-ID**: TASK-B-037
> **생성일**: 2026-06-28
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-28, Issue #110 Task 발령 요청)
> **담당**: Dave (Team B)
> **우선순위**: P2
> **상태**: 🚫
> **GitHub Issue**: [#143](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/143)
> **연관 IMP**: IMP-140
> **연관 DEF**: DEF-084
> **전제조건**: TASK-B-036 §2 실행 중 DEF-084 실제 재현 확인 (Jaison 권고)
> **목표 완료일**: 2026-06-29

---

## 업무 개요

`OutboundProcessForm.tsx` 재발급 버튼 onClick의 `pkgs.find()` scope 오류(DEF-084)가 TASK-B-036(E2E-26-06 재실행) 중 실제 재현 확인 시 수정 착수. 재발급 버튼 클릭 시 `handleReissue('')` 호출로 서버 액션 미호출되는 버그.

> ⚠️ **착수 조건**: TASK-B-036 §2에서 DEF-084 재현 확인 + Aiden 착수 승인(🚫→⬜) 후 진행.  
> 미재현 시 본 Task 취소(➖) 가능.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-036 §2 실행 중 DEF-084 재현 확인 | 🚫 |
| Aiden 착수 승인 (🚫→⬜) | 🚫 |

---

## 구현 범위

### §1 — 버그 수정

**파일**: `src/components/warehouse/OutboundProcessForm.tsx` (line 559~562)

```typescript
// 수정 전 (버그):
onClick={() => handleReissue(pkgs.find(p => p.ups_labels?.some(l => l.is_voided))?.id ?? '')}

// 수정 후 — pkg.id 직접 사용:
onClick={() => handleReissue(pkg.id)}
```

> `pkg`가 렌더링 시점의 현재 package를 가리키는 경우 직접 사용. `pkg` scope 접근 불가 시 대안:
> ```typescript
> // 대안: fetchData 응답에 ups_labels 관계 포함하도록 쿼리 보강
> ```

### §2 — 빌드 확인

```bash
rtk npm run build
```

### §3 — E2E-26-06 재검증

```bash
rtk npx playwright test tests/e2e/e2e-26-ups-label-flow.spec.ts --reporter=line
```

기대 결과: E2E-26-06 재발급 버튼 클릭 → `handleReissue` 정상 호출 → PASS.

### §4 — 회귀 테스트

```bash
rtk npm run test:regression
```

---

## DoD (Definition of Done)

- [ ] §1 `pkgs.find()` → `pkg.id` 직접 사용 수정 완료
- [ ] §2 `npm run build` PASS
- [ ] §3 E2E-26-06 재발급 버튼 클릭 플로우 정상 동작 확인
- [ ] §4 `npm run test:regression` PASS + 결과 기재
- [ ] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [ ] 코드 커밋 해시 기재: _(구현 후 기재)_
- [ ] 문서 커밋 해시 기재: _(구현 후 기재)_
- [ ] PR 생성 (`Closes #143`)

---

## [설계 의견]

_Dave 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Dave 완료 후 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-28 | Aiden (ZEN_CEO) | TASK-B-037 신규 발령 — DEF-084 pkgs.find() 수정 · Dave · Issue #143 · 전제: TASK-B-036 재현 확인 · Edward 승인 |
