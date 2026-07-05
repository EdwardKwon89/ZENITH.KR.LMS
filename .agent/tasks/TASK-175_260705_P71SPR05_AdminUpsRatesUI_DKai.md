# TASK-175 — Phase 7.1 SPR-05: UPS 요율 Admin UI 완성 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-175 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | TASK-171~174 ✅ (전량 완료, `feature/teama-phase71-ups-rate-management` 브랜치에 존재) |
| **관련 IMP** | IMP-145 |
| **브랜치** | **`feature/teama-phase71-ups-rate-management`를 그대로 이어서 사용** (신규 브랜치 생성 금지 — 이유는 [착수 절차] 참조) |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## [착수 절차 — 일반 R-17 §0 Git 동기화와 다름, 반드시 확인]

이 Task는 **`develop`이 아니라 `feature/teama-phase71-ups-rate-management` 브랜치를 기반으로 작업한다.** 이 브랜치에 TASK-171~174(스키마·계산엔진·Action)가 이미 구현되어 있고, 아직 develop에 병합되지 않았기 때문이다.

```bash
git fetch origin
git checkout feature/teama-phase71-ups-rate-management
git pull origin feature/teama-phase71-ups-rate-management
# 신규 브랜치 만들지 말고 이 브랜치에 바로 커밋 (Aiden·D_Kai 공동 브랜치, Phase 7.1 전체를 하나의 PR로 묶음)
```

착수 전 로컬 Supabase에 최신 마이그레이션 반영 필요:
```bash
supabase db reset --local   # 20260705100000_imp145_ups_agency_pricing_policy.sql 포함 전체 재생성
```

## [배경]

`docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md`(Edward 승인 완료) §5 기준. TASK-146(미병합 브랜치)에서 Zone/제품 탭은 구현됐으나 기준요금·유류할증·OC 3탭은 Placeholder였고, 코드 자체에 버그 4건이 있어 **그대로 가져다 쓰지 말 것** — 아래 [반드시 확인할 참고 자료]와 [알려진 버그 4건]을 먼저 읽고 시작한다.

## [반드시 확인할 참고 자료]

1. `docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md` §5(UI 범위)
2. `.agent/tasks/TASK-172_260705_P71SPR02_PricingEngine이식_Aiden.md` — 미병합 브랜치 파일별 검토 기록 (이 Task의 버그 4건 출처)
3. 이미 구현된 산출물 (이 브랜치에 존재, 참고용):
   - `src/app/actions/ups/rates.ts` — 조회 Action 5종 (그대로 재사용)
   - `src/app/actions/ups/freight.ts` — `estimateUpsFreight()` (TASK-174, 견적 미리보기용으로 재사용 가능)
   - `src/types/ups.ts` — 전체 타입 정의
   - `supabase/migrations/20260705100000_imp145_ups_agency_pricing_policy.sql` — `zen_agency_pricing_policies` 스키마

## [작업 범위]

### 1. Server Actions 신규 — `src/app/actions/ups/rates-mutation.ts`

CRUD Action 10종 (Zone 4·제품 2·기준요금 2·유류할증 1·OC 2) + 신규 Agency 정책 CRUD 2종(`upsertAgencyPricingPolicy`, `getAgencyPricingPolicy`). ADMIN/MANAGER 역할 인증(`validateUserAction()`) 필수, Zod 검증, 각 함수 50줄 이하(ZEN_A4).

**아래 4건은 미병합 브랜치 원본 코드의 실제 버그다 — 그대로 옮기지 말고 수정해서 구현할 것:**

1. **`updated_at` 컬럼 부재**: `zen_ups_zones`·`zen_ups_products`·`zen_ups_base_rates`·`zen_ups_other_charges` 테이블에 `updated_at` 컬럼이 없다. Update 계열 Action(`updateUpsZone` 등)에서 `updated_at: new Date().toISOString()`을 SET하면 컬럼 부재로 실패한다. **선행 마이그레이션 신규 작성**: 4개 테이블에 `updated_at TIMESTAMPTZ DEFAULT NOW()` 추가 (파일명 예: `20260705110000_imp145_ups_admin_tables_updated_at.sql`).
2. **currency 기본값 오류**: Zod 스키마에서 `currency` 기본값을 `'USD'`로 하지 말 것 — 사업 통화는 KRW(DB 컬럼 기본값도 `'KRW'`). `'KRW'`로 지정.
3. **`revalidatePath` 형식 오류**: `revalidatePath('/(dashboard)/admin/ups-rates', 'page')`처럼 라우트 그룹 세그먼트를 포함하면 무효. 프로젝트 관례대로 `revalidatePath('/admin/ups-rates')`만 사용 (참고: `src/app/actions/admin/rate-cards.ts`, `customs-rates.ts`).
4. **i18n 네임스페이스 불일치**: `useTranslations('admin.ups_rates')`처럼 소문자로 쓰면 안 된다. `messages/{ko,en,zh,ja}.json`의 실제 네임스페이스는 대문자 `Admin`이다(`messages/ko.json`의 `Admin.ErrorLogs` 등 기존 키 참고). `Admin.ups_rates.*` 구조로 4개국어 키를 신규 작성할 것 — 현재 `Admin.ups_rates`는 **어느 언어 파일에도 존재하지 않는다**(직접 확인 필요, 없다고 가정하고 새로 작성).

