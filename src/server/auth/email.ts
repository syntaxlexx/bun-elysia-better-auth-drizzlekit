export const bridgeEmailSuffix = "@users.folio.invalid"

export function storedEmail(email: string | null, phone: string | null) {
  if (email) {
    return email
  }
  if (!phone) {
    return null
  }
  return `${phone.slice(1)}${bridgeEmailSuffix}`
}

export function publicEmail(email: string | null) {
  if (!email || email.endsWith(bridgeEmailSuffix)) {
    return null
  }
  return email
}
