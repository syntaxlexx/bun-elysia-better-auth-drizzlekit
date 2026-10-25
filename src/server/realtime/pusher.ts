import Pusher from "pusher"
import { ServiceError } from "../services/errors.ts"

type RealtimeConfig = {
  appId: string
  key: string
  secret: string
  cluster: string
  host: string | null
  port: string
  forceTLS: boolean
}

function readEnv(...names: Array<string>) {
  for (const name of names) {
    const value = process.env[name]?.trim() ?? ""
    if (value) {
      return value
    }
  }
  return ""
}

function readFlag(value: string, fallback: boolean) {
  if (!value) {
    return fallback
  }
  return value !== "false" && value !== "0"
}

const uuidPattern =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const channelPattern = new RegExp(`^presence-room-(${uuidPattern})$`, "i")

function readConfig(): RealtimeConfig | null {
  const appId = readEnv("PUSHER_APP_ID", "VITE_PUSHER_APP_ID")
  const key = readEnv("PUSHER_KEY", "VITE_PUSHER_APP_KEY")
  const secret = readEnv("PUSHER_SECRET")
  const cluster = readEnv("PUSHER_CLUSTER", "VITE_PUSHER_CLUSTER")
  const host = readEnv("PUSHER_HOST", "VITE_PUSHER_HOST")
  const port = readEnv("PUSHER_PORT", "VITE_PUSHER_PORT") || "443"
  const forceTLS = readFlag(
    readEnv("PUSHER_FORCE_TLS", "VITE_PUSHER_FORCE_TLS"),
    true
  )
  if (!appId || !key || !secret || !cluster) {
    return null
  }
  return {
    appId,
    key,
    secret,
    cluster,
    host: host || null,
    port,
    forceTLS,
  }
}

function requireConfig() {
  const config = readConfig()
  if (!config) {
    throw new ServiceError(503, {
      ok: false,
      message: "Realtime is not configured.",
    })
  }
  return config
}

export function realtimePublicConfig() {
  const config = requireConfig()
  return {
    key: config.key,
    cluster: config.cluster,
    host: config.host,
    port: Number(config.port) || 443,
    forceTLS: config.forceTLS,
  }
}

export function roomChannel(roomId: string) {
  return `presence-room-${roomId}`
}

export function roomIdFromChannel(channelName: string) {
  const match = channelPattern.exec(channelName)
  return match?.[1]?.toLowerCase() ?? null
}

let client: Pusher | null = null

export function getPusher() {
  const config = requireConfig()
  client ??= new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: config.forceTLS,
    ...(config.host ? { host: config.host, port: config.port } : {}),
  })
  return client
}

export async function publishMessage(
  roomId: string,
  message: {
    id: string
    roomId: string
    body: string
    authorId: string
    authorName: string
    createdAt: string
  },
  socketId?: string
) {
  const pusher = getPusher()
  await pusher.trigger(
    roomChannel(roomId),
    "message",
    message,
    socketId ? { socket_id: socketId } : undefined
  )
}
