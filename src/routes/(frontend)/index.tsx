import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, BookOpen, Clock3, PenLine, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/(frontend)/")({
  head: () => ({
    meta: [
      { title: "Folio — Write in private. Publish when it is ready." },
      {
        name: "description",
        content:
          "Folio is a desk for drafts, scheduled posts, and a public reading shelf.",
      },
    ],
  }),
  component: HomePage,
})

const features = [
  {
    icon: PenLine,
    title: "Drafts that stay yours",
    body: "A piece stays private while you write. Readers only see it after you publish.",
  },
  {
    icon: Clock3,
    title: "Publish on a schedule",
    body: "Set a future date. The post waits, then appears on the public shelf on time.",
  },
  {
    icon: BookOpen,
    title: "A public reading shelf",
    body: "Published work collects views, comments, and a single rating from each reader.",
  },
  {
    icon: Shield,
    title: "An account with a name",
    body: "Sign in with email and password, a phone code, or an email code.",
  },
] as const

function HomePage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary">A quiet place to publish</Badge>
          <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-6xl">
            Write in private. Publish when it is ready.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Folio is a desk for essays and notes. Keep a draft, schedule the
            morning it should go out, and let readers find it on the shelf.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link to="/register" />}
            >
              Start writing
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link to="/posts" />}
            >
              Read the shelf
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Badge variant="outline">Draft</Badge>
              <CardTitle className="text-lg">
                Notes from a quiet morning
              </CardTitle>
              <CardDescription>Only you can open this one.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The first paragraph is still looking for its last sentence.
                Leave it here until it sounds like you.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Badge>Scheduled</Badge>
              <CardTitle className="text-lg">The shelf opens at dawn</CardTitle>
              <CardDescription>Goes public tomorrow morning.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Readers will see the title, the piece, and a place to leave a
                rating once the clock passes.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <Highlight
            label="Private until you say so"
            body="Drafts never appear on the public shelf."
          />
          <Highlight
            label="One rating per reader"
            body="A score from 1 to 5 and a written review, once, on each published post."
          />
          <Highlight
            label="Comments in plain text"
            body="A conversation under the piece, without a second editor."
          />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 lg:py-24">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Everything the desk is for
          </h2>
          <p className="text-muted-foreground">
            Folio stays small on purpose. Write, schedule, publish, and read.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <feature.icon className="size-4" />
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="flex flex-col items-start gap-6 rounded-[min(var(--radius-4xl),24px)] bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <h2 className="max-w-xl font-heading text-3xl font-medium tracking-tight text-balance">
            Open a desk and leave the first draft unfinished.
          </h2>
          <p className="max-w-lg text-primary-foreground/80">
            An account needs a name, a password, and either an email or a phone
            number.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link to="/register" />}
            >
              Create an account
            </Button>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link to="/about" />}
            >
              About Folio
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Highlight({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-heading text-lg font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
