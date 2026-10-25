import { createFileRoute } from "@tanstack/react-router"
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
      hello: hello.data,
      database: ready.data.database,
    }
  },
})

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
        <CardFooter>
          <Button nativeButton={false} render={<a href="/api" />}>
            Open /api
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