### 2. Admin 요율 관리 페이지 — `src/app/[locale]/(dashboard)/admin/ups-rates/`

**6탭 구성** (An-14 §5 — 기존 5탭 계획에 Agency 정책 탭 추가):

| 탭 | 내용 | 비고 |
|:----|:----|:----|
| Zone 관리 | Zone 목록 + 국가 매핑 CRUD | |
| 제품 관리 | UPS 제품 코드 목록 CRUD | |
| 기준요금 | Zone × 제품 × 중량 요금표 CRUD | **Placeholder 아님 — 실제 등록/수정 폼 구현 필수** |
| 유류할증 | 주별 유류할증료 UPSERT | **Placeholder 아님 — 실제 구현 필수** |
| 부가요금(OC) | Other Charge 코드별 CRUD (현지통관 4종 포함 총 12종) | **Placeholder 아님 — 실제 구현 필수** |
| **Agency 할인율 정책** (신규) | `zen_agency_pricing_policies` CRUD — 대리점별 discount_rate 설정 | ADMIN/MANAGER 전용, R3 |

UI 컴포넌트 패턴은 `/admin/customs-rates` 또는 `/admin/delivery-rates`(테이블+모달 폼) 재사용. shadcn/ui 미설치 프로젝트이므로 `src/components/ui/{dialog,table,tabs}.tsx`를 신규(단순 React+Tailwind) 구현해야 한다 — 참고 구현이 필요하면 Aiden에게 요청.

### 3. NaviSidebar 서브메뉴

`src/components/layout/NaviSidebar.tsx`에 "UPS 요율 관리" 서브메뉴 추가 (ADMIN/MANAGER 역할 조건). 오늘 Team B가 NaviSidebar를 계속 건드리고 있으므로(TASK-B-053 등) **머지 전 rebase/충돌 확인 필수**.

### 4. i18n 4개국어

`messages/{ko,en,zh,ja}.json` — `Admin.ups_rates.title`, `Admin.ups_rates.tabs.*`, 6개 탭 각각의 컬럼 헤더·버튼 레이블·정책 탭 문구.

### 5. 테스트

`tests/unit/ups/rates-admin-actions.test.ts` 신규 — TC-UPS-ADMIN-01~07:
- Zone/제품/기준요금/유류할증/OC CRUD 5종 + Agency 정책 CRUD 1종 + ADMIN 역할 인증 검증 1종

## [DoD]

- [ ] 마이그레이션: 4개 테이블 `updated_at` 컬럼 추가
- [ ] Server Actions CRUD 12종 구현 (버그 4건 수정 반영 확인)
- [ ] Admin 페이지 6탭 구현 (기준요금·유류할증·OC **Placeholder 아닌 실제 CRUD** 확인)
- [ ] NaviSidebar 서브메뉴 추가 (Team B 변경분과 충돌 없음 확인)
- [ ] i18n 4개국어 키 추가 (`Admin.ups_rates.*` — 대문자 네임스페이스 확인)
- [ ] TC-UPS-ADMIN-01~07 신규 전량 PASS
- [ ] `npm run test:regression` 전체 PASS (현재 기준선 412 → 반드시 412 이상 유지 확인)
- [ ] `npx tsc --noEmit` 0 Errors (신규 코드 기준 — pre-existing 18개 파일 오류는 무시해도 됨, TASK-172 기록 참고)
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 신규 TC 등재
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

1. 코드 커밋 `[D_Kai] feat: TASK-175 IMP-145 UPS 요율 Admin UI`
2. 본 파일 `[작업 결과]` 작성 + 헤더 상태 🔔 + 커밋 해시 기재
3. `.agent/ACTIVE_TASK.md` TASK-175 행 ⬜→🔔
4. `scratch/IMP_PROGRESS.md` IMP-145 행 갱신
5. `check-R17-DoD` 실행 — 전항목 통과 확인
6. 문서 커밋 `[D_Kai] docs: TASK-175 완료 보고 — IMP-145 Admin UI 🔔`
7. **PR 생성 금지** — 이 브랜치는 TASK-171~177 전체를 묶어 Aiden이 최종 1개 PR로 생성한다. D_Kai는 브랜치에 커밋만 추가하고 push.

## [작업 결과]

| 항목 | 상태 |
|:-----|:----:|
| Migration: 4개 테이블 `updated_at` 컬럼 추가 (`20260705110000`) | ✅ |
| Server Actions `rates-mutation.ts` CRUD 12종 | ✅ |
| Admin 6-Tab UI (`/admin/ups-rates/`) — Zone·제품·기준요금·유류할증·OC·Agency정책 | ✅ |
| NaviSidebar "UPS 요율 관리" 서브메뉴 추가 (Master 그룹) | ✅ |
| RBAC MANAGER에 `/admin/ups-rates` 권한 추가 | ✅ |
| i18n 4개국어 (`Navigation.ups_rates` + `Admin.ups_rates.*`) | ✅ |
| `npx tsc --noEmit` 0 errors (신규 코드 기준) | ✅ |
| `npm run test:regression` 72 files / 412 PASS (기준선 유지) | ✅ |

**커밋**: `<커밋 해시 기입>`

**[발견 이슈]**

_(담당 Task 범위 밖 이슈 발견 시 기재. 없으면 "없음")__
