import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

export async function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex")
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer
  return `${salt}:${derived.toString("hex")}`
}

export async function verifyPassword(plain: string, passwordHash: string) {
  const [salt, hash] = passwordHash.split(":")
  if (!salt || !hash) {
    return false
  }

  const derived = (await scryptAsync(plain, salt, 64)) as Buffer
  const expected = Buffer.from(hash, "hex")
  if (expected.length !== derived.length) {
    return false
  }

  return timingSafeEqual(expected, derived)
}
