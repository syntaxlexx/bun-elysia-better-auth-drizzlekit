import { createFileRoute, notFound } from "@tanstack/react-router"
import { ChatRoom } from "@/components/chat-room"
import { errorMessage, isRoomDetail } from "@/lib/records"
import { getTreaty } from "../../api.$"
import { Route as ChatRoute } from "./route"

export const Route = createFileRoute("/dashboard/chat/$roomId")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const joined = await api.rooms({ roomId: params.roomId }).join.post()
    if (joined.error) {
      if (isMissingRoom(joined.error.value)) {
        throw notFound()
      }
      throw new Error(errorMessage(joined.error, "Could not join the room."))
    }
    const result = await api.rooms({ roomId: params.roomId }).get()
    if (result.error) {
      if (isMissingRoom(result.error.value)) {
        throw notFound()
      }
      throw new Error(errorMessage(result.error, "Could not load the room."))
    }
    if (!isRoomDetail(result.data)) {
      throw notFound()
    }
    return { detail: result.data }
  },
  component: ChatRoomPage,
})

function isMissingRoom(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    value.message === "Room not found."
  )
}

function ChatRoomPage() {
  const { detail } = Route.useLoaderData()
  const { realtime } = ChatRoute.useLoaderData()

  return <ChatRoom key={detail.room.id} detail={detail} realtime={realtime} />
}
