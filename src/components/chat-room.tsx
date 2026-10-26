import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { RealtimeConfig, RoomDetail, RoomMessage } from "@/lib/records"
import { errorMessage, formatTime, isRoomMessage } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"
import type { PresenceChannel } from "pusher-js"
import Pusher from "pusher-js"
import { useEffect, useRef, useState } from "react"

function appendMessage(current: Array<RoomMessage>, message: RoomMessage) {
  if (current.some((item) => item.id === message.id)) {
    return current
  }
  return [...current, message]
}

export function ChatRoom({
  detail,
  realtime,
}: {
  detail: RoomDetail
  realtime: RealtimeConfig | null
}) {
  const [messages, setMessages] = useState(detail.messages)
  const [online, setOnline] = useState<ReadonlySet<string>>(new Set())
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const clientRef = useRef<Pusher | null>(null)
  const endpointRef = useRef("")
  const sessionRef = useRef(0)
  const roomId = detail.room.id
  const realtimeKey = realtime?.key
  const realtimeCluster = realtime?.cluster
  const realtimeHost = realtime?.host ?? ""
  const realtimePort = realtime?.port ?? 443
  const realtimeForceTLS = realtime?.forceTLS ?? true

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !stickRef.current) {
      return
    }
    scroller.scrollTop = scroller.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!realtimeKey || !realtimeCluster) {
      return
    }

    const endpoint = `${realtimeKey}|${realtimeCluster}|${realtimeHost}|${realtimePort}|${realtimeForceTLS}`
    let client = clientRef.current
    if (!client || endpointRef.current !== endpoint) {
      client?.disconnect()
      endpointRef.current = endpoint
      client = new Pusher(realtimeKey, {
        cluster: realtimeCluster,
        forceTLS: realtimeForceTLS,
        ...(realtimeHost
          ? {
              wsHost: realtimeHost,
              wsPort: realtimePort,
              wssPort: realtimePort,
              disableStats: true,
              enabledTransports: ["ws", "wss"] as Array<"ws" | "wss">,
            }
          : {}),
        channelAuthorization: {
          customHandler({ socketId, channelName }, callback) {
            void fetch("/api/realtime/auth", {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ socketId, channelName }),
            })
              .then(async (response) => {
                const payload: unknown = await response.json()
                if (!response.ok || !isAuthPayload(payload)) {
                  callback(new Error(readMessage(payload)), null)
                  return
                }
                callback(null, payload)
              })
              .catch((cause: unknown) => {
                callback(
                  cause instanceof Error
                    ? cause
                    : new Error("Could not join the live room."),
                  null
                )
              })
          },
        },
      })
      clientRef.current = client
    }

    const session = ++sessionRef.current
    const channelName = `presence-room-${roomId}`
    const channel = client.subscribe(channelName) as PresenceChannel

    const syncMembers = () => {
      const ids = new Set<string>()
      channel.members.each((member: { id?: string }) => {
        if (typeof member.id === "string") {
          ids.add(member.id)
        }
      })
      setOnline(ids)
    }

    const onMessage = (payload: unknown) => {
      if (!isRoomMessage(payload)) {
        return
      }
      setMessages((current) => appendMessage(current, payload))
    }

    const onSubscriptionError = () => {
      setLiveError("Live updates are unavailable.")
    }

    channel.bind("pusher:subscription_succeeded", syncMembers)
    channel.bind("pusher:member_added", syncMembers)
    channel.bind("pusher:member_removed", syncMembers)
    channel.bind("pusher:subscription_error", onSubscriptionError)
    channel.bind("message", onMessage)

    return () => {
      channel.unbind("pusher:subscription_succeeded", syncMembers)
      channel.unbind("pusher:member_added", syncMembers)
      channel.unbind("pusher:member_removed", syncMembers)
      channel.unbind("pusher:subscription_error", onSubscriptionError)
      channel.unbind("message", onMessage)
      client.unsubscribe(channelName)
      queueMicrotask(() => {
        if (sessionRef.current === session && clientRef.current === client) {
          client.disconnect()
          clientRef.current = null
          endpointRef.current = ""
        }
      })
    }
  }, [
    realtimeCluster,
    realtimeForceTLS,
    realtimeHost,
    realtimeKey,
    realtimePort,
    roomId,
  ])

  async function send() {
    const body = draft.trim()
    if (!body || pending) {
      return
    }
    setError(null)
    setPending(true)
    const socketId = clientRef.current?.connection.socket_id
    const { api } = await getTreaty()
    const result = await api
      .rooms({ roomId })
      .messages.post(socketId ? { body, socketId } : { body })
    setPending(false)
    const message = result.data
    if (result.error || !isRoomMessage(message)) {
      setError(errorMessage(result.error, "Could not send the message."))
      return
    }
    setDraft("")
    setMessages((current) => appendMessage(current, message))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  function onScroll() {
    const scroller = scrollerRef.current
    if (!scroller) {
      return
    }
    stickRef.current =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48
  }

  return (
    <section className="flex min-h-128 flex-col gap-3">
      <header className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">{detail.room.name}</h1>
        <ul className="flex flex-wrap gap-2">
          {detail.participants.map((participant) => (
            <li
              key={participant.id}
              className="rounded-2xl bg-muted px-2.5 py-1 text-xs"
            >
              {participant.name}
              {online.has(participant.userId) ? (
                <span className="text-muted-foreground"> · online</span>
              ) : null}
            </li>
          ))}
        </ul>
        {liveError ? (
          <p className="text-sm text-muted-foreground">{liveError}</p>
        ) : null}
      </header>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-background p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {message.authorName} · {formatTime(message.createdAt)}
                </p>
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message"
          maxLength={2000}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || draft.trim().length === 0}>
            Send
          </Button>
        </div>
      </form>
    </section>
  )
}

function readMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.length > 0
  ) {
    return data.message
  }
  return "Could not join the live room."
}

function isAuthPayload(
  data: unknown
): data is { auth: string; channel_data?: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "auth" in data &&
    typeof data.auth === "string"
  )
}
