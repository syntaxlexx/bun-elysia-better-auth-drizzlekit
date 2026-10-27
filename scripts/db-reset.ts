import { sql } from "drizzle-orm"
import { db } from "../src/server/db" // Adjust import

async function reset() {
  console.log("Dropping existing public schema...")

  // For PostgreSQL: This drops the schema and everything inside it, then recreates it clean
  await db.execute(sql`DROP SCHEMA public CASCADE;`)
  await db.execute(sql`CREATE SCHEMA public;`)
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`)

  console.log("Database schema wiped clean!")
  process.exit(0)
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
