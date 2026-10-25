export class ServiceError extends Error {
  readonly status: number
  readonly body: {
    ok: false
    message: string
    code?: "BANNED" | "SUSPENDED" | "LOCKED"
    bannedAt?: string | null
    lockedUntil?: string | null
  }

  constructor(status: number, body: ServiceError["body"]) {
    super(body.message)
    this.status = status
    this.body = body
  }
}
