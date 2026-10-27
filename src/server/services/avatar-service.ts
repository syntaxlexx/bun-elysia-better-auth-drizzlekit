import { randomUUID } from "node:crypto"
import { readFile, unlink } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { db } from "../db/index.ts"
import { users } from "../db/schema.ts"
import { ServiceError } from "./errors.ts"
import { deleteAvatarObject, putAvatarObject, storedAvatarKey } from "./r2.ts"

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

function localFileName(userId: string, image: string) {
  const prefix = `/api/avatars/${userId}/`
  if (!image.startsWith(prefix)) {
    return null
  }
  const file = image.slice(prefix.length)
  const extension = path.extname(file).slice(1).toLowerCase()
  if (
    file.includes("/") ||
    file.includes("\\") ||
    file.includes("..") ||
    !(extension in contentTypes) ||
    !uuidPattern.test(path.basename(file, `.${extension}`))
  ) {
    return null
  }
  return file
}

async function removePreviousAvatar(userId: string, image: string) {
  const key = storedAvatarKey(image)
  if (key) {
    await deleteAvatarObject(key)
    return
  }

  const file = localFileName(userId, image)
  if (!file) {
    return
  }
  const directory = avatarRoot(userId)
  const target = path.resolve(directory, file)
  const relative = path.relative(directory, target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return
  }
  await unlink(target)
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
  const key = `avatars/${userId}/${filename}`
  const image = await putAvatarObject(
    key,
    new Uint8Array(await file.arrayBuffer()),
    contentTypes[extension]
  )

  const existing = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, userId))
  const previous = existing[0]?.image ?? null

  const rows = await db
    .update(users)
    .set({
      image,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
  if (rows.length === 0) {
    await deleteAvatarObject(key)
    throw new ServiceError(404, { ok: false, message: "User not found." })
  }

  if (previous && previous !== image) {
    try {
      await removePreviousAvatar(userId, previous)
    } catch {
      // Replacing the profile image still succeeds if the old object is already gone.
    }
  }
  return rows[0]
}

export async function readAvatar(userId: string, file: string) {
  if (
    !uuidPattern.test(userId) ||
    !localFileName(userId, `/api/avatars/${userId}/${file}`)
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
    const extension = path.extname(file).slice(1).toLowerCase()
    return {
      bytes,
      contentType: contentTypes[extension as keyof typeof contentTypes],
    }
  } catch {
    return null
  }
}
