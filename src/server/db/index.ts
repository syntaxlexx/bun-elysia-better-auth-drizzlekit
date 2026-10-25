import "@tanstack/react-start/server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"

// 1. Prioritize the Hyperdrive string (provided by Cloudflare in production)
// 2. Fallback to standard DATABASE_URL (for your local Postgres instance)
const connectionString =
  process.env.HYPERDRIVE_LOCAL_URL || process.env.DATABASE_URL

// node-postgres Client configuration for Hyperdrive
const client = new pg.Client({
  connectionString,
})

// Establish the connection
await client.connect()

export const db = drizzle(client, { schema })
export { schema }
