/**
 * ZENITH LMS - Intelligent Integrated Logistics Platform
 * Routing & Authorization Configuration
 */

export type OrgType = 'PLATFORM' | 'SHIPPER' | 'CARRIER' | 'CUSTOMS' | 'DELIVERY' | 'AGENCY' | 'GUEST';

/**
 * 1. ORG_ROUTE_MAP: 조직 타입별 최상위 매핑 경로
 * '진입로와 행위의 독립적 분리' 원칙에 따라 설계됨.
 */
export const ORG_ROUTE_MAP: Record<OrgType, string> = {
  PLATFORM: '/admin',
  SHIPPER: '/orders', // 정규화: 실제 오더 관리 모듈 경로로 고정
  CARRIER: '/terminal',
  CUSTOMS: '/customs',
  DELIVERY: '/terminal',
  AGENCY: '/agency',
  GUEST: '/register/pending', // 가입 심사 중인 사용자용 임시 경로
};

/**
 * 2. PERMISSION_MAP: 역할별 기능 권한 정의
 * 특정 URL 내에서 수행 가능한 구체적 행위(Action)를 정의함.
 */
export const PERMISSION_MAP = {
  // 플랫폼 관리자 (운영사)
  PLATFORM_ADMIN: [
    'SYSTEM_MANAGE', 
    'ORG_APPROVE', 
    'MASTER_DATA_EDIT',
    'ALL_ORDER_VIEW'
  ],
  
  // 송하인 (Shipper)
  SHIPPER_ADMIN: [
    'ORDER_CREATE', 
    'BILLING_VIEW', 
    'MEMBER_MANAGE', 
    'TRACKING_VIEW'
  ],
  SHIPPER_USER: [
    'ORDER_CREATE', 
    'TRACKING_VIEW'
  ],
  
  // 운송사 (Carrier)
  CARRIER_ADMIN: [
    'TRANSPORT_ACCEPT', 
    'VEHICLE_MANAGE', 
    'BILLING_VIEW'
  ],
  CARRIER_DRIVER: [
    'LOCATION_UPDATE', 
    'DELIVERY_COMPLETE'
  ],
  
  // 게이트 키퍼 (미승인 사용자)
  GUEST_USER: [
    'PROFILE_VIEW', 
    'PENDING_STATUS_VIEW'
  ]
} as const;

export type PermissionAction = typeof PERMISSION_MAP[keyof typeof PERMISSION_MAP][number];

/**
 * 3. DEFAULT_REDIRECTS: 인증 상태별 기본 리다이렉션 경로
 */
export const DEFAULT_REDIRECTS = {
  AFTER_LOGIN: '/orders', // 일반적 기본값, 실제로는 OrgType에 따라 분기
  UNAUTHENTICATED: '/login',
  UNAUTHORIZED: '/403',
  PENDING: '/register/pending',
};
