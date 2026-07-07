export function getCountryName(code: string | null | undefined, locale: string = 'ko'): string {
  if (!code) return '';
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
