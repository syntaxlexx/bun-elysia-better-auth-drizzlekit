import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ChatSidebar } from "@/components/chat-sidebar"
import {
  errorMessage,
  isRealtimeConfig,
  isRoomList,
  readApi,
} from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/dashboard/chat")({
  loader: async () => {
    const { api } = await getTreaty()
    const [roomsResult, configResult] = await Promise.all([
      readApi(await api.rooms.$get()),
      readApi(await api.realtime.config.$get()),
    ])
    if (!roomsResult.ok || !isRoomList(roomsResult.data)) {
      throw new Error(errorMessage(roomsResult.data, "Could not load rooms."))
    }
    return {
      rooms: roomsResult.data.rooms,
      realtime:
        !configResult.ok || !isRealtimeConfig(configResult.data)
          ? null
          : configResult.data,
    }
  },
  component: ChatLayout,
})

function ChatLayout() {
  const { rooms, realtime } = Route.useLoaderData()

  return (
    <div className="grid items-start gap-4 md:grid-cols-[16rem_1fr]">
      <ChatSidebar rooms={rooms} />
      <div className="flex flex-col gap-3">
        {realtime ? null : (
          <p className="text-sm text-muted-foreground">
            Live updates are unavailable.
          </p>
        )}
        <Outlet />
      </div>
    </div>
  )
}
