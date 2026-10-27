import { AwsClient } from "aws4fetch"
import { ServiceError } from "./errors.ts"

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

const avatarKeyPattern =
  /^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? ""
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? ""
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? ""
  const bucket = process.env.R2_BUCKET?.trim() ?? ""
  const publicUrl = (process.env.R2_PUBLIC_URL?.trim() ?? "").replace(/\/$/, "")
  const publicUrlIsHttp =
    publicUrl.startsWith("https://") || publicUrl.startsWith("http://")
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicUrlIsHttp
  ) {
    return null
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl }
}

function requireConfig() {
  const config = readConfig()
  if (!config) {
    throw new ServiceError(503, {
      ok: false,
      message: "Avatar storage is not configured.",
    })
  }
  return config
}

function objectUrl(config: R2Config, key: string) {
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")
  return `https://${config.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(config.bucket)}/${encodedKey}`
}

let client: AwsClient | null = null

function r2Client(config: R2Config) {
  client ??= new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  })
  return client
}

async function drain(response: Response) {
  await response.arrayBuffer()
}

export function storedAvatarKey(image: string) {
  const config = readConfig()
  if (!config || !image.startsWith(`${config.publicUrl}/`)) {
    return null
  }
  const key = image.slice(config.publicUrl.length + 1).split(/[?#]/)[0]
  if (!key || !avatarKeyPattern.test(key)) {
    return null
  }
  return key
}

function payload(body: Uint8Array) {
  const bytes = new ArrayBuffer(body.byteLength)
  new Uint8Array(bytes).set(body)
  return bytes
}

export async function putAvatarObject(
  key: string,
  body: Uint8Array,
  contentType: string
) {
  const config = requireConfig()
  let response: Response
  try {
    response = await r2Client(config).fetch(objectUrl(config, key), {
      method: "PUT",
      body: payload(body),
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    // A network failure here means the object was not stored.
    throw new ServiceError(502, {
      ok: false,
      message: "Could not store the image.",
    })
  }
  await drain(response)
  if (!response.ok) {
    throw new ServiceError(502, {
      ok: false,
      message: "Could not store the image.",
    })
  }
  return `${config.publicUrl}/${key}`
}

export async function deleteAvatarObject(key: string) {
  const config = readConfig()
  if (!config || !avatarKeyPattern.test(key)) {
    return
  }
  try {
    const response = await r2Client(config).fetch(objectUrl(config, key), {
      method: "DELETE",
    })
    await drain(response)
  } catch {
    // The new avatar is already saved if the previous object cannot be removed.
  }
}
