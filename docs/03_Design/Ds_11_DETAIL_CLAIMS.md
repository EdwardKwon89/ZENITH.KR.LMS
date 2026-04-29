# Ds-11 API 상세 명세 — CLAIMS

> **도메인:** Claims | **버전:** v1.0 | **최종 수정:** 2026-04-28
> **파일:** `src/app/actions/claims.ts`

## 18.1 getClaims (Action)
클레임 목록을 조회합니다. 화주는 본인 조직의 클레임만, 관리자는 전체 클레임을 조회할 수 있습니다.

- **권한**: User (Shipper/Admin)
- **입력 파라미터**:
  ```typescript
  {
    status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
    org_id?: string; // Admin 전용 필터
  }
  ```
- **반환값**: `Claim[]` (주문 번호, 조직명 포함)
- **비고**: `created_at` 내림차순 정렬.

## 18.2 createClaim (Action)
신규 클레임을 등록하고 해당 주문의 상태를 'CLAIMED'로 자동 변경합니다.

- **권한**: User (Shipper/Admin)
- **입력 파라미터**:
  ```typescript
  {
    order_id: string;
    reason_code: 'DELAY' | 'DAMAGE' | 'MISDELIVERY';
    description: string;
  }
  ```
- **반환값**: 생성된 `Claim` 객체
- **비고**: 본인 조직의 주문에 대해서만 클레임 등록 가능.

## 18.3 updateClaimStatus (Action)
클레임의 처리 상태를 변경합니다.

- **권한**: Admin
- **입력 파라미터**:
  ```typescript
  {
    claimId: string;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
    resolution?: string;
  }
  ```
- **반환값**: `{ success: boolean }`
- **비고**: 'RESOLVED' 상태 변경 시 `resolved_at`이 현재 시간으로 기록됨.

## 18.4 addIncidentFee (Action)
사고 비용을 등록하고 연계된 인보이스의 총액에서 해당 금액을 차감합니다.

- **권한**: Admin
- **입력 파라미터**:
  ```typescript
  {
    claim_id: string;
    invoice_id: string;
    fee_amount: number;
    currency: string;
    description?: string;
  }
  ```
- **반환값**: 생성된 `IncidentFee` 객체
- **비고**: Settlement Integrity 유지를 위해 `zen_invoices.total_amount`를 원자적으로 차감.

## 18.5 getClaimDetails (Action)
클레임의 단건 상세 정보와 연계된 사고비 내역을 조회합니다.

- **권한**: User (Shipper/Admin)
- **입력 파라미터**: `claimId: string`
- **반환값**: `ClaimDetail` (오더 상세, 화주 정보, 사고비 목록 포함)

## 18.6 deleteClaim (Action)
클레임을 삭제합니다.

- **권한**: User (Shipper/Admin)
- **제약**: 'OPEN' 상태일 때만 삭제 가능 (관리자는 강제 삭제 가능).
- **입력 파라미터**: `claimId: string`
- **반환값**: `{ success: boolean }`
