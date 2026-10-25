import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/dashboard/chat/")({
  component: ChatIndex,
})

function ChatIndex() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a room</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Choose a room from the list, or create one.
        </p>
      </CardContent>
    </Card>
  )
}
