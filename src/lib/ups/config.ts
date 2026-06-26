import 'server-only'

export const SHXK_ENDPOINT =
  'http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8'

export const SHXK_APP_KEY   = process.env.UPS_API_KEY   ?? ''
export const SHXK_APP_TOKEN = process.env.UPS_API_TOKEN ?? ''

export function assertShxkConfig(): void {
  if (!SHXK_APP_KEY || !SHXK_APP_TOKEN) {
    throw new Error(
      'UPS_API_KEY / UPS_API_TOKEN 환경변수가 설정되지 않았습니다.',
    )
  }
}
