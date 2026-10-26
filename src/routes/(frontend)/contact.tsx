import { Field } from "@/components/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createFileRoute } from "@tanstack/react-router"
import { SendIcon } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/(frontend)/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Folio" },
      {
        name: "description",
        content: "Write to the Folio desk.",
      },
    ],
  }),
  component: ContactPage,
})

function ContactPage() {
  const [sent, setSent] = useState<{
    name: string
    email: string
    message: string
  } | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get("name")
    const email = form.get("email")
    const message = form.get("message")
    setSent({
      name: typeof name === "string" ? name : "",
      email: typeof email === "string" ? email : "",
      message: typeof message === "string" ? message : "",
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 lg:py-24">
      <header className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">Contact us</p>
        <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Write to the desk.
        </h1>
        <p className="text-lg text-muted-foreground">
          Questions about an account, a published piece, or the studio itself.
          Leave a name, an email, and a short message.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Send a note</CardTitle>
            <CardDescription>
              Tell us who you are and what you need. A short message is enough.
            </CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent>
              <Alert>
                <AlertTitle>Thanks, {sent.name}.</AlertTitle>
                <AlertDescription>
                  <p>
                    This page is showing your note for {sent.email}. Folio does
                    not send it.
                  </p>
                  <p>{sent.message}</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          ) : (
            <form onSubmit={onSubmit}>
              <CardContent className="flex flex-col gap-3">
                <Field label="Name">
                  <Input name="name" autoComplete="name" required />
                </Field>
                <Field label="Email">
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Topic">
                  <Input
                    name="topic"
                    placeholder="An account, a post, the studio"
                  />
                </Field>
                <Field label="Message">
                  <Textarea name="message" required />
                </Field>
              </CardContent>
              <CardFooter>
                <Button type="submit">
                  Send note
                  <SendIcon />
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>The desk</CardTitle>
              <CardDescription>
                Folio studio reads notes in the order they arrive. Account
                questions and published-post questions come to the same place.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>What to include</CardTitle>
              <CardDescription>
                Your name, the email on the account if you have one, and the
                title of the post if the note is about a piece on the shelf.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Already writing here?</CardTitle>
              <CardDescription>
                Sign in and use the dashboard for drafts, your profile, and
                posts you have already published.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  )
}
