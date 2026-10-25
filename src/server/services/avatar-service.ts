import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { db } from "../db/index.ts"
import { users } from "../db/schema.ts"
import { ServiceError } from "./errors.ts"
import { toPublicUser } from "./user-service.ts"

const maxBytes = 2_000_000
const extensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
} as const
const contentTypes = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function avatarRoot(userId: string) {
  return path.resolve(process.cwd(), "storage", "avatars", userId)
}

function extensionFor(type: string) {
  if (type in extensions) {
    return extensions[type as keyof typeof extensions]
  }
  return undefined
}

export async function saveAvatar(userId: string, file: File) {
  const extension = extensionFor(file.type)
  if (!extension) {
    throw new ServiceError(422, {
      ok: false,
      message: "Use a PNG, JPEG, or WebP image.",
    })
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new ServiceError(422, {
      ok: false,
      message: "Image must be 2 MB or smaller.",
    })
  }
  if (!uuidPattern.test(userId)) {
    throw new ServiceError(404, { ok: false, message: "User not found." })
  }

  const filename = `${randomUUID()}.${extension}`
  const directory = avatarRoot(userId)
  const target = path.resolve(directory, filename)
  await mkdir(directory, { recursive: true })
  await writeFile(target, Buffer.from(await file.arrayBuffer()))

  const rows = await db
    .update(users)
    .set({
      avatarUrl: `/api/avatars/${userId}/${filename}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
  return toPublicUser(rows[0])
}

export async function readAvatar(userId: string, file: string) {
  const extension = path.extname(file).slice(1).toLowerCase()
  if (
    !uuidPattern.test(userId) ||
    file.includes("/") ||
    file.includes("\\") ||
    file.includes("..") ||
    !(extension in contentTypes) ||
    !uuidPattern.test(path.basename(file, `.${extension}`))
  ) {
    return null
  }

  const directory = avatarRoot(userId)
  const target = path.resolve(directory, file)
  const relative = path.relative(directory, target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null
  }

  try {
    const bytes = await readFile(target)
    return {
      bytes,
      contentType: contentTypes[extension as keyof typeof contentTypes],
    }
  } catch {
    return null
  }
}
