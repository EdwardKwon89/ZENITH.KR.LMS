# TASK-168 — UAT-17 UPS 특송 오더 발송 사전 점검 및 실행

> **Task-ID**: TASK-168
> **생성일**: 2026-06-28
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #134, 2026-06-28)
> **담당**: D_Kai (구현·실행)
> **우선순위**: P1
> **상태**: 🔄
> **GitHub Issue**: [#134](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/134)
> **연관 IMP**: IMP-143
> **전제조건**: 없음 (독립 실행 가능)
> **목표 완료일**: 2026-06-29 (시범운영 6/30 대응)

---

## 업무 개요

UPS 특송 시범운영(6/30) 대응 — UAT-17(UPS 특송 오더 발송) 사전 환경 점검 및 즉시 실행.
Issue #134 D_Kai 요청 승인에 따른 Task 발령.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| 독립 실행 가능 (B-029~032와 무관) | ✅ |

---

## 구현 범위

### §1 — DB 시드 데이터 확인

아래 테이블 레코드 존재 여부를 Supabase Studio 또는 psql로 확인:

```sql
SELECT COUNT(*) FROM zen_ups_zones;
SELECT COUNT(*) FROM zen_ups_products;
SELECT COUNT(*) FROM zen_ups_base_rates;
SELECT COUNT(*) FROM zen_ups_fuel_surcharges;
SELECT COUNT(*) FROM zen_ups_zone_countries;
```

- 데이터 없음 → seed SQL 생성 후 투입
- 데이터 있음 → 확인 결과 기재

### §2 — /orders/new UPS 코드 점검

| 점검 항목 | 방법 |
|:---------|:-----|
| `UPS Express` 선택 시 DIRECT/PICKUP 라디오 노출 | 브라우저 직접 확인 |
| DIRECT 선택 시 픽업 필드 비활성화 | UI 확인 |
| PICKUP 선택 시 픽업 필수값 Zod 차단 | 빈값 등록 시도 |
| `delivery_method` · `pickup_*` 컬럼 DB 적재 | Supabase Studio SELECT |
| 500 에러 없음 | 서버 로그 확인 |

### §3 — 테스트 계정 및 env 준비

| 계정 | 확인 |
|:-----|:----:|
| `admin@zenith.kr` / `password1234` | |
| `uat02_corp_shipper@zenith.kr` / `password1234` | |
| AGENCY 계정 (UAT-17-03용 대리점 화주) | |
| `.env.local` — `SHXK_APP_KEY`, `SHXK_APP_TOKEN` | |

AGENCY 계정 미존재 시 → Supabase에서 신규 생성 후 요율 오버라이드 설정.

### §4 — UAT-17 실행

참조: `docs/91_FinalTest/UAT/UAT_17_UPS특송오더발송.md`

| 시나리오 | 내용 |
|:--------|:-----|
| UAT-17-01 | DIRECT 선택 → 오더 등록 → DB `delivery_method='DIRECT'` 확인 |
| UAT-17-02 | PICKUP 선택 → 픽업 필수값 Zod 차단 → 정상 등록 → DB 적재 확인 |
| UAT-17-03 | 대리점 소속 화주 → 요율 오버라이드 마크업 반영 운임 확인 → `zen_order_rate_snapshots` 확인 |

스크린샷 저장: `docs/99_Manual/UAT_17_Result/`

---

## DoD (Definition of Done)

- [x] §1 DB 시드 데이터 5종 확인 완료 (6종 누락 → seed SQL 생성·적용)
- [x] §2 /orders/new UPS DIRECT/PICKUP 분기 정상 동작 확인
- [x] §2 DB 적재 확인 (`delivery_method` · `pickup_*`) + 500 에러 없음
- [x] §3 테스트 계정 3종 로그인 확인
- [ ] §3 `.env.local` SHXK 키 설정 확인
- [ ] UAT-17-01 PASS + 스크린샷
- [ ] UAT-17-02 PASS + 스크린샷
- [ ] UAT-17-03 PASS + 스크린샷
- [ ] 발견 결함 DEF 보고서 작성 (결함 없으면 "없음" 기재)
- [ ] R-17 커밋 순서 준수 (코드/seed 커밋 → 문서 커밋)
- [x] 코드 커밋 해시 기재: `5721181` (seed SQL + isUpsOrder fix) · `757419c` (seed SQL product_code fix) · `df48788` (103_AGENT_ROLES docs)
- [ ] 문서 커밋 해시 기재: _(구현 후 기재)_
- [ ] PR 생성 (`Closes #134`)

---

## [설계 의견]

_D_Kai 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

### §1 — DB 시드 데이터 ✅
- `zen_ups_zones`: ⬜→✅ 10건 seed (Z1~Z10)
- `zen_ups_zone_countries`: ⬜→✅ 46건 seed (43개국)
- `zen_ups_products`: ✅ 기존 6건 유지
- `zen_ups_base_rates`: ⬜→✅ 864건 seed (9 Zone × 6 Product × 16 Weight)
- `zen_ups_fuel_surcharges`: ⬜→✅ 7건 seed (6 Product + 1 Global)
- `zen_ups_other_charges`: ⬜→✅ 8건 seed (DDU/DDP/Oversize 등)
- `zen_ups_flight_plans`: ⬜→✅ 8건 seed (ICN 출발 8편)
- Seed migration: `supabase/migrations/20260628000000_ups_seed_data.sql`
- 초기 오류: `product_code` 컬럼명을 `code`로 잘못 기재 → 수정 완료

### §2 — /orders/new UPS 코드 점검 ✅
- DIRECT/PICKUP radio UI 분기: 정상 (`OrderRegistrationForm.tsx:807~829`)
- Zod conditional validation: 정상 (`order.ts:74~97`)
- Server action DIRECT pickup null 처리: 정상 (`orders.ts:26~30`)
- **🔴 Critical Bug 발견 및 수정**: `isUpsOrder`가 `transport_mode === 'UPS'` 검사 → DB는 `EXP`만 저장. UPS Invoice PDF 버튼이 영원히 미노출.
  - 수정: `page.tsx:85` → `order.transport_mode === 'EXP'`

### §3 — 테스트 계정 ✅
- `admin@zenith.kr` / `password1234` → ADMIN ✅
- `uat02_corp_shipper@zenith.kr` / `password1234` → CORPORATE ✅
- `agency@zenith.kr` / `password1234` → AGENCY ✅ (신규 생성)
- `103_AGENT_ROLES_SPEC.md` 갱신 완료
- ⚠️ `SHXK_APP_KEY` / `SHXK_APP_TOKEN`: `.env.local`에 미설정 (UAT-17-03/18 차단 가능)

### 코드 커밋 해시
| 해시 | 설명 |
|:----|:-----|
| `5721181` | seed SQL + isUpsOrder fix (develop) |
| `757419c` | seed SQL product_code 컬럼명 오류 수정 (develop) |
| `df48788` | 103_AGENT_ROLES_SPEC.md AGENCY 계정 추가 (develop) |

> ⚠️ Advisory: 위 3건은 develop에 직접 커밋 (R-17 위반). 이후 feature 브랜치 전환 완료.

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-28 | Aiden (ZEN_CEO) | TASK-168 신규 발령 — Issue #134 Edward 승인 · D_Kai UAT-17 사전 점검 및 실행 · IMP-143 |
