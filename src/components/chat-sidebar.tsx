import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Field, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import { errorMessage, isRoom } from "@/lib/records"
import type { Room } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"

const roomLinkClassName = "hover:bg-muted block rounded-2xl px-3 py-2 text-sm"
const roomLinkActiveClassName =
  "bg-muted block rounded-2xl px-3 py-2 text-sm font-medium"

export function ChatSidebar({ rooms }: { rooms: Array<Room> }) {
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.rooms.post({ name })
    setPending(false)
    if (result.error || !isRoom(result.data)) {
      setError(errorMessage(result.error, "Could not create the room."))
      return
    }
    setName("")
    await router.invalidate()
    await navigate({
      to: "/dashboard/chat/$roomId",
      params: { roomId: result.data.id },
    })
  }

  return (
    <aside className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => void onCreate(event)}
      >
        <Field label="New room">
          <input
            className={fieldClassName}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Room name"
          />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          Create room
        </Button>
      </form>
      <nav className="flex flex-col gap-1">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rooms yet.</p>
        ) : (
          rooms.map((room) => (
            <Link
              key={room.id}
              to="/dashboard/chat/$roomId"
              params={{ roomId: room.id }}
              className={roomLinkClassName}
              activeProps={{ className: roomLinkActiveClassName }}
            >
              <span className="block">{room.name}</span>
              <span className="text-xs text-muted-foreground">
                {room.participantCount}{" "}
                {room.participantCount === 1 ? "member" : "members"}
              </span>
            </Link>
          ))
        )}
      </nav>
    </aside>
  )
}
