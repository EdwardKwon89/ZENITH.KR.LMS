export type ShxkServiceMethod =
  | 'createorder'
  | 'submitforecast'
  | 'updateorder'
  | 'removeorder'
  | 'getnewlabel'
  | 'gettrackingnumber'
  | 'gettrack'
  | 'getorderfee'
  | 'getorderfeedetail'
  | 'getorderweight'
  | 'calculateshippingfee'
  | 'getbasicdata'

export interface ShxkBaseRequest {
  appKey: string
  appToken: string
  serviceMethod: ShxkServiceMethod
}

export interface ShxkBaseResponse {
  success: number
  cnmessage: string
  enmessage: string
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}
