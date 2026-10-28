import { t } from "elysia"
import { ServiceError } from "./services/errors.ts"

export const pageSizes = [10, 20, 50] as const
export const defaultPerPage = 10

export type PageRequest = {
  page: number
  perPage: number
}

export type PageMeta = {
  currentPage: number
  perPage: number
  from: number | null
  to: number | null
  total: number
  lastPage: number
}

export type Page<T> = {
  items: Array<T>
  meta: PageMeta
}

export const pageQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
})

export function readPage(query: {
  page?: string
  limit?: string
}): PageRequest {
  return {
    page: readInteger(query.page, 1, "Page must be 1 or greater.", 1),
    perPage: readPerPage(query.limit),
  }
}

export function offsetFor(request: PageRequest, total: number) {
  const lastPage = lastPageFor(total, request.perPage)
  if (request.page > lastPage) {
    throw new ServiceError(422, {
      ok: false,
      message: "That page is past the end of the list.",
    })
  }
  return (request.page - 1) * request.perPage
}

export function toPage<T>(
  request: PageRequest,
  total: number,
  items: Array<T>
): Page<T> {
  const offset = (request.page - 1) * request.perPage
  return {
    items,
    meta: {
      currentPage: request.page,
      perPage: request.perPage,
      from: total === 0 ? null : offset + 1,
      to: total === 0 ? null : offset + items.length,
      total,
      lastPage: lastPageFor(total, request.perPage),
    },
  }
}

export function asCount(value: unknown) {
  const total = typeof value === "number" ? value : Number(value)
  return Number.isFinite(total) ? total : 0
}

function lastPageFor(total: number, perPage: number) {
  if (total === 0) {
    return 1
  }
  return Math.ceil(total / perPage)
}

function readPerPage(value: string | undefined) {
  if (value === undefined) {
    return defaultPerPage
  }
  const parsed = Number(value)
  if (!(pageSizes as ReadonlyArray<number>).includes(parsed)) {
    throw new ServiceError(422, {
      ok: false,
      message: "Limit must be 10, 20, or 50.",
    })
  }
  return parsed
}

function readInteger(
  value: string | undefined,
  fallback: number,
  message: string,
  minimum: number,
  maximum?: number
) {
  if (value === undefined) {
    return fallback
  }
  const parsed = Number(value)
  const aboveMax = maximum !== undefined && parsed > maximum
  if (!Number.isInteger(parsed) || parsed < minimum || aboveMax) {
    throw new ServiceError(422, { ok: false, message })
  }
  return parsed
}
