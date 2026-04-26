# Ds-11 API 상세 명세 — TRACKING (통합 트래킹)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 11. 통합 트래킹 (Tracking & Visibility)

### 11.1 getGlobalTrackingOverview (Action)

- **설명**: 마스터 오더 및 하우스 오더 전체에 대한 실시간 트래킹 요약 데이터 조회
- **권한**: User (조직 권한 기반)
- **파라미터**:
  - `orgId`: (uuid) 조회 대상 조직 ID
- **응답**:
  ```typescript
  {
    totalActive: number;      // 현재 운송 중인 오더 총 수
    byStatus: {               // 상태별 집계
      booked: number;
      picked_up: number;
      in_transit: number;
      arrived: number;
      delivered: number;
    };
    recentEvents: Array<{     // 최근 발생한 주요 트래킹 이벤트
      orderId: string;
      orderNo: string;
      status: string;
      location: string;
      timestamp: string;
    }>;
  }
  ```

### 11.2 syncExternalTracking (Action)

- **설명**: 외부 운송사(Carrier) API를 호출하여 최신 트래킹 정보를 동기화하고 로컬 DB 및 Raw Log에 저장
- **권한**: User/System (폴링 연동)
- **파라미터**:
  - `trackingNo`: (string) 송장 번호
  - `carrierCode`: (string) 운송사 코드 (e.g., 'UPS', 'DHL', 'HMM')
- **프로세스**:
  1. `TrackingAdapter`를 통한 외부 API 호출
  2. 응답 원본을 `zen_tracking_raw_logs` 테이블에 저장
  3. `orders` 및 `order_tracking_events` 테이블 업데이트
- **응답**: `{ success: true, currentStatus: string, lastLocation: string }`

### 11.3 getTrackingRawLogs (Action)

- **설명**: 특정 오더의 외부 API 응답 원본(Raw Data) 이력 조회 (디버깅 및 정합성 검증용)
- **권한**: Admin
- **파라미터**: `orderId` (uuid)
- **응답**: `Array<{ id: uuid, raw_payload: JSON, created_at: string }>`
