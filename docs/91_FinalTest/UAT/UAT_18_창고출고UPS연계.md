# UAT_18 — 창고 출고 UPS 연계

> **문서번호**: UAT-18
> **작성일**: 2026-07-13
> **작성자**: Riley (Gemini)
> **버전**: v2.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-183 — UPS 특송 UAT 문서 5건 종합 검토·갱신 (UAT-15·18·19·20·22)

> [!IMPORTANT]
> **v2.0 개정 사항 (2026-07-13, Riley)**
> - **실물 API 연동 반영**: 출고 확정 시 가상 RPC 대신 실제 shxk API 연동(`issueUpsLabel`)을 수행하여 실물 UPS 운송장을 채번하고 PDF 레이블을 생성하여 파일 Storage 및 `zen_ups_labels` 테이블에 적재하는 플로우로 현행화.
> - **폐기(Void) 및 재발급(Reissue) 검증 추가**: `UAT-18-02` 시나리오를 신설하여 발급된 UPS 레이블의 폐기(Void) 및 재발급(Reissue) 기능 및 관련 DB 상태 변경(`is_voided`, `intl_ref_locked`)을 검증하도록 보완.
> - **RLS 격리 검증**: 기존 RLS 시나리오를 `UAT-18-03`으로 번호를 이동하여 UAT 체계를 맞춤.

---

## [UAT-18-01] WAREHOUSED 오더 출고 완료 시 UPS 실물 레이블 발급 및 PDF 다운로드 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | MANAGER (창고 운영자) 또는 ADMIN |
| 화면 URL | /ko/warehouse/outbound |
| 예상 소요 시간 | 7분 |
| 사전 조건 | 입고 완료(`WAREHOUSED`) 상태이며 운송 모드가 `EXP` (UPS Express)인 오더가 1건 이상 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/warehouse/outbound | 사이드바 > 창고 관리 > [출고 처리] 메뉴 클릭 | — | 출고 대기 목록 화면 진입 | ☐ |
| 2 | /ko/warehouse/outbound | 대상 UPS 오더 선택 후 [출고 확정] 버튼 클릭 | — | 출고 확정 모달 팝업 또는 상세 확인 화면 노출 | ☐ |
| 3 | /ko/warehouse/outbound | 출고 정보 확인 후 최종 [출고 확정] 클릭 | — | 백엔드에서 `issueUpsLabel` Server Action이 실행되어 shxk API를 통해 UPS 실물 운송장을 채번하고 PDF 저장 완료. 토스트 메시지("출고 처리가 완료되었습니다.") 표시 및 오더 상태가 `RELEASED`로 업데이트됨 | ☐ |
| 4 | /ko/warehouse/outbound | 우측 출고 완료 이력 목록에서 발급 결과 확인 | — | 출고 완료 이력 테이블의 해당 오더 행에 "UPS 발급완료 · [송장번호]" 초록색 배지와 함께 옆에 **[PDF]** 다운로드 버튼이 표시됨 | ☐ |
| 5 | /ko/warehouse/outbound | **[PDF]** 다운로드 버튼 클릭 | — | 새 창에서 UPS 실물 송장 PDF(shxk 서버 제공 URL)가 정상적으로 표시되고 인쇄/다운로드 가능함을 확인 | ☐ |
| 6 | Supabase Studio | `SELECT is_voided, label_format, storage_path, tracking_number FROM zen_ups_labels WHERE package_id = '[패키지ID]'` | — | `is_voided = false`, `label_format = 'PDF'`, `storage_path`에 PDF URL 주소가 정상 등록되었는지 검증 | ☐ |
| 7 | Supabase Studio | `SELECT intl_ref_no, intl_ref_locked FROM zen_order_packages WHERE id = '[패키지ID]'` | — | `intl_ref_no`에 송장번호가 채번되어 들어가고, `intl_ref_locked = true`로 잠금 설정됨을 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] UPS 오더 출고 시 백엔드에서 실제 shxk API가 연동되어 실물 운송장이 채번되고 PDF 저장 완료됨
- [ ] 출고 이력 테이블에 송장번호 배지 및 PDF 출력 버튼이 정상 노출됨
- [ ] `zen_ups_labels` 테이블에 레이블 URL 정보가 성공적으로 적재됨
- [ ] `zen_order_packages`에 `intl_ref_no` 저장 및 `intl_ref_locked = true` 설정 완료
- [ ] 500 에러 없음

