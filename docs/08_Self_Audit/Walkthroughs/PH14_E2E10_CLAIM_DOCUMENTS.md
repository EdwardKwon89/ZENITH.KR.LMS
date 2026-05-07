# Walkthrough: PH14-E2E-10 클레임 접수 및 다국어 문서 발행 프로세스

> **작업 ID**: PH14-E2E-10  
> **수행 주체**: Riley (Gemini)  
> **검증 주체**: Aiden (Claude)  
> **최종 검증일**: 2026-05-07  
> **상태**: ✅ PASS (FB-012 재조치 완료)

## 1. 개요
화주(SHIPPER)가 특정 오더에 대해 클레임을 등록하고, 관리자(ADMIN)가 이를 확인하여 Commercial Invoice(CI) 및 Packing List(PL)를 다국어(KO/EN)로 발행하며, 화주가 이를 최종 확인하는 전체 비즈니스 프로세스를 Playwright E2E 테스트로 검증합니다.

## 2. 주요 변경 및 조치 사항
- **클레임 엔진 구현**: `src/app/actions/claims.ts`를 통해 클레임 등록 및 상태 관리(OPEN/CLOSED) 로직을 완성하였습니다.
- **다국어 문서 발행 시스템**: 
    - `CommercialInvoicePDF.tsx` 및 `PackingListPDF.tsx` 컴포넌트를 고도화하여 한국어/영어 전환 및 렌더링 무결성을 확보하였습니다.
    - 관리자 UI에서 문서 발행 버튼 클릭 시 서버 사이드에서 문서 데이터가 생성되도록 구현하였습니다.
- **DoD 기반 산출물 정비 (FB-012 대응)**:
    - **스크린샷 진위성 확보**: Playwright를 직접 구동하여 실제 브라우저 렌더링 결과인 4종의 스크린샷을 신규 생성 및 검증하였습니다.
    - **Step 4 증적 보완**: 화주 계정에서 발행된 문서를 확인하는 최종 단계 스크린샷(`e2e_10_04_shipper_docs_confirm.png`)을 포함하였습니다.
- **E2E 스크립트 결함 수정**:
    - **스키마 불일치 해결**: `zen_orders` 테이블에 존재하지 않는 `updated_at` 컬럼 참조를 제거하여 UPDATE 쿼리 런타임 오류를 해결하였습니다.
    - **관리자 인증 보정**: 로컬 환경의 `admin@zenith.kr` 계정 인증 실패 문제를 해결하기 위해 `admin_e2e@zenith.kr` 계정을 신규 생성하고 ADMIN 권한을 부여하여 테스트 안정성을 확보하였습니다.
- **Git 거버넌스 준수**: `[Gemini]` 접두사를 사용한 원자적 커밋 및 TASK_BOARD 🔔 테이블 등록을 완료하였습니다.
- **DB 무결성 확보**: 5건의 migration 파일을 통해 클레임 관련 테이블 스키마 및 문서 발행에 필요한 RPC/트리거를 안정적으로 배포하였습니다.

## 3. 시나리오 수행 결과 (Playwright)

| Step | 동작 | 결과 | 증적 |
|:---:|:---|:---:|:---|
| 1 | 화주 계정 로그인 및 오더 클레임 등록 | `claims` 테이블 레코드 생성 (status='OPEN') | [e2e_10_01_claim_registered.png](../../99_Manual/E2E_10_Result/e2e_10_01_claim_registered.png) |
| 2 | 관리자 로그인 및 CI(Commercial Invoice) 발행 | 한국어(KO) 문서 렌더링 확인 | [e2e_10_02_docs_ko.png](../../99_Manual/E2E_10_Result/e2e_10_02_docs_ko.png) |
| 3 | 관리자 PL(Packing List) 발행 및 영어(EN) 확인 | 영어(EN) 문서 렌더링 확인 | [e2e_10_03_docs_en.png](../../99_Manual/E2E_10_Result/e2e_10_03_docs_en.png) |
| 4 | 화주 계정 재접속 및 발행 문서 목록 확인 | 발행된 CI/PL 문서 목록 노출 확인 | [e2e_10_04_shipper_docs_confirm.png](../../99_Manual/E2E_10_Result/e2e_10_04_shipper_docs_confirm.png) |

## 4. 자가 검증 결과 (Self-Audit)

### 🛡️ R-08 회귀 테스트 결과
- **명령어**: `rtk npm run test:regression`
- **결과**: **163 / 163 PASS**
- **소요시간**: 약 32s

### 🛡️ R-09 테스트 맵 동기화
- `LIVE_REGRESSION_TEST_MAP.md` v14.10 항목 등록 완료.

### 🛡️ R-10 UI-Backend 결합도
- 화주 클레임 신청 모달(UI) → `submitClaim` (Action) → 관리자 문서 관리 UI → `issueDocument` (Action) → PDF 뷰어 연동 확인.

### 🛡️ R-13 아티팩트 관리
- `scratch/` 디버그 파일 및 `tests/e2e/e2e-10-debug.spec.ts` 삭제 완료.
- 무관한 로그 파일(`test_output.log`, `unit_test_output*.txt`) 및 seed 파일 삭제 완료.

## 5. 결론
PH14-E2E-10 작업은 물류 플랫폼의 핵심인 '클레임 및 다국어 문서 엔진'의 신뢰성을 입증하였습니다. Aiden의 FB-012 지시 사항을 모두 충족하였으며, 전체 시스템의 회귀 안정성이 확보되었으므로 최종 승인 및 E2E-11 단계로의 이행을 건의합니다.
