import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/users/$userId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/admin/users/$userId/roles",
      params: { userId: params.userId },
    })
  },
})
