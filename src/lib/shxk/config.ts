import 'server-only'

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
export const SHXK_SHIPPER_COUNTRY  = process.env.SHXK_SHIPPER_COUNTRY  ?? 'KR'
export const SHXK_SHIPPER_PROVINCE = process.env.SHXK_SHIPPER_PROVINCE ?? 'Seoul'
export const SHXK_SHIPPER_CITY     = process.env.SHXK_SHIPPER_CITY     ?? 'Mapo-gu'
export const SHXK_SHIPPER_STREET   = process.env.SHXK_SHIPPER_STREET   ?? '123 Logistics Blvd Mapo'
export const SHXK_SHIPPER_POSTCODE = process.env.SHXK_SHIPPER_POSTCODE ?? '04515'
export const SHXK_SHIPPER_PHONE    = process.env.SHXK_SHIPPER_PHONE    ?? '02-1234-5678'
