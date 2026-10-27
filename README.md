# TanStack Start + shadcn/ui

This is a template for a new TanStack Start project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Docker

`docker compose up --build` uses the host network, applies the Drizzle migrations to the Postgres in `DATABASE_URL`, and serves the app at `http://localhost:3000`. Avatar uploads go to Cloudflare R2. Pusher settings are read from the project `.env` when those variables are set. `docker compose -f docker-compose-with-postgres.yml up --build` starts Postgres in Docker instead.

## Links

- [Vercel Deployment](https://bun-elysia-better-auth-drizzlekit.vercel.app/) -> Deployed via the `vercel` branch
