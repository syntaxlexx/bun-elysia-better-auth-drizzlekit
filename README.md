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

## Livechat: Via Soketi + Pusher protocol

For local development, launch [Soketi](https://docs.soketi.app/getting-started/installation/docker) via Docker

`docker-compose.yml`

```yml
version: "3.8"

services:
  soketi:
    image: quay.io/soketi/soketi:1.4-16-debian
    container_name: soketi
    ports:
      - "6001:6001"
      - "9601:9601"
    environment:
      - DEBUG=1
      # You can add custom app credentials below if needed
      # - SOKETI_DEFAULT_APP_ID=app-id
      # - SOKETI_DEFAULT_APP_KEY=app-key
      # - SOKETI_DEFAULT_APP_SECRET=app-secret
    restart: unless-stopped
```

Then run

```bash
docker compose up -d
```

If you plan to use `.env` for docker setup, here's the modified `docker-compose.yml`

```env
version: '3.8'

services:
  soketi:
    image: quay.io/soketi/soketi:1.4-16-debian
    container_name: soketi
    ports:
      - "${PORT:-6001}:6001"
      - "${METRICS_PORT:-9601}:9601"
    env_file:
      - .env
    restart: unless-stopped
```

Sample docker .env setup

```env
# App Credentials
SOKETI_DEFAULT_APP_ID=my-app-id
SOKETI_DEFAULT_APP_KEY=my-app-key
SOKETI_DEFAULT_APP_SECRET=my-app-secret

# Debugging (Set to 0 in production)
DEBUG=1

# Optional: Port configuration
PORT=6001
METRICS_PORT=9601
```

Verify environment variables are loaded inside the container:

```bash
docker compose exec soketi env
```

### App/Client setup

Using Pusher library

```ts
import Pusher from "pusher"

const pusher = new Pusher({
  appId: process.env.SOKETI_DEFAULT_APP_ID || "my-app-id",
  key: process.env.SOKETI_DEFAULT_APP_KEY || "my-app-key",
  secret: process.env.SOKETI_DEFAULT_APP_SECRET || "my-app-secret",
  cluster: "mt1", // Soketi ignores the cluster, but the Pusher SDK requires a value here
  host: "127.0.0.1", // Use your server IP or container name if running inside another Docker container (e.g., "soketi")
  port: "6001",
  useTLS: false, // Set to true if you configured SSL termination on Soketi
})
```

#### Trigger an Event

You can now broadcast messages to channels just like you would with regular Pusher:

```ts
async function triggerEvent() {
  try {
    await pusher.trigger("my-channel", "my-event", {
      message: "Hello from Node.js via Soketi!",
    })
    console.log("Event triggered successfully!")
  } catch (error) {
    console.error("Error triggering event:", error)
  }
}

triggerEvent()
```

## Deploying to Prod

The project can be deployed in several ways

1. Vercel
2. Netlify
3. Your own VPS
4. Laravel Cloud

When deploying to your own VPS, you may decide to

- Build a Docker image and host it in DockerHub or Github Container Registry.
- Manually trigger deployment and build the image right in your VPS, bypassing DockerHub/GHCR. Github Actions can automate the process, you simply have to increment the `DEPLOY_PRODUCTION` file at the root of your application.

## Links

- [Vercel Deployment](https://bun-elysia-better-auth-drizzlekit.vercel.app/) -> Deployed via the `vercel` branch
