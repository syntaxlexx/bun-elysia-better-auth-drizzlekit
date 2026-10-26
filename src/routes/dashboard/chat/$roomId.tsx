import { createFileRoute, notFound } from "@tanstack/react-router"
import { ChatRoom } from "@/components/chat-room"
import { errorMessage, isRoomDetail, readApi } from "@/lib/records"
import { getTreaty } from "@api"
import { Route as ChatRoute } from "./route"

export const Route = createFileRoute("/dashboard/chat/$roomId")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const joined = await readApi(
      await api.rooms[":roomId"].join.$post({
        param: { roomId: params.roomId },
      })
    )
    if (!joined.ok) {
      if (joined.status === 404) {
        throw notFound()
      }
      throw new Error(errorMessage(joined.data, "Could not join the room."))
    }
    const result = await readApi(
      await api.rooms[":roomId"].$get({ param: { roomId: params.roomId } })
    )
    if (!result.ok) {
      if (result.status === 404) {
        throw notFound()
      }
      throw new Error(errorMessage(result.data, "Could not load the room."))
    }
    if (!isRoomDetail(result.data)) {
      throw notFound()
    }
    return { detail: result.data }
  },
  component: ChatRoomPage,
})

function ChatRoomPage() {
  const { detail } = Route.useLoaderData()
  const { realtime } = ChatRoute.useLoaderData()

  return <ChatRoom key={detail.room.id} detail={detail} realtime={realtime} />
}
