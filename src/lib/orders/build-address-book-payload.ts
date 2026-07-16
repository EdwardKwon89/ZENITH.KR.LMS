// 주소록 저장용 payload 조립 순수 함수
// Issue #532: handleConfirmSaveAddressBook에서 추출

export function buildAddressBookPayload(
  watch: (key: string) => any,
  displayName: string
) {
  return {
    display_name: displayName,
    recipient_name: watch('recipient_name'),
    recipient_address: watch('recipient_address'),
    recipient_address_detail: watch('recipient_address_detail') || undefined,
    recipient_address_local: watch('recipient_address_local') || undefined,
    recipient_phone: watch('recipient_phone') || undefined,
    recipient_email: watch('recipient_email') || undefined,
    country_code: watch('recipient_country_code') || undefined,
    state_province: watch('recipient_state_province') || undefined,
    city: watch('recipient_city') || undefined,
    zipcode: watch('recipient_zipcode') || undefined,
    recipient_pccc: watch('recipient_pccc') || undefined,
    display_mode: 'EN' as const,
    is_default: false,
  };
}
