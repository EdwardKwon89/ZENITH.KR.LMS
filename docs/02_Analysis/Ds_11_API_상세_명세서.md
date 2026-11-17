# 📡 ZENITH_LMS API Specification (v2.1 Sync)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **최종 동기화:** 2026-04-27
> **상태:** **Synchronized** (Source Code & DB Schema 기반 전수 조사 완료)

본 문서는 ZENITH_LMS의 **Server Actions (Next.js)** 및 **Supabase RPC (PostgreSQL Functions)** 인터페이스를 정의합니다. 모든 신규 기능 개발 시 본 사양을 진실의 근거(Source of Truth)로 삼습니다.

---


## 📂 장(章)별 분할 문서 목차 (Index)

본 명세서는 문서 크기 제한(R-17 Hard Limit 1,000줄, 권장 ≤ 500줄) 준수 및 도메인별 유지보수성을 위해 `docs/02_Analysis/ds11/` 하위 9개 분할 파일로 구성됩니다 (TASK-1163 / Issue #1357).

| 순번 | 분할 파일 | 포함 장 (`## N.`) 및 절 범위 | 주요 대상 Server Action / RPC 도메인 | 줄 수 |
|:---:|:---|:---|:---|---:|
| 1 | [Ds_11_01_Auth_Master.md](./ds11/Ds_11_01_Auth_Master.md) | `## 1. 인증 및 세션` · `## 2. 마스터 데이터` | `login/actions.ts`, `master.ts`, `admin/{auth,member,organization,corporate,rbac,master*,exchange-rates,transport-policies}.ts` | 53줄 |
| 2 | [Ds_11_03_Orders_Warehouse.md](./ds11/Ds_11_03_Orders_Warehouse.md) | `## 3. 오더 관리` | `orders.ts`, `operations/{orders,bulk-orders,assigned-orders,order-services,address-book,warehouse,service-rates,tisa}.ts` | 48줄 |
| 3 | [Ds_11_04_Finance_Settlement.md](./ds11/Ds_11_04_Finance_Settlement.md) | `## 4. 정산 및 재무` (`§4.1` 인보이스·세금계산서, `§4.2` 정산·마감·조정) | `finance/{invoice,settlement,daily-billing,invoice-files,order-revenue-cost,shipper-invoices}.ts` | 141줄 |
| 4 | [Ds_11_05_Inventory_Tracking_Routing.md](./ds11/Ds_11_05_Inventory_Tracking_Routing.md) | `## 5. 인벤토리 관리` · `## 6. 실시간 트래킹` | `inventory.ts`, `tracking.ts`, `operations/{tracking,routing}.ts` | 65줄 |
| 5 | [Ds_11_07_RPC_Wallet_Schedule_Stats.md](./ds11/Ds_11_07_RPC_Wallet_Schedule_Stats.md) | `## 7. Supabase RPC` · `## 8. 선불 지갑 관리` · `## 9. 운항 스케줄` · `## 10. 통계 및 분석` | PostgreSQL RPC, `wallet.ts`, `schedules.ts`, `statistics.ts`, `misc/{wallet,dashboard}.ts` | 70줄 |
| 6 | [Ds_11_11A_UPS_Rates.md](./ds11/Ds_11_11A_UPS_Rates.md) | `## 11. UPS 특송 요금 관리` (`§11.1` ~ `§11.11`, `§11.15` ~ `§11.17`) | `ups/{freight,rates,rates-mutation,rates-public,pricing-schedule}.ts`, `operations/ups-labels.ts` | 361줄 |
| 7 | [Ds_11_11B_UPS_Agency_Actuals.md](./ds11/Ds_11_11B_UPS_Agency_Actuals.md) | `## 11. UPS 특송 요금 관리 (계속)` (`§11.12` ~ `§11.14`) | `agency/{shipper-link,shippers,zone-discounts}.ts`, `finance/{ups-actual-charges,ups-actual-cost}.ts` | 151줄 |
| 8 | [Ds_11_12_Admin_Rates.md](./ds11/Ds_11_12_Admin_Rates.md) | `## 12. 관리자 통관·배송·부가할증 요율 관리` (`§12.1` ~ `§12.3`) | `admin/{customs-rates,delivery-rates,surcharges,rates,rate-cards}.ts` | 117줄 |
| 9 | [Ds_11_15_Support_Claims_Docs_Monitoring.md](./ds11/Ds_11_15_Support_Claims_Docs_Monitoring.md) | `## 15. 고객지원` · `## 18. 클레임 관리` · `## 19. 다국어 문서 엔진` · `## 21. 모니터링 및 로깅` | `support.ts`, `claims.ts`, `documents.ts`, `monitoring.ts`, `misc/{voc,notifications,claims,customs}.ts` | 99줄 |

> **분할 문서 운영 규칙 (R-12 · TASK-1163 확정)**:
> ① 신규 Server Action 함수는 위 표의 해당 도메인 분할 파일(`docs/02_Analysis/ds11/Ds_11_*.md`)에 추가한다.
> ② 개별 분할 파일이 권장 상한(500줄)을 넘기면 `Ds_11_11A`/`Ds_11_11B`와 같이 `NA`/`NB`로 분리하고 본 인덱스 목차 표에 반영한다.
> ③ 동기화 검증 스크립트(`scripts/check-ds11-sync.mjs`)는 본 인덱스 파일과 `docs/02_Analysis/ds11/` 직하위 `*.md` 파일만 스캔한다(하위 폴더 미지원).

---

## ⚠️ 확인된 사항 (Findings & Gaps)
... (생략)

### 1. 인벤토리(Inventory) 모듈 상태
- **현재 구현**: 백엔드(DB Schema, Server Actions) 구현 완료 및 오더 시스템 연동 완료.
- **UI 상태**: `/inventory` 관리 화면 개발 진행 중 (Phase 2.2 확장).
- **작동 방식**: SKU 기반으로 `on_hand_qty`, `reserved_qty`, `available_qty` 관리.

### 2. RPC 파라미터 불일치 수정
- `approve_organization` 함수가 문서상에는 3개의 인자를 받는 것으로 되어 있었으나, 실제 DB에는 `target_org_id` 하나만 받는 것으로 확인되어 사양을 수정하였습니다.

### 3. 소스코드 누락 항목
- `master.ts` 내의 공통 코드 관리(`CommonCode`) API 4종이 문서에 누락되어 추가되었습니다.
- `orders.ts` 내의 마스터 오더 상태 업데이트 및 상세 조회 API가 추가되었습니다.
