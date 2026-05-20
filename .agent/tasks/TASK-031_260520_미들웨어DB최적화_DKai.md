# TASK-031 — 미들웨어 DB 호출 최적화 (JWT-only 검증)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-031 |
| IMP-ID | IMP-021 |
| 생성일 | 2026-05-20 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | IMP-003(proxy.ts 마이그레이션) ✅ 완료 · TASK-030 완료 후 순차 권장 |
| 상태 | 🔔 검토 요청 — Aiden 검토 대기 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/proxy.ts`(구 middleware.ts, IMP-003 완료)가 모든 요청에서 Supabase Auth + `zen_profiles` JOIN 쿼리를 수행함.
Edge Runtime에서 매 요청마다 `updateSession()` → DB 쿼리 → 50~150ms 추가 지연 발생.

- **목표**: JWT 검증만으로 인증 처리, 프로필은 최초 로드 시만 조회
- DB 호출을 Request-scoped 캐시로 격리하거나 JWT payload에서 역할 정보 직접 추출

참조: `scratch/post_launch_improvements.md §IMP-021` · `src/proxy.ts`

> **⚠️ 주의**: proxy.ts 수정은 Auth Guard·Org Guard·i18n 전체에 영향.
> `gitnexus_impact` HIGH/CRITICAL 반환 시 반드시 Aiden 보고 후 대기.
> 설계 의견 제출이 필요하다고 판단 시 📝 단계 사용 가능.

---

## 작업 지시

1. **본 파일 상태 → 🔄 (또는 📝), ACTIVE_TASK.md TASK-031 → 동일 반영**
2. `src/proxy.ts` 현재 DB 호출 패턴 전수 확인
3. `gitnexus_impact({target: "proxy", direction: "upstream"})` — 영향 범위 확인, HIGH/CRITICAL 시 Aiden 보고
4. 최적화 방식 결정:
   - **방식 A (권장)**: JWT payload에서 `role`·`org_id` 직접 추출 — DB 호출 완전 제거
   - **방식 B**: `createClient()` 결과 Request-scoped 캐시 (`React.cache` 패턴)
   - **방식 C**: 인증된 경로만 minimal DB 쿼리, 공개 경로 완전 스킵
5. 선택 방식 구현 후 Auth Guard·Org Guard·i18n 동작 회귀 필수 검증
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-031.log`
9. **코드 커밋**: `[D_Kai] perf: IMP-021 proxy.ts DB 호출 최적화 — JWT-only 검증`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-031 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-021 행 🔔 갱신**
13. **문서 커밋**: `[D_Kai] docs: TASK-031 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `proxy.ts` DB 호출 최적화 완료 (방식 선택 근거 기재)
- [ ] Auth Guard·Org Guard·i18n 동작 동일 유지 확인
- [ ] `gitnexus_impact` 결과 기록 (HIGH/CRITICAL 시 Aiden 승인 증적)
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[D_Kai] perf: IMP-021` 코드 커밋 완료 (해시 기재)
- [ ] `[D_Kai] docs: TASK-031` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-021 행 갱신

---

## 설계 의견 (D_Kai 작성)

> **사용 기준**: proxy.ts 수정 영향도가 높으므로 설계 의견 제출 권장.

### 분석

`src/lib/auth/proxy.ts` `authGuard()` — DB 호출부 (L67-72):
```typescript
const { data: profile } = await supabase
  .from('zen_profiles')
  .select(`status, org_id, role, zen_organizations ( type )`)
  .eq('id', user.id)
  .single();
```

**현재 JWT `app_metadata` 이미 포함 정보**:
| 필드 | app_metadata | DB 조회 필요? |
|:-----|:------------|:---------------|
| `role` | `user.app_metadata.role` (L62) | ❌ metadata로 충분 (ADMIN/ZENITH_SUPER_ADMIN 체크 L63) |
| `status` | `user.app_metadata.status` (L65) | ⚠️ metadata 우선, DB는 fallback (L75) |
| `org_type` | `user.app_metadata.org_type` (L64) | ⚠️ metadata 우선, DB는 fallback (L78-84) |

**핵심 발견**: `app_metadata`만으로도 L74-89의 모든 분기 처리 가능. DB 쿼리는 **metadata에 누락된 경우** fallback으로만 동작함. 즉, `app_metadata`에 `role`·`org_type`·`status`가 정상 세팅되어 있다면 DB 조회 자체를 스킵할 수 있음.

