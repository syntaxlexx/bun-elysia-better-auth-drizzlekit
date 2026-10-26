const links = new Map<string, string>()

export function rememberResetLink(email: string, url: string) {
  links.set(email, url)
}

export function takeResetLink(email: string) {
  const url = links.get(email) ?? null
  links.delete(email)
  return url
}
