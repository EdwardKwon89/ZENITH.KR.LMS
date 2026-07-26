# TASK-B-217: DEF-B-011 — UPS 접수취소/라벨폐기 성공 시 tracking_no 리셋 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#871](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/871) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **전제조건** | TASK-B-216(DEF-B-010, PR#870) 병합 완료 후 착수 — AGENCY UPDATE RLS 정책 선행 필요 |
| **상태** | 🔔 |

## 개요

`cancelUpsRegistration()`/`voidUpsLabel()`(`ups-labels.ts`)이 SHXK `removeorder` 성공 후 `zen_ups_labels`는 정리하지만 `zen_tracking_configs.tracking_no`는 리셋하지 않아, 취소/폐기된 등록의 옛 운송장번호가 화면에 계속 남습니다. jungjs가 실사용 중 발견, Jaison이 DB 실측으로 확정. 상세: `.agent/defects/DEF-B-011_...md`.

**착수 전 TASK-B-216(PR#870)이 `TeamB_Dev`에 병합됐는지 반드시 확인하세요** — 이 리셋 UPDATE가 AGENCY 세션에서도 동작하려면 그 RLS 정책이 먼저 있어야 합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `cancelUpsRegistration()` — `ups-labels.ts` (현재 504행 `if (deleteErr) {...}` 블록 다음, `revalidatePath` 직전)

```ts
    const { error: trackingResetErr } = await supabase
      .from('zen_tracking_configs')
      .update({ tracking_no: null })
      .eq('order_id', orderId);
    if (trackingResetErr) {
      logger.warn(`zen_tracking_configs tracking_no reset warning for order ${orderId}: ${trackingResetErr.message}`);
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");
```

### 2. `voidUpsLabel()` — `ups-labels.ts` (현재 614행 `if (unlockErr) {...}` 다음, `revalidatePath` 직전) 동일 패턴 추가.

두 곳 다 `logger.warn`만 남기고 전체 함수를 실패 처리하지 않습니다(핵심 취소/폐기는 이미 완료된 뒤의 부가 정리라 storage 삭제 경고와 동일한 논-블로킹 패턴).

## 착수 체크리스트

- [ ] `gh pr view 870 --json state,mergedAt`로 TASK-B-216 병합 완료 확인
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-217-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 217 나와야 정상)
- [ ] `cancelUpsRegistration()`/`voidUpsLabel()` 위 스펙대로 수정
- [ ] **로컬 DB로 실제 재현**: UPS 오더 mock 등록(`SHXK_TEST_MOCK=true`) → `tracking_no` 값 있는지 확인 → 취소/폐기 실행 → `tracking_no`가 실제로 NULL로 리셋됐는지 SQL 직접 조회로 확인 필수(mock 테스트만으로는 실제 UPDATE 실행 여부를 못 잡음)
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**: mock supabase에 `.update()` 호출이 `{tracking_no: null}`로 이뤄지는지 검증(취소/폐기 각각)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-217 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 871 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-011 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #871`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#870(toContain 유형, 재작업으로 해소), PR#844(🔍 설계확정 무시 착수), PR#837(타인 작업 기록 덮어쓰기). 이번 Task는 실제 로컬 DB 재현 검증이 필수입니다.

## [작업 결과]

- **커밋 해시**: `b63a5dad`
- **브랜치**: `feature/teamb-217-defb011-tracking-no-reset` (base: TeamB_Dev)
- **변경 파일**: `ups-labels.ts` (cancelUpsRegistration + voidUpsLabel) + `ups-labels-removeorder-failure.test.ts` (신규 2건)
- **수정 내용**:
  - `cancelUpsRegistration()`: 성공 경로에 `zen_tracking_configs.tracking_no = null` UPDATE 추가 (logger.warn, 논블로킹)
  - `voidUpsLabel()`: 동일 패턴
- **로컬 DB 실검증**: AGENCY 세션으로 `tracking_no = NULL` UPDATE → 1행 갱신 성공 (DEF-B-010 RLS 정책 선행 적용 확인)
- **빌드**: PASS
- **회귀 테스트**: 130 files / 857 tests ALL PASS
- **테스트**: behavioral 2건 신규 (cancelUpsRegistration + voidUpsLabel 각각 tracking_no 리셋 검증)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
