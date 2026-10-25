import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Field, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { errorMessage, isSessionUser } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/dashboard/profile")({
  loader: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (result.error || !isSessionUser(result.data)) {
      throw new Error("Could not load your profile.")
    }
    return { user: result.data }
  },
  component: ProfilePage,
})

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function ProfilePage() {
  const router = useRouter()
  const { user } = Route.useLoaderData()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    setProfileMessage(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const { api } = await getTreaty()
    const result = await api.me.patch({
      fname: field(form, "fname"),
      lname: field(form, "lname"),
      email: field(form, "email"),
      phone: field(form, "phone"),
    })
    setPending(false)
    if (result.error) {
      setProfileError(errorMessage(result.error, "Could not update profile."))
      return
    }
    setProfileMessage("Profile saved.")
    await router.invalidate()
  }

  async function onPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const { api } = await getTreaty()
    const result = await api.me.password.put({
      nextPassword: field(form, "nextPassword"),
    })
    setPending(false)
    if (result.error) {
      setPasswordError(errorMessage(result.error, "Could not change password."))
      return
    }
    event.currentTarget.reset()
    setPasswordMessage("Password updated.")
  }

  async function onAvatar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAvatarError(null)
    const form = new FormData(event.currentTarget)
    const file = form.get("avatar")
    if (!(file instanceof File) || file.size === 0) {
      setAvatarError("Choose an image.")
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.me.avatar.post({ avatar: file })
    setPending(false)
    if (result.error) {
      setAvatarError(errorMessage(result.error, "Could not upload the image."))
      return
    }
    event.currentTarget.reset()
    await router.invalidate()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <form
          key={`${user.fname}:${user.lname}:${user.email ?? ""}:${user.phone ?? ""}`}
          onSubmit={onProfile}
        >
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Keep at least an email address or a phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="First name">
              <input
                className={fieldClassName}
                name="fname"
                defaultValue={user.fname}
                required
              />
            </Field>
            <Field label="Last name">
              <input
                className={fieldClassName}
                name="lname"
                defaultValue={user.lname}
                required
              />
            </Field>
            <Field label="Email">
              <input
                className={fieldClassName}
                name="email"
                defaultValue={user.email ?? ""}
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldClassName}
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="+14155552671"
              />
            </Field>
            {profileError ? (
              <p className="text-sm text-destructive">{profileError}</p>
            ) : null}
            {profileMessage ? (
              <p className="text-sm">{profileMessage}</p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              Save profile
            </Button>
          </CardFooter>
        </form>
      </Card>
      <div className="flex flex-col gap-4">
        <Card>
          <form onSubmit={onAvatar}>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
              <CardDescription>PNG, JPEG, or WebP up to 2 MB.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-20 rounded-2xl object-cover"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No photo yet.</p>
              )}
              <input
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
              />
              {avatarError ? (
                <p className="text-sm text-destructive">{avatarError}</p>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={pending}>
                Upload photo
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <form onSubmit={onPassword}>
            <CardHeader>
              <CardTitle>Password</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Field label="New password">
                <input
                  className={fieldClassName}
                  name="nextPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
              {passwordMessage ? (
                <p className="text-sm">{passwordMessage}</p>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="outline" disabled={pending}>
                Change password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
