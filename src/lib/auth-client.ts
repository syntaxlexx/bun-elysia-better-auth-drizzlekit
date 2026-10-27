import { createAuthClient } from "better-auth/client"
import {
  emailOTPClient,
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins"
import type { auth } from "@/server/auth"

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    phoneNumberClient(),
  ],
})

export async function signOut() {
  await authClient.signOut()
}
