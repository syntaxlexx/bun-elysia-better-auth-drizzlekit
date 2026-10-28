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
import {
  changePassword,
  meQuery,
  updateProfile,
  uploadAvatar,
  userKeys,
} from "@/lib/queries/users"
import type { ProfileWrite } from "@/lib/queries/users"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/dashboard/profile")({
  loader: ({ context }) => context.queryClient.query(meQuery()),
  component: ProfilePage,
})

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function ProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(meQuery())

  async function refreshProfile() {
    await queryClient.invalidateQueries({ queryKey: userKeys.me })
    await router.invalidate()
  }

  const profile = useMutation({
    mutationFn: (input: ProfileWrite) => updateProfile(input),
    onSuccess: refreshProfile,
  })
  const password = useMutation({
    mutationFn: (nextPassword: string) => changePassword(nextPassword),
  })
  const avatar = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: refreshProfile,
  })
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const pending = profile.isPending || password.isPending || avatar.isPending
  const photoError =
    avatarError ?? (avatar.error instanceof Error ? avatar.error.message : null)

  function onProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    profile.reset()
    const form = new FormData(event.currentTarget)
    profile.mutate({
      fname: field(form, "fname"),
      lname: field(form, "lname"),
      email: field(form, "email"),
      phone: field(form, "phone"),
    })
  }

  function onPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    password.reset()
    const form = event.currentTarget
    password.mutate(field(new FormData(form), "nextPassword"), {
      onSuccess: () => {
        form.reset()
      },
    })
  }

  function onAvatar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAvatarError(null)
    avatar.reset()
    const form = event.currentTarget
    const file = new FormData(form).get("avatar")
    if (!(file instanceof File) || file.size === 0) {
      setAvatarError("Choose an image.")
      return
    }
    avatar.mutate(file, {
      onSuccess: () => {
        form.reset()
      },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <form
          key={`${user.fname}:${user.lname}:${user.email}:${user.phone}`}
          onSubmit={onProfile}
        >
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your email is how password and email-code sign-in find you.
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
                required
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
            {profile.error instanceof Error ? (
              <p className="text-sm text-destructive">
                {profile.error.message}
              </p>
            ) : null}
            {profile.isSuccess ? (
              <p className="text-sm">Profile saved.</p>
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
              {photoError ? (
                <p className="text-sm text-destructive">{photoError}</p>
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
              {password.error instanceof Error ? (
                <p className="text-sm text-destructive">
                  {password.error.message}
                </p>
              ) : null}
              {password.isSuccess ? (
                <p className="text-sm">Password updated.</p>
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
