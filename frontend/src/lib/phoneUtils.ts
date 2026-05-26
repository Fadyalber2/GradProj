/**
 * Build E.164 from a country code and subscriber input.
 * Strips leading zeros — Egyptian numbers are typed as "01001234567"
 * but E.164 requires "+201001234567", not "+2001001234567".
 */
export function buildE164(countryCode: string, subscriberInput: string): string {
  const digits = subscriberInput.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return `${countryCode}${digits}`;
}

/** Validate E.164 format: + followed by 7–14 digits. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,13}$/.test(phone);
}

/** Returns a locale-appropriate placeholder for the subscriber input field. */
export function phonePlaceholder(countryCode: string): string {
  if (countryCode === "+20")  return "01X XXXX XXXX";
  if (countryCode === "+1")   return "(555) 123-4567";
  if (countryCode === "+44")  return "07XXX XXXXXX";
  if (countryCode === "+971") return "05X XXX XXXX";
  return "Phone number";
}
