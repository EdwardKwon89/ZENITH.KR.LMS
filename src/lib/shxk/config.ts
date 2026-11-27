import 'server-only'
import { logger } from '@/lib/logger'

export const SHXK_ENDPOINT =
  'http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8'

export const SHXK_APP_KEY   = process.env.SHXK_APP_KEY   ?? ''
export const SHXK_APP_TOKEN = process.env.SHXK_APP_TOKEN ?? ''

export function assertShxkConfig(): void {
  if (!SHXK_APP_KEY || !SHXK_APP_TOKEN) {
    throw new Error(
      'SHXK_APP_KEY / SHXK_APP_TOKEN 환경변수가 설정되지 않았습니다.',
    )
  }
}

export const SHXK_SHIPPER_NAME     = process.env.SHXK_SHIPPER_NAME     ?? 'SNTL Korea Co Ltd'

// TASK-B-397 (Issue #1552 / DEF-B-172): SHXK 서버는 FXUPS 경로에서 발송인 회사명을 필수 검증한다.
// 값은 소스에 적지 않고 환경변수로만 주입한다. 미설정 시 빈 값을 보내지 않도록
// 기존 SHXK_SHIPPER_NAME 값으로 대체하고, 운영에서 누락을 알아챌 수 있게 warn을 남긴다.
const configuredShipperCompany = process.env.SHXK_SHIPPER_COMPANY?.trim()
if (!configuredShipperCompany) {
  logger.warn('[SHXK] SHXK_SHIPPER_COMPANY 미설정 — SHXK_SHIPPER_NAME 값으로 대체합니다.')
}
export const SHXK_SHIPPER_COMPANY  = configuredShipperCompany || SHXK_SHIPPER_NAME
export const SHXK_SHIPPER_COUNTRY  = process.env.SHXK_SHIPPER_COUNTRY  ?? 'KR'
export const SHXK_SHIPPER_PROVINCE = process.env.SHXK_SHIPPER_PROVINCE ?? 'Seoul'
export const SHXK_SHIPPER_CITY     = process.env.SHXK_SHIPPER_CITY     ?? 'Mapo-gu'
export const SHXK_SHIPPER_STREET   = process.env.SHXK_SHIPPER_STREET   ?? '123 Logistics Blvd Mapo'
export const SHXK_SHIPPER_POSTCODE = process.env.SHXK_SHIPPER_POSTCODE ?? '04515'
export const SHXK_SHIPPER_PHONE    = process.env.SHXK_SHIPPER_PHONE    ?? '02-1234-5678'
