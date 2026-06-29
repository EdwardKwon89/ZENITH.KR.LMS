# TASK-B-037 — DEF-084: OutboundProcessForm.tsx 재발급 버튼 pkgs.find() scope 오류 수정

> **Task-ID**: TASK-B-037
> **생성일**: 2026-06-29
> **발령자**: Aiden (ZEN_CEO) — Issue #110 승인, Issue #143
> **담당**: Dave (구현)
> **우선순위**: P2
> **상태**: 🚫
> **GitHub Issue**: [#143](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/143)
> **연관 DEF**: DEF-084
> **전제조건**: TASK-B-036 §2 실행 중 DEF-084 실제 재현 확인

> ⚠️ **조건부 착수**: TASK-B-036 실행 중 DEF-084가 실제 재현되는 경우에만 착수. 미재현 시 Aiden에게 보고 후 Task 취소 여부 결정.

---

## 업무 개요

`OutboundProcessForm.tsx` 재발급 버튼 `onClick`에서 `pkgs.find()` 로직이 void 처리 후 갱신된 `ups_labels` 상태를 찾지 못해 `handleReissue`가 호출되지 않는 버그 수정 (DEF-084).

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-036 실행 중 DEF-084 실제 재현 확인 | 🚫 대기 중 |

---

## 구현 범위

### 수정 파일

```
src/components/warehouse/OutboundProcessForm.tsx
```

### 현재 코드 (버그 위치: line 559-562)

```typescript
// 현재 (버그)
const targetPkg = pkgs.find((p: any) =>
  (p.ups_labels || []).some((l: any) => l.is_voided)
);
if (targetPkg) handleReissue(targetPkg.id);
```

### 수정 방향

`history.map()` 렌더링 컨텍스트에서 현재 패키지(`pkg`)를 직접 참조하도록 변경:

```typescript
// 수정 후 — pkg.id 직접 사용
onClick={(e) => {
  e.stopPropagation();
  handleReissue(pkg.id);
}}
```

> 단, 실제 렌더링 구조에서 `pkg`(현재 패키지) 접근 가능 여부 사전 확인 필요. 불가한 경우 `item.order.order_packages[0].id` 등 대안 검토.

---

## DoD (Definition of Done)

- [ ] DEF-084 재현 확인 기록 (`[작업 결과]` 섹션 명시)
- [ ] `OutboundProcessForm.tsx` 재발급 버튼 `onClick` 수정
- [ ] 수정 후 재발급 버튼 클릭 → `handleReissue` 정상 호출 확인
- [ ] `rtk npm run build` PASS
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)
- [ ] PR 생성 (`Closes #143`)

---

## [설계 의견]

_착수 후 Dave 기재_

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
| 2026-06-29 | Jaison (Team B AI 총괄) | TASK-B-037 신규 생성 — Aiden Issue #110 승인 기반, Issue #143, 조건부 착수 |
