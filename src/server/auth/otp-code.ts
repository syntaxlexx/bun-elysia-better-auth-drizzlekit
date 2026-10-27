const codes = new Map<string, string>()

export function rememberOtp(key: string, code: string) {
  codes.set(key, code)
}

export function devOtp(key: string) {
  if (process.env.NODE_ENV === "production") {
    return null
  }
  return codes.get(key) ?? null
}
