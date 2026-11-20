# TASK-1166 / DEF-153 — R-10 UI 증적 결과 (Issue #1386)

- **일자**: 2026-11-18 KST
- **환경**: 로컬 Supabase(`127.0.0.1:54321`) + `npm run dev`(Next.js 16.4.6, Turbopack, `localhost:3000`)
- **계정**: `shipper@zenith.kr`(CORPORATE) / `admin@zenith.kr`(ADMIN) / `carrier@zenith.kr`(CARRIER)
- **대상 오더**: `4673d00f-0d5b-4339-91c6-d75b6b75c69f` (`ZEN-2026-000006`, UPS)

> 본 문서는 Public 저장소 산출물이므로 **요약값만** 기재한다. 상세 유출 경로·실측 수치는 비공개 Security Advisory(`GHSA-hx46-6xqh-88fc`) 참조.

## 1. 캡처 목록

| # | 파일 | 세션 | 경로 | 결과 |
|:--|:--|:--|:--|:--|
| 01 | `01_shipper_orders_new.png` | 화주 | `/ko/orders/new` | 오더 등록 폼 정상 렌더(운송 옵션 영역 포함) |
| 02 | `02_shipper_order_detail_route.png` | 화주 | `/ko/orders/{id}` | 오더 상세·경로 최적화 섹션 정상 |
| 03 | `03_shipper_ups_detail_snapshot.png` | 화주 | `/ko/orders/{id}/ups-detail` | 스냅샷 카드 정상, **원가·마진 미표시** |
| 04 | `04_admin_rates.png` | 관리자 | `/ko/admin/rates` | 요율 목록 정상(전체 운송사) |
| 05 | `05_admin_rate_cards.png` | 관리자 | `/ko/admin/rate-cards` | `/ko/admin/rates` 로 연결(기존 라우팅), 목록 정상 |
| 06 | `06_admin_ups_detail_snapshot.png` | 관리자 | `/ko/orders/{id}/ups-detail` | 관리자 화면 정상(원가 필드 게이트 유지) |
| 07 | `07_admin_error_logs.png` | 관리자 | `/ko/admin/error-logs` | **신규 ERROR 0건** |
| 08 | `08_carrier_rates.png` | 운송사 | `/ko/admin/rates` | "파트너 조회 모드", 자기 운송사 카드 0건 → `No results found.` |
| 09 | `09_carrier_rates_own_rows_only.png` | 운송사 | `/ko/admin/rates` | **자기 운송사 3행만 표시**(아래 §2) |

## 2. CARRIER "자기 행 정상 조회" 양성 증적

로컬 시드의 `carrier@zenith.kr`(Fast Carrier Ltd)은 **자기 요율 카드가 0건**이라 양성 증적을 만들 수 없다.
이에 로컬 DB에서만 `zen_carriers.org_id` 1행을 임시로 같은 org 로 매핑해 **자기 운송사 카드 3건**을 보이게 한 뒤 캡처하고 **즉시 원복**했다.

| 단계 | 결과 |
|:--|:--|
| 임시 매핑 후 운송사 화면 | **3행 · Korean Air Cargo 단일**(타 운송사 0행) |
| 원복 후 PostgREST `zen_rate_cards` | **0행** (자기 카드 0건 상태로 복귀) |
| 원복 확인 | `zen_carriers.org_id IS NOT NULL` = 3행(원래 상태) |

## 3. 화면 텍스트 검사

캡처 시 `document.body.innerText`를 수집해 원가·마진 관련 문자열 노출 여부를 확인했다.

| 세션 | 페이지 | `carrier_cost` | `마진` |
|:--|:--|:--:|:--:|
| 화주 | `/ko/orders/new` | false | false |
| 화주 | `/ko/orders/{id}` | false | false |
| 화주 | `/ko/orders/{id}/ups-detail` | false | false |
| 관리자 | `/ko/admin/rates` | false | false |
| 관리자 | `/ko/orders/{id}/ups-detail` | false | false |
| 운송사 | `/ko/admin/rates` | false | false |

> 관리자 화면은 라벨이 한국어(예: "운송 원가")로 표시되어 위 문자열 검사에 걸리지 않는다. 관리자 원가 편집 기능 자체는 `/ko/admin/rates` 편집 폼에서 유지된다(코드 변경 없음).

## 4. 오류 로그

`zen_error_logs` 최근 90분(캡처 세션 포함) 조회 결과 **0건**. `/ko/admin/error-logs` 화면도 신규 ERROR 없음.

## 5. 재현 방법

```bash
# 1) 로컬 스택 + 시드
npx supabase start
npx supabase migration up --local
npm run db:seed

# 2) 앱
npm run dev

# 3) 캡처
node scripts/task1166-r10-screenshot.js
```
