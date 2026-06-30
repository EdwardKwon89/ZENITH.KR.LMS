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
  | 'getcountry'
  | 'getshippingmethod'
  | 'getmailcargotype'
  | 'getcertificatetype'
  | 'getdeclareunit'
  | 'getextraservice'
  | 'getlabelconfig'

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

export interface GetCountryItem {
  code: string
  cnname: string
  enname: string
  note: string
}

export interface GetCountryResponse {
  success: number
  cnmessage: string | null
  enmessage: string | null
  data: GetCountryItem[]
}

export interface ReferenceDataItem {
  code: string
  cnname: string
  enname: string
  note: string
}
