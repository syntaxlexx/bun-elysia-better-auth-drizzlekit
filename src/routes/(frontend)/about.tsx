import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/(frontend)/about")({
  head: () => ({
    meta: [
      { title: "About — Folio" },
      {
        name: "description",
        content:
          "Folio is a small publishing desk for drafts and public posts.",
      },
    ],
  }),
  component: AboutPage,
})

const principles = [
  {
    title: "Private by default",
    body: "A new post is a draft. Nothing reaches the shelf until you publish it, and a future date keeps it waiting.",
  },
  {
    title: "One voice per piece",
    body: "You write the title and the document. Readers can comment and leave a single rating with a review. They cannot rewrite the post.",
  },
  {
    title: "A name on the work",
    body: "Accounts carry a first and last name, a profile, and an avatar. The shelf shows who wrote the piece.",
  },
] as const

function AboutPage() {
  return (
    <main className="container flex flex-col gap-16 py-16 lg:py-24">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">About us</p>
        <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Folio is a desk, not a feed.
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          We built Folio for people who want a finished piece to have a
          permanent place, and an unfinished one to stay out of sight. The
          public shelf is a reading room. The dashboard is the room behind it.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-4 text-muted-foreground">
          <p>
            Most writing tools ask you to be visible the whole time. Folio
            splits the work in two. While a post is a draft, it belongs to you
            and to anyone who administers the desk. When you publish, it takes a
            place on the shelf, counts a view, and accepts comments.
          </p>
          <p>
            If the piece should land later, set a time. Readers will not see it
            early. You can still open it, edit it, and change your mind before
            that morning arrives.
          </p>
          <p>
            The studio is small on purpose. There is no ranking, no endless
            scroll of other people’s drafts, and no second copy of your document
            hiding in another format. The post you write is the post that
            publishes.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>What you can do here</CardTitle>
            <CardDescription>
              Create an account with an email or a phone number. Write in the
              dashboard. Read what other people have already published.
            </CardDescription>
          </CardHeader>
          <CardHeader>
            <CardTitle>Who it is for</CardTitle>
            <CardDescription>
              Essayists, note-keepers, and anyone who wants a public page
              without turning the draft into a performance.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-3xl font-medium tracking-tight">
          How we keep the desk
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((principle) => (
            <Card key={principle.title}>
              <CardHeader>
                <CardTitle>{principle.title}</CardTitle>
                <CardDescription>{principle.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-[min(var(--radius-4xl),24px)] border border-border bg-muted/40 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="font-heading text-2xl font-medium">
            Questions about the desk
          </h2>
          <p className="text-sm text-muted-foreground">
            The contact page is the place to leave a name and a note.
          </p>
        </div>
        <Button nativeButton={false} render={<Link to="/contact" />}>
          Contact us
        </Button>
      </section>
    </main>
  )
}
