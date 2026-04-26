# Ds-11 API 상세 명세 — LOGISTICS (물류 로직 + 마스터 데이터 + 시스템)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 6. 물류 트래킹 및 로직 (Logistics Logic)

### 6.1 getTrackingEvents (Action)

- **설명**: 특정 오더에 대한 모든 트래킹 이벤트 조회
- **권한**: User
- **응답**: `Array<TrackingEvent>`

### 6.2 addTrackingEvent (Action)

- **설명**: 관리자가 트래킹 이벤트를 수동으로 추가함
- **권한**: Admin
- **응답**: `{ success: true }`

### 6.3 fn_trigger_capture_order_rate (RPC)

- **설명**: 특정 상태(예: PACKED) 도달 시 적용 요율을 스냅샷으로 저장
- **권한**: System
- **파라미터**: `p_order_id` (uuid)
- **응답**: `void`

### 6.4 updateTrackingConfig (Action)

- **설명**: 오더의 트래킹 공급자 설정(Provider Type/Name) 변경
- **권한**: Admin
- **파라미터**:
  - `orderId`: (uuid)
  - `providerType`: (string) 'VIRTUAL' | 'KOREA_POST' | 'FEDEX' 등
  - `providerName`: (string)
- **응답**: `{ success: boolean }`

### 6.5 fn_get_best_matching_rate (RPC)

- **설명**: 화주/구간/중량 기준 최적 요율 검색
- **권한**: System/User
- **응답**: `MatchingRateRecord`

### 6.6 syncExternalTracking (Cron/Action)

- **설명**: 주기적 폴링 워커를 통해 외부(또는 Mock) 운송사 API를 호출하여 트래킹 상태 동기화 [Phase 3.1]
- **권한**: System/Admin
- **동작**: `zen_tracking_configs`의 활성 목록 순회 → 어댑터 호출 → `zen_tracking_raw_logs` 저장 → `zen_tracking_events` 업데이트
- **응답**: `{ success: boolean, processed: number, errors: number }`

### 6.7 getTrackingRawLogs (Action)

- **설명**: 문제 발생 시 디버깅 및 감사(Audit) 목적으로 외부 API 원본(Raw JSON) 응답 내역 조회 [Phase 3.1]
- **권한**: Admin
- **파라미터**: `trackingConfigId` (uuid)
- **응답**: `Array<TrackingRawLog>`

---

## 7. 마스터 데이터 (Master Data)

### 7.1 upsertPort (Action) / getPorts (Action)

- **설명**: 항구(Port/Airport) 정보 관리 및 조회
- **권한**: Admin (Upsert), User (Get)
- **응답**: `PortObject` 또는 `Array<Port>`

### 7.2 getNations (Action)

- **설명**: 시스템에 등록된 모든 국가 및 ISO 코드 조회
- **권한**: User
- **응답**: `Array<{ id, name, code }>`

### 7.3 getOrganizations (Action) / getAirlines (Action)

- **설명**: 활성화된 조직(화주/파트너) 목록 조회. Airlines는 IATA 코드가 있는 CARRIER만 필터링.
- **권한**: User
- **응답**: `Array<Organization>`

### 7.4 upsertCommonCode (Action) / getCommonCodes (Action)

- **설명**: 시스템 공통 코드(코드 그룹 포함) 관리 및 조회
- **권한**: Admin (Upsert), User (Get)
- **응답**: `CommonCodeObject` 또는 `Array<CommonCode>`

### 7.5 getCommonCodesByGroup (Action)

- **설명**: 특정 그룹(예: 'TRANSPORT_MODE', 'PACKING_UNIT')에 속한 활성 코드만 조회
- **권한**: User
- **파라미터**: `groupCode` (string)
- **응답**: `Array<CommonCode>`

### 7.6 deleteCommonCode (Action)

- **설명**: 공통 코드 삭제 (가급적 비활성화 권장하나 물리 삭제 지원)
- **권한**: Admin
- **파라미터**: `id` (uuid)
- **응답**: `{ success: true }`

---

## 8. 시스템 및 인프라 (System & Infra)

### 8.1 rls_auto_enable (RPC)

- **설명**: 신규 테이블 생성 시 RLS 정책을 자동 활성화
- **권한**: Superuser/System

### 8.2 update_timestamp_column (RPC)

- **설명**: `updated_at` 컬럼 자동 갱신 트리거용 함수
- **권한**: System
