import { z } from 'zod';
import { HS_CODE_MAX, ITEM_NAME_MAX, PHONE_MAX_DIGITS } from './shxk-limits';

/**
 * 오더 상세 항목(Item) 검증 스키마 (패킹 하위)
 */
export const orderItemSchema = z.object({
  sku_code: z.string().optional(), // 재고 연동을 위한 SKU 코드
  item_name: z.string()
    .min(1, 'Item name is required')
    .regex(/^[A-Za-z0-9\s.,\-()&'"/#%+:]*$/, 'Item name must be in English (letters, numbers, and common symbols only)'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unit_price: z.number().nonnegative('Unit price cannot be negative').default(0),
  currency: z.string().default('USD'),
  hs_code: z.string().optional(), // B2C 선택, B2B 권장
  item_packing_unit: z.string().default('PCE'), // 아이템 소단위 — SHXK 신고단위 (TASK-B-337: 기본값 EA→PCE)
});

/**
 * 오더 패킹 단위(Package) 검증 스키마
 */
export const orderPackageSchema = z.object({
  id: z.string().uuid().optional(),
  // TASK-B-339 (Issue #1254 / 안전장치 ②): 낙관적 동시성 — 화면 로드 시점의 실측 시각을 그대로 되돌려 보낸다.
  //   서버는 DB의 현재 measured_at과 비교해 다르면 저장을 거부한다(창고가 그 사이 실측/재실측함).
  //   edit-defaults.ts는 이미 폼에 실어 보내고 있었으나 스키마에 없어 Zod가 제거하고 있었다.
  measured_at: z.string().nullable().optional(),
  packing_unit: z.string().min(1, 'Packing unit is required'),
  packing_count: z.number().int().positive().default(1),
  physical_box_count: z.number().int().positive().optional().default(1),
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  gross_weight: z.number().nonnegative('Weight is required'),
  volume: z.number().nonnegative().optional(),
  special_cargo_type: z.enum(['NONE', 'DANGEROUS', 'FROZEN', 'VALUABLE', 'USED']).default('NONE'),
  content_type: z.enum(['GENERAL', 'DOC', 'NONDOC']).default('GENERAL'),
  domestic_ref_no: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item per package is required'),
});

/**
 * 신규 오더 등록(Registration) 검증 스키마
 */
export const orderRegistrationSchema = z.object({
  order_type: z.enum(['B2B', 'B2C_ECOM', 'B2C_EXPRESS']),
  shipper_id: z.string().uuid('Please select a valid shipper'),
  origin_port_id: z.string().uuid('Please select a valid origin port').optional(),
  dest_port_id: z.string().uuid('Please select a valid destination port').optional(),
  
  // 송하인(화주) 담당자/연락처/이메일 (v2 스크린샷 피드백 반영)
  shipper_name: z.string().optional(), // TASK-B-295 (Issue #1100): 화주명(발송인 표시명) 자유 입력 — 시스템 미등록 임의 화주명 오버라이드
  shipper_contact_name: z.string().optional(),
  // TASK-B-332 (Issue #1239): 전화번호 — 값이 있으면 숫자만 + 최대 15자리(E.164), 비숫자/하이픈 차단.
  // (기존 저장분 하이픈은 서버 payload 검증에서 정제되어 전송)
  shipper_contact_phone: z.string()
    .regex(/^\d*$/, '전화번호는 숫자만 입력할 수 있습니다').max(PHONE_MAX_DIGITS, `전화번호는 ${PHONE_MAX_DIGITS}자리 이하여야 합니다`)
    .optional(),
  shipper_contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  shipper_address: z.string().optional(),
  shipper_address_english: z.string().optional(),
  // TASK-B-340 (Issue #1256): `''`/공백/undefined를 'KR'로 정정 — `.default()`는 undefined일 때만
  //   작동하고 빈 문자열은 통과시켜 화주 국가코드가 ''로 저장되던 원인. 다른 값은 trim만 적용.
  shipper_country_code: z.string().optional().transform((v) => {
    const trimmed = v?.trim();
    return trimmed ? trimmed : 'KR';
  }),
  shipper_state_province: z.string().optional(),
  shipper_city: z.string().optional(),
  shipper_address_detail: z.string().optional(),
  shipper_address_detail_english: z.string().optional(),
  shipper_zipcode: z.string().optional(),
  shipper_biz_no: z.string().optional(),
  
  // 수취인 상세 정보 (v2 핵심 추가)
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_address: z.string().min(1, 'Recipient address is required'),
  recipient_address_local: z.string().optional(),
  recipient_address_detail: z.string().optional(),
  recipient_phone: z.string().min(1, 'Recipient phone is required')
    .regex(/^\d+$/, '전화번호는 숫자만 입력할 수 있습니다').max(PHONE_MAX_DIGITS, `전화번호는 ${PHONE_MAX_DIGITS}자리 이하여야 합니다`),
  recipient_zipcode: z.string().optional(),
  recipient_country_code: z.string().optional(),
  recipient_state_province: z.string().optional(),
  recipient_city: z.string().optional(),
  
  recipient_pccc: z.string().optional(),
  recipient_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  description: z.string().optional(),
  delivery_notes: z.string().optional(),
  
  // 운송 수단 (v2.1)
  transport_mode: z.enum(['AIR', 'SEA', 'EXP', 'LAND', 'UPS']).default('AIR'),

  ups_service_family: z.enum(['WW_EXPRESS', 'WW_SAVER', 'WW_EXPEDITED', 'WW_FLIGHT']).optional(),
  
  // 물류 요약 정보 (v2.2)
  estimated_cost: z.number().optional(),
  
  // 계층형 패킹 데이터 (special_cargo_type은 PKG 레벨로 이전 — DEF-059)
  packages: z.array(orderPackageSchema).min(1, 'At least one package is required'),

  // 직접배송/픽업 정보 (IMP-118)
  delivery_method: z.enum(['DIRECT', 'PICKUP']).default('DIRECT'),
  pickup_location: z.string().optional(),
  pickup_contact_name: z.string().optional(),
  pickup_contact_tel: z.string().optional(),
  pickup_country_code: z.string().optional(),
  pickup_state_province: z.string().optional(),
  pickup_city: z.string().optional(),
  pickup_address: z.string().optional(),
  pickup_address_detail: z.string().optional(),
  pickup_zipcode: z.string().optional(),

  // UPS 특송 정보 (TASK-B-059)
  ups_product_code: z.string().optional(),
  incoterms: z.enum(['DDU', 'DDP']).optional(),
}).superRefine((data, ctx) => {
  if (data.transport_mode !== 'UPS') {
    if (!data.origin_port_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid origin port',
        path: ['origin_port_id'],
      });
    }
    if (!data.dest_port_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid destination port',
        path: ['dest_port_id'],
      });
    }
  }
  if (data.delivery_method === 'PICKUP') {
    if (!data.pickup_address || data.pickup_address.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup address is required when delivery method is PICKUP',
        path: ['pickup_address'],
      });
    }
    if (!data.pickup_contact_name || data.pickup_contact_name.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup contact name is required when delivery method is PICKUP',
        path: ['pickup_contact_name'],
      });
    }
    if (!data.pickup_contact_tel || data.pickup_contact_tel.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup contact phone is required when delivery method is PICKUP',
        path: ['pickup_contact_tel'],
      });
    }
  }
  // DEF-B-044 (Issue #1044): 중국(CN) 목적지는 UPS Zone이 지역(CNN/CNS)에 따라 달라
  // 성/직할시(recipient_state_province)를 필수로 강제 — 미입력 시 조용히 추정하지 않는다.
  if (data.recipient_country_code === 'CN' && (!data.recipient_state_province || data.recipient_state_province.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '중국 배송은 지역(성/직할시) 선택이 필수입니다 — UPS Zone이 지역에 따라 달라집니다',
      path: ['recipient_state_province'],
    });
  }
  // TASK-B-277 (Issue #1052): UPS 배송은 SHXK API 필수 항목 조건부 검증 —
  // recipient_country_code(필수), recipient_zipcode(중국행 실패로 실무상 필수),
  // shipper_contact_phone(SHXK 전화/휴대폰 중 1개 필수 — 우리 스키마엔 전화 1개만 존재).
  // TASK-B-283 (Issue #1069 / DEF-B-055): recipient_city도 SHXK 필수(收件人城市不能为空)로
  // 실발현 — TASK-B-277 당시 "국가별 조건부"로 범위 밖 처리했던 항목을 필수화.
  if (data.transport_mode === 'UPS') {
    if (!data.recipient_country_code || data.recipient_country_code.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UPS 배송은 수하인 국가 선택이 필수입니다',
        path: ['recipient_country_code'],
      });
    }
    if (!data.recipient_zipcode || data.recipient_zipcode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UPS 배송은 수하인 우편번호가 필수입니다(SHXK API 요구사항)',
        path: ['recipient_zipcode'],
      });
    }
    if (!data.recipient_city || data.recipient_city.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UPS 배송은 수하인 도시가 필수입니다(SHXK API 요구사항)',
        path: ['recipient_city'],
      });
    }
    if (!data.shipper_contact_phone || data.shipper_contact_phone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UPS 배송은 화주 연락처가 필수입니다(SHXK API 요구사항)',
        path: ['shipper_contact_phone'],
      });
    }
    // TASK-B-332 (Issue #1239): 품목 HS 코드 필수·최대 30자 / 품명 최대 35자 — SHXK·UPS 규격 사전검증
    data.packages.forEach((pkg, i) => {
      pkg.items.forEach((item, k) => {
        const hsCode = item.hs_code ?? '';
        if (hsCode.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'UPS 배송은 품목 HS 코드가 필수입니다(SHXK API 요구사항)',
            path: ['packages', i, 'items', k, 'hs_code'],
          });
        } else if (hsCode.trim().length > HS_CODE_MAX) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `UPS HS 코드는 ${HS_CODE_MAX}자 이하여야 합니다(현재 ${hsCode.trim().length}자)`,
            path: ['packages', i, 'items', k, 'hs_code'],
          });
        }
        if (item.item_name.length > ITEM_NAME_MAX) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `UPS 품명은 ${ITEM_NAME_MAX}자 이하여야 합니다(현재 ${item.item_name.length}자)`,
            path: ['packages', i, 'items', k, 'item_name'],
          });
        }
      });
    });
  }
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderPackageInput = z.infer<typeof orderPackageSchema>;
export type OrderRegistrationInput = z.infer<typeof orderRegistrationSchema>;