### 제안: 방식 A-1 — JWT 우선 + DB fallback 조건부 스킵 (권장)

| 항목 | 내용 |
|:-----|:------|
| **제안 방안** | **방식 A-1**: `app_metadata`에 role·org_type·status가 전부 존재하면 DB 쿼리 스킵. metadata 불완전 시에만 DB fallback (Request-scoped cache 적용) |
| **선택 근거** | • 최소 변경으로 80%+ DB 호출 제거 (정상 세션은 metadata 완비)<br>• fallback 유지로 회귀 제로 — metadata 누락 세션도 정상 동작<br>• `isFeatureEnabled('MAINTENANCE_MODE')`는 TASK-030 캐싱 완료로 추가 최적화 불필요<br>• **gitnexus_impact LOW** (1 caller: middleware, Auth module only) — Aiden 사전 승인 불필요 |
| **구현 상세** | 1. L67-72를 조건부 래핑: `if (!user.app_metadata.role \|\| !user.app_metadata.org_type \|\| !user.app_metadata.status)`<br>2. fallback 시에도 `React.cache()`로 Request-scoped 캐싱 (동일 요청 내 중복 조회 방지)<br>3. DB 조회 결과로 `orgType`·`userStatus` 재정의 로직(L74-89)은 동일 유지 |
| **예상 리스크** | • metadata 불완전 세션(로그인 후 첫 요청, 레거시 세션) — fallback이 정상 처리하므로 영향 없음<br>• 추후 Supabase Auth hook에서 `app_metadata` 갱신 로직 추가 권장 (현재 Task 범위 밖) |
| **대안 방안** | • **방식 B** (React.cache Request-scoped): DB 호출은 유지되나 중복 제거 — 개선 효과 미미<br>• **방식 C** (경로별 DB 스킵): 공개 경로 DB 미조회 — `org_type` 결정이 필요한 경로가 전체이므로 효과 제한적 |

### 권장 최종안

**방식 A-1** `app_metadata` 조건부 DB 스킵 + fallback Request-scoped 캐시 → 최소 변경·최대 효과·회귀 제로.

---

## 설계 확정 (Aiden 작성)

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | **방식 A-1 확정** — `app_metadata`에 `role`·`org_type`·`status` 3필드 전부 존재 시 DB 쿼리 스킵. 불완전 세션(필드 누락)에만 DB fallback + Request-scoped 캐시(`React.cache()`) 적용 |
| 수정·보완 사항 | ① fallback 발생 조건을 코드 내 주석으로 명시 (`// metadata 누락 세션 fallback: app_metadata 갱신 hook 미적용 레거시 세션`) ② fallback 시 `React.cache()`로 동일 요청 내 중복 DB 조회 방지 — IMP-059 패턴 계승 ③ `src/proxy.ts`의 `authGuard()` L67-72 조건부 래핑만 수정 범위로 한정 (orgGuard·i18n 별도 변경 금지) ④ 회귀 테스트에서 `app_metadata` 완비 세션·누락 세션 2가지 케이스 모두 커버 확인 필수 |
| 착수 승인 | ✅ 2026-05-20 Aiden 확정 — 즉시 🔄 착수 가능 |

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 최적화 방식 | 방식 A-1 — app_metadata role·org_type·status 3필드 전부 존재 시 DB 쿼리 스킵. 불완전 세션만 DB fallback + React.cache() |
| gitnexus_impact 결과 | LOW — 1 direct caller (middleware), Auth module only |
| 회귀 결과 | 209/209 ALL PASS |
| 코드 커밋 해시 | 5bc0653 |
| 문서 커밋 해시 | 00b717f |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
| 2026-05-20 | D_Kai (OpenCode) | 설계 의견 제출 — 방식 A-1 (app_metadata 조건부 DB 스킵 + fallback Request-scoped 캐시). 커밋 5691a1c |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — 방식 A-1 승인. fallback 주석 명시·React.cache() 적용·authGuard() 수정 범위 한정 조건 추가. 📝→🔄 착수 승인 |
| 2026-05-20 | D_Kai (OpenCode) | 구현 완료 — metadata 조건부 DB 스킵·React.cache() fallback·회귀 209/209 ALL PASS |
