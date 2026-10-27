import "@tanstack/react-start/server-only"

export function deliverOneTimeCode(
  channel: "email" | "phone",
  destination: string,
  code: string,
  type: string
) {
  if (process.env.NODE_ENV === "production") {
    console.info(
      `[auth] ${type} code for ${channel} ${destination} was not delivered. Configure a sender before production use.`
    )
    return
  }

  console.info(`[auth] ${type} ${channel} code for ${destination}: ${code}`)
}
