import 'server-only'
import { callShxk } from './client'
import type { GetCountryResponse, ReferenceDataItem, ShxkServiceMethod } from '@/types/ups-api'

export async function getCountryCodes(): Promise<GetCountryResponse['data']> {
  const res = await callShxk('getcountry' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getcountry failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as GetCountryResponse['data']) ?? []
}

export async function getShippingMethods(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getshippingmethod' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getshippingmethod failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}

export async function getMailCargoTypes(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getmailcargotype' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getmailcargotype failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}

export async function getCertificateTypes(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getcertificatetype' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getcertificatetype failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}

export async function getDeclareUnits(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getdeclareunit' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getdeclareunit failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}

export async function getExtraServices(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getextraservice' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getextraservice failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}

export async function getLabelConfig(): Promise<ReferenceDataItem[]> {
  const res = await callShxk('getlabelconfig' as ShxkServiceMethod)
  if (res.success !== 1) {
    throw new Error(`SHXK getlabelconfig failed: ${res.enmessage || res.cnmessage}`)
  }
  return (res.data as ReferenceDataItem[]) ?? []
}