---

## [UAT-18-02] UPS 레이블 폐기(Void) 및 재발급(Reissue) 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | MANAGER (창고 운영자) 또는 ADMIN |
| 화면 URL | /ko/warehouse/outbound |
| 예상 소요 시간 | 5분 |
| 사전 조건 | `UAT-18-01`을 완료하여 UPS 레이블이 발급된 오더가 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/warehouse/outbound | 출고 완료 이력 목록에서 해당 오더의 **[폐기]** (Void) 버튼 클릭 | — | 레이블 폐기 확인 팝업창 노출 | ☐ |
| 2 | /ko/warehouse/outbound | 폐기 확인 팝업에서 [폐기 확인] 클릭 | — | 백엔드 `voidUpsLabel` Action이 실행되어 shxk API 취소(`removeorder`) 호출 및 DB 갱신 완료. 토스트 메시지("폐기되었습니다.") 표시 | ☐ |
| 3 | /ko/warehouse/outbound | 이력 목록에서 상태 변화 확인 | — | 상태 배지가 회색의 "폐기됨"으로 변경되며, 옆에 **[재발급]** (Reissue) 버튼이 노출됨을 확인 | ☐ |
| 4 | Supabase Studio | `SELECT is_voided, voided_at FROM zen_ups_labels WHERE package_id = '[패키지ID]'` | — | `is_voided = true`로 업데이트되고, `voided_at`에 타임스탬프가 기록됨을 확인 | ☐ |
| 5 | Supabase Studio | `SELECT intl_ref_locked FROM zen_order_packages WHERE id = '[패키지ID]'` | — | `intl_ref_locked = false`로 잠금 해제 처리됨을 확인 | ☐ |
| 6 | /ko/warehouse/outbound | 이력 목록에서 **[재발급]** 버튼 클릭 | — | 백엔드 `issueUpsLabel`이 재실행되어 새로운 송장이 채번되고, 상태 배지가 "발급완료"로 원복되며 신규 PDF 버튼이 표시됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 폐기(Void) 처리 시 shxk API 취소 통신이 일어나고 UI 배지가 "폐기됨"으로 즉시 반영됨
- [ ] `zen_ups_labels.is_voided`가 `true`로 설정되고 `voided_at`에 기록이 남음
- [ ] `zen_order_packages.intl_ref_locked`가 `false`로 성공적으로 복구되어 필요 시 오더 수정 등이 가능한 상태가 됨
- [ ] 재발급(Reissue) 버튼 클릭 시 신규 송장 채번 및 PDF 버튼이 다시 활성화됨
- [ ] 500 에러 없음

---

## [UAT-18-03] UPS 발송 정보 자동 매핑 및 RLS 격리 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (화주) |
| 화면 URL | /ko/orders |
| 예상 소요 시간 | 5분 |
| 사전 조건 | `UAT-18-01` 과정을 통해 출고 완료 및 UPS 송장이 채번된 오더가 존재할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 해당 오더를 소유한 화주 계정으로 로그인 후 [오더 목록] 페이지 조회 | — | 오더 목록에 해당 오더 표시됨 | ☐ |
| 2 | /ko/orders | 오더 상세 정보 확인 | — | 상세 카드에서 출고 시 자동 적재된 `해외 송장 번호(intl_ref_no)`를 정상적으로 볼 수 있음 | ☐ |
| 3 | /ko/orders | 다른 화주 계정으로 로그인하여 동일 오더 상세 URL 직접 접근 시도 | — | 접근 권한 오류 또는 리다이렉트 발생 (타 화주의 UPS 발송 상세 데이터 접근 불가 검증) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 출고 처리로 채번된 해외 송장 번호 정보가 화주의 오더 상세 화면에 정확히 표시됨
- [ ] RLS 격리가 작동하여 다른 화주는 타인 오더의 UPS 발송 정보를 조회할 수 없음
- [ ] 500 에러 없음
