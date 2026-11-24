# TASK-1179: Issue #1498 — `scripts/seed-local.ts` 실사용자·실사업자 정보 가상 값 교체

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1498](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1498) |
| **수행(Worker)** | Riley (Team A, `[Gemini]`) |
| **검증(Auditor)** | Aiden (Team A, ZEN_CEO) (R-01) |
| **선행 근거** | IS #1487 · IS #1490 후속 |
| **우선순위** | P1 (`priority:p1`, `team:a`, `type:fix`) |
| **상태** | 완료 보고 (`status:review`) |
| **브랜치** | `feature/teama-task-1179-seed-local-pii-masking` |

> **공개 저장소 기준 (IS #1498)**: 본 문서에는 구체 이메일·성명·전화번호·주소·사업자번호를 기재하지 않으며, 사용 명령과 전후 건수(`N건 교체, 잔존 0건`)만 기록합니다.
>
> **로컬 DB 안내 (R-08-2)**: 시드 계정 이메일·조직 정보가 가상 값으로 교체되었으므로, 기존 로컬 DB에는 옛 계정이 남아 있을 수 있습니다. 로컬 검증 전 `supabase db reset --yes` 후 시드 재실행(`npx tsx scripts/seed-local.ts`)이 필요합니다.

---

## 1. 교체 요약 (`scripts/seed-local.ts`)

1. **실사용자·실사업자 정보 가상 값 교체**:
   - 계정 이메일 → `shipper-a@example.test`, `shipper-b@example.test` (`example.test` 계열)
   - 성명·상호·대표자명 → `Shipper A Contact`, `Shipper B Co`, `Shipper B Contact`, `홍길동`
   - 전화번호 → `010-0000-0000`, `010-0000-0001`, `010-0000-0002`
   - 주소·상세주소·영문주소 → 가상 도로명·건물명(우편번호·국가·시도 코드 형식 유지)
   - 사업자번호 → `000-00-00001`, `000-00-00002`, `000-00-00003`
   - 주석·변수명 → `"가상 주소/사업자번호"`, `"가상 등록정보"`, `shipperBOrg` / `shipperB`로 정정
2. **시드 로직·비밀번호 처리 무변경**:
   - 오더 7건(`ZEN-2026-000001~007`) + 기본 E2E 오더 7건 + `UPS-SEED-AGENCY-001` 1건(총 15건), 스냅샷, 할인 정책, `createUser` 비밀번호 처리 방식 모두 그대로 유지 (`src/` 변경 0건).

---

## 2. 전후 grep 대조표 (사용 명령만 기재)

- **사용 명령**:
  - `rg -n "<비공개_대상_패턴>" scripts/seed-local.ts`
  - `rg -n -i "<비공개_대상_패턴>" scripts/ tests/ supabase/ | grep -v "^scripts/seed-local\.ts:"`

| 점검 범위 | 정리 전 | 정리 후 | 비고 |
|:--|--:|--:|---|
| `scripts/seed-local.ts` (실사용자·실사업자·전화·주소·사업자번호) | **42줄** | **0줄** | 42줄 교체, 잔존 **0건** |
| 기타 `scripts/` · `tests/` · `supabase/` | **0줄** | **0줄** | 다른 코드·테스트 파일 의존/잔존 **0건** |

---

## 3. 검증 결과

1. **로컬 Supabase 시드 및 멱등 재실행 (`http://127.0.0.1:54321`)**:
   - 본 환경에서는 설치된 `supabase` CLI(v3.0.0)가 `supabase/config.toml`의 `[inbucket]` 설정을 거부해 `supabase db reset --yes` 실행이 CLI 단계에서 중단됨(`config.toml` 무수정 원칙에 따라 미변경).
   - 구동 중인 로컬 Supabase에 `npx tsx scripts/seed-local.ts` 1차 실행 → **PASS** (`All seed data integrity checks passed`).
   - 동일 명령 2차 재실행(멱등성) → **PASS** (신규 중복 생성 없이 기존 건수 유지, 무결성 검증 통과).
   - **시드 결과 건수 대조**: 오더 **15건** (기본 7 + Agency 1 + Multi-tier 7), 조직 **25개**, 프로필 **19명** (역할 분포: `ADMIN` 3, `MANAGER` 1, `OPERATOR` 1, `AGENCY` 3, `SUB_ADMIN` 1, `AGENCY_SHIPPER` 4, `CORPORATE` 3, `INDIVIDUAL` 2, `CARRIER` 1 — 교체 전 설계 구조와 동일).
2. **전체 회귀 테스트 (`npm run test:regression`)**:
   - `Test Files 274 passed (274)` / `Tests 2022 passed (2022)` (`649.29s`, 로컬 DB 연동 테스트 포함 ALL PASS)
3. **`src/` 변경**: **0건** (`git diff --name-only origin/develop -- src/` 0건).

---

## 4. DoD 체크리스트
- [x] `scripts/seed-local.ts` 실사용자·실사업자 정보 잔존 0건 (전후 건수, 사용 명령만 기재)
- [x] 다른 `scripts/` · `tests/` · `supabase/` 파일 발견 목록 점검 (0건 확인; 문서 참조 목록 §5 제출)
- [x] 시드 재실행·멱등·건수 대조 증적, 회귀 전체 PASS
- [x] `supabase db reset` 안내 문구 기재, 시드 로직 무변경(diff 확인)
- [x] `src/` 변경 0건, R-17 준수, 운영 접근 없음

---

## 5. Aiden 확인 요청 (범위 밖 · 질문 목록)

1. **문서 내 잔존 참조 확인**: `.agent/VIOLATION_TRACKER.md`(26·112행 등 작성자 표기) 및 Team B 소유 문서(`TASK-B-*`·`DEF-B-*`)에 실사업자/계정/작성자 참조가 남아 있으며, `.agent/tasks/TASK-059_260522_UAT_인증창고어드민_DKai.md:77`에 `123-45-67890` 예시가 있습니다. 본 PR은 `scripts/seed-local.ts` 한정 수정이므로 별도 문서 정리가 필요한지 확인 요청.
2. **`supabase/config.toml` `[inbucket]` CLI v3 호환성**: 로컬 `supabase` CLI v3.0.0에서 `[inbucket]` 키로 인해 `db reset`이 거부되는 현상이 있어 별도 이슈/정비 필요 여부 확인 요청.

---

## 6. [작업 결과]

- **코드 커밋**: `2b4438ebd6a83ef0a7a373085af74fb8a7e02909` (`[Gemini] fix: TASK-1179 scripts/seed-local.ts 실사용자·실사업자 정보 가상 값 교체 (#1498)`)
