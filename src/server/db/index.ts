import "@tanstack/react-start/server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"

// 1. Prioritize the Hyperdrive string (provided by Cloudflare in production)
// 2. Fallback to standard DATABASE_URL (for your local Postgres instance)
const connectionString =
  process.env.HYPERDRIVE_LOCAL_URL || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL must be set.")
}

// Workers close TCP sockets when a request ends. A Client left connected
// at module scope never settles the next query, and the runtime cancels
// the request. maxUses drops each connection after one checkout.
// Hyperdrive pools on the other side.
const pool = new pg.Pool({
  connectionString,
  max: 5,
  maxUses: 1,
  connectionTimeoutMillis: 10_000,
})

pool.on("error", (error: Error) => {
  console.error(error)
})

export const db = drizzle(pool, { schema })
export { schema }
