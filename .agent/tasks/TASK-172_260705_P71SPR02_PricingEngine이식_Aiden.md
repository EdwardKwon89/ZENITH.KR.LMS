# TASK-172 — Phase 7.1 SPR-02: 미병합 브랜치 코드 이식 검토 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-172 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Aiden (Claude, ZEN_CEO) |
| **Worker / Auditor** | Aiden(구현) / Aiden(자가검증) — TASK-171과 동일 사유 |
| **우선순위** | P1 |
| **전제조건** | TASK-171 ✅ |
| **관련 IMP** | IMP-145 |
| **브랜치** | `feature/teama-phase71-ups-rate-management` |
| **상태** | 🔔 |

---

## [목표]

`feature/ups-spr03-bkai-rates-admin`(TASK-141·146, 미병합) 코드를 검토하여 재사용 가능한 부분을 판별하고, `pricing-engine.ts` 핵심 로직을 이식한다.

## [검토 결과 — 그대로 이식하지 않은 이유]

브랜치 코드를 무비판적으로 rebase하지 않고 파일별로 검토 후 결정:

| 파일 | 결정 | 사유 |
|:----|:----|:----|
| `src/lib/ups/pricing-engine.ts` | **이식(보강)** | TASK-173에서 원가+7%·대형포장물룰 추가하여 신규 작성 |
| `src/types/ups.ts` 추가분 | **이식(추가만)** | 기존 타입 삭제 없이 신규 타입만 추가 |
| `src/app/actions/ups/rates.ts` | **이식 안 함** | develop의 현재 버전이 더 최신(TASK-B-055가 오늘 join 추가로 개선함) — 브랜치 버전으로 덮어쓰면 오히려 퇴행 |
| `src/app/actions/ups/rates-mutation.ts` | TASK-175로 이관 | Admin UI CRUD Action — UI 작업과 함께 처리 |
| `src/components/admin/ups-rates/*` | TASK-175로 이관 | 검토 중 버그 4건 발견(아래) — UI 작업 시 수정 반영 예정 |
| `src/components/ui/{dialog,table,tabs}.tsx` | TASK-175로 이관 | 자체 검증 필요 없는 단순 컴포넌트, UI 작업과 함께 이식 |
| `src/app/actions/warehouse.ts` (+1줄) | **이식 안 함** | 요금관리 범위 밖(창고 기능), 현재 develop과 무관한 변경 — 스코프 오염 방지 |
| `src/components/warehouse/InboundProcessForm.tsx` (+97줄) | **이식 안 함** | 동일 사유. TASK-150 이후 창고 UI가 이미 크게 변경되어 있어 blind merge 시 회귀 위험 |
| `tests/unit/logistics/inbound.test.ts` | **이식 안 함** | 위 InboundProcessForm 변경과 짝 — 함께 제외 |
| `tests/integration/p7-ups-pricing.test.ts` | **이식 안 함** | TASK-173에서 신규 작성한 `tests/unit/ups/pricing-engine.test.ts`가 동일 대상을 더 포괄적으로(원가+7%·대형포장물 포함) 커버 |
| `tests/unit/ups/rates-actions.test.ts` | 미이식 | 현재 `rates.ts`(develop 버전) 기준 테스트 부재 확인 — TASK-175/177에서 필요시 보강 |

## [TASK-146 재작업 시 발견한 버그 — TASK-175 반영 예정]

브랜치의 `rates-mutation.ts`를 그대로 쓰지 않고 TASK-175에서 수정 후 반영할 4건:
1. `updateUpsZone`/`updateUpsProduct`/`deactivateUpsBaseRate`/`updateUpsOtherCharge`가 `updated_at` 컬럼을 SET하지만 해당 테이블(`zen_ups_zones`·`zen_ups_products`·`zen_ups_base_rates`·`zen_ups_other_charges`)에 `updated_at` 컬럼이 없어 UPDATE 실패 — TASK-175에서 컬럼 추가 필요
2. `baseRateSchema`/`otherChargeSchema`의 `currency` 기본값이 `'USD'`로 되어 있으나 실제 사업 통화는 KRW(DB 컬럼 기본값도 `'KRW'`) — TASK-175에서 정정
3. `revalidatePath('/(dashboard)/admin/ups-rates', 'page')` — 라우트 그룹 세그먼트가 실제 URL에 포함되지 않아 무효. 프로젝트 관례(`revalidatePath('/admin/ups-rates')`)로 정정 필요
4. `UpsRatesAdminPage.tsx`가 `useTranslations('admin.ups_rates')`를 사용하나, 실제 i18n 네임스페이스는 대문자 `Admin`이며 `Admin.ups_rates` 키 자체가 아예 존재하지 않음 — TASK-175에서 i18n 키 신규 작성 필요

## [DoD]

- [x] 브랜치 파일 전체 목록 검토 및 이식/제외 결정 기록(상기)
- [x] `pricing-engine.ts` 핵심 로직(Zone 탐색·부피중량·유류할증·OC 합산) 이식 확인 — TASK-173에서 신규 파일로 통합 작성
- [x] `types/ups.ts` 신규 타입 추가(기존 타입 삭제 없음) 확인
- [x] `npx tsc --noEmit` 전/후 오류 파일 목록 비교(18개 파일, 동일) — **신규 오류 0건** 확인 (임시 이동 후 재검증으로 pre-existing 확정)
- [x] `npm run test:regression` 전체 PASS — **407/407**(TASK-173 신규 14건 포함)

## [작업 결과]

TASK-172·173은 연속 작업으로 진행되어 코드 커밋은 TASK-173에 통합 기재.

## [발견 이슈]

없음. (rates-mutation.ts 버그 4건은 담당 Task 범위 내 — TASK-175에서 직접 수정 예정이므로 R-18 별도 보고 대상 아님)
