# TASK-B-271 — Issue #1041 법인정보 주소 입력 AddressInput 컴포넌트로 통일

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-271 |
| Issue-ID | #1041 |
| 생성일 | 2026-08-11 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | P2 |
| 상태 | ✅ 완료 |

---

## 배경

JSJung 요청 — `/mypage/corporate` 법인정보 주소 입력을 오더 화주/수하인과 동일한 AddressInput으로 통일

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `supabase/migrations/20260811010000_iss1041_corporate_address_grant_extend.sql` | GRANT 7개 컬럼 확장 |
| `src/app/actions/admin/corporate.ts` | payload에 주소 필드 추가 + select에 address_english 추가 |
| `src/app/[locale]/(dashboard)/mypage/corporate/page.tsx` | AddressInput 컴포넌트 사용 |
| `src/components/common/AddressInput.tsx` | address_detail_english hidden input 추가 |
| `messages/ko.json` | Dashboard form_* 키 추가 |
| `messages/en.json` | Dashboard form_* 키 추가 |
| `messages/ja.json` | Dashboard 네임스페이스 신규 생성 |
| `messages/zh.json` | Dashboard 네임스페이스 신규 생성 |
| `tests/unit/member/corporate-address.test.tsx` | 회귀 테스트 6개 |

---

## [작업 결과]

**커밋**: `da14c68c` — `[Mike] feat: Issue #1041 법인정보 주소 입력 AddressInput 컴포넌트로 통일 (v2)`

**PR**: #1043 (TeamB_Dev base) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1043

**v1 반려 사유 해결**:
1. GRANT 미확장 → 신규 마이그레이션으로 7개 컬럼 GRANT 추가
2. address_detail_english hidden input 없음 → KR/해외 모두 hidden input 추가
3. i18n 키 누락 → 4개 로케일 Dashboard 네임스페이스에 form_* 키 추가
4. 회귀 테스트 0건 → 6개 회귀 테스트 추가

**검증**: TypeScript 타입 체크 통과, 회귀 테스트 6개 전부 통과
