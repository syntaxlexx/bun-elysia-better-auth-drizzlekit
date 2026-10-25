import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getTreaty } from "./api.$"

export const Route = createFileRoute("/")({
  component: App,
  loader: async () => {
    const { api } = await getTreaty()
    const [hello, ready] = await Promise.all([api.get(), api.ready.get()])

    if (hello.error) {
      throw new Error("Elysia request failed")
    }
    if (ready.error) {
      throw new Error("Database ready check failed")
    }

    return {
      hello: await readText(hello.data),
      database: ready.data.database,
    }
  },
})

async function readText(data: unknown) {
  if (typeof data === "string") {
    return data
  }
  if (
    typeof data === "object" &&
    data !== null &&
    Symbol.asyncIterator in data
  ) {
    let text = ""
    for await (const chunk of data as AsyncIterable<unknown>) {
      if (typeof chunk === "string") {
        text += chunk
      }
    }
    return text
  }
  return ""
}

function App() {
  const { hello, database } = Route.useLoaderData()

  return (
    <div className="min-h-svh p-6">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Elysia is ready</CardTitle>
          <CardDescription>
            TanStack Start is serving Elysia on /api, backed by Postgres.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p>{hello}</p>
          <p>Database: {database}</p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <SessionActions />
        </CardFooter>
      </Card>
    </div>
  )
}

function SessionActions() {
  const [label, setLabel] = useState<string | null>(null)

  async function refresh() {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (result.error || !("fname" in result.data)) {
      setLabel(null)
      return
    }
    setLabel(`${result.data.fname} ${result.data.lname}`)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function logout() {
    const { api } = await getTreaty()
    await api.auth.logout.post()
    setLabel(null)
  }

  if (!label) {
    return (
      <>
        <Button nativeButton={false} render={<Link to="/login" />}>
          Log in
        </Button>
        <Button
          nativeButton={false}
          render={<Link to="/register" />}
          variant="outline"
        >
          Register
        </Button>
      </>
    )
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <p>Signed in as {label}</p>
      <div className="flex gap-2">
        <Button nativeButton={false} render={<Link to="/dashboard" />}>
          Dashboard
        </Button>
        <Button type="button" variant="outline" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </div>
  )
}
