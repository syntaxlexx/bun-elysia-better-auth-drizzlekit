# Load testing

Measure the production server on a machine shaped like a small VPS: **2 vCPU and 4 GB RAM**. The load generator stays outside that budget. A dev server (`vp dev`) compiles on demand and is not a capacity result.

This app serves two kinds of work on one process:

- HTML routes render React on the server. Loaders call Elysia in-process through `getTreaty()`, so a document request does not make a second HTTP hop.
- `/api/*` is the Elysia app in `src/server/app.ts`, forwarded by `src/routes/api.$.ts`.

Postgres is `postgres.js` with a pool of 10 (`src/server/db/index.ts`). Register and login hash passwords with `node:crypto` `scrypt` at Node's defaults (`N=16384`, `r=8`, `p=1`, about 32 MB per hash). On 2 cores that hash is the login ceiling.

## What a realistic request costs

| Request                   | Work                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `GET /api`                | In-memory string. Baseline.                                                        |
| `GET /api/ready`          | `select current_database()`.                                                       |
| `GET /`                   | SSR, then in-process `GET /api` and `GET /api/ready`.                              |
| `GET /api/posts`          | Public post list query.                                                            |
| `GET /posts`              | SSR plus that same list query.                                                     |
| `GET /api/posts/:postId`  | Post, comments, rating, and `views_counter = views_counter + 1` for a public view. |
| `GET /posts/:postId`      | SSR, that write, and `GET /api/me` (401 when anonymous).                           |
| `POST /api/auth/login`    | User lookup plus scrypt. CPU-bound.                                                |
| `POST /api/auth/register` | scrypt plus an insert. Unique email or phone.                                      |

Run API and HTML scenarios separately, then a mixed one. API-only numbers hide React rendering. HTML-only numbers hide clients that call `/api` directly.

`GET /api/posts/:postId` and `GET /posts/:postId` write on every hit. Many virtual users on one post id queue on that row. Spread ids for the capacity run, and keep a separate run that hammers one id so the lock shows up on purpose.

## The 2 vCPU / 4 GB box

macOS cannot apply a Linux cgroup to a native process. Use a Linux VM or a container limit. Generate load from the Mac so k6 does not steal the cores you are measuring.

### Preferred: a VM with those specs

[Colima](https://github.com/abiosoft/colima) starts a Linux VM and a Docker runtime inside it:

```bash
colima start --cpu 2 --memory 4 --disk 20
colima status
```

Anything you run with `docker` after that shares 2 CPUs and 4 GB, including Postgres if it is a container. That is the single-box case (app and database contend for the same cores and RAM).

Stop it when you are done so later Docker work is not stuck on a tiny VM:

```bash
colima stop
```

OrbStack, Lima, or Multipass are the same idea if you set the machine to 2 CPUs and 4 GB and run the app inside it.

### Faster approximation: cap one container

When Postgres stays on the host, cap only the app. The app then gets the whole budget, and the numbers are optimistic compared with a VPS that also runs the database.

```bash
docker run --rm -it \
  --cpus=2 \
  --memory=4g \
  --memory-swap=4g \
  -p 3000:3000 \
  -v "$PWD":/app -w /app \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/elysia_tanstart_load \
  -e NODE_ENV=production \
  oven/bun:1 \
  bun x vp preview --host 0.0.0.0 --port 3000
```

`--memory-swap=4g` matches the RAM cap so the kernel cannot hide pressure in swap. Build on the host first (`vp build`) and mount the repo, including `node_modules` and the build output. Building inside the 2-core cap only measures the compiler.

`--cpus=2` is a quota. In `docker stats`, **200%** means both cores are full.

To put Postgres inside the same budget, add a second service and split the cap (for example app 1.5 CPU / 3 GB, Postgres 0.5 CPU / 1 GB). That split is a model. The VM above is the shared-scheduler case.

Leave Node's default heap alone. Raising `--max-old-space-size` toward 4 GB leaves nothing for the rest of the process and for Postgres.

## Isolate the database

Use a database that is not your dev data. Public post views increment `views_counter`, and a login run creates sessions.

```bash
createdb elysia_tanstart_load
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/elysia_tanstart_load bun run db:migrate
```

Point the server at that URL. The readiness check should report `elysia_tanstart_load`:

```bash
curl -s http://127.0.0.1:3000/api/ready
```

## Serve the production build

```bash
vp build
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/elysia_tanstart_load \
  vp preview --host 127.0.0.1 --port 3000
```

Inside the capped container, bind `0.0.0.0` and keep the published port at 3000. Warm the process with a few curls before the timed run. The first requests pay route and query setup.

## Tooling

Install [k6](https://k6.io/) on the host (`brew install k6`). One binary, scenarios, cookies, and thresholds. `docker stats` (or the VM's `top`) is the CPU and RAM readout. Watch it during the run. A latency chart without the CPU line does not tell you whether you saturated the box.

Optional: `wrk` or `autocannon` for a single-URL smoke check. The scenarios below are the actual test.

## Seed

Register a writer, then create published posts. Passwords must be at least 8 characters. Email must contain one `@` and a domain. The session cookie name is `session`.

```bash
BASE=http://127.0.0.1:3000

curl -s -c /tmp/load-cj -H 'content-type: application/json' \
  -d '{"fname":"Load","lname":"Tester","email":"load@example.com","password":"load-test-password"}' \
  $BASE/api/auth/register

for i in 1 2 3 4 5 6 7 8; do
  curl -s -b /tmp/load-cj -H 'content-type: application/json' \
    -d "{\"title\":\"Load post $i\",\"body\":[{\"type\":\"paragraph\",\"content\":\"seed\"}],\"status\":\"PUBLISHED\"}" \
    $BASE/api/posts
done

curl -s $BASE/api/posts
```

Save the returned post ids. A later login uses `load@example.com` / `load-test-password`.

Add more users only if the login scenario should spread scrypt across accounts. One account is enough to find the CPU ceiling. Registration during the timed run mixes unique-key conflicts into the result. Seed first.

## Scenarios

Put the scripts in a scratch directory (they are not part of the app). Replace `POST_IDS` with ids from the seed. Point `BASE` at the server under test.

Shared thresholds, as a first budget for this box. Tighten them after you have a baseline:

- Failed HTTP responses under 1% (treat status 0 and 5xx as failure; 401 is expected only where a scenario allows it).
- Read and HTML `p(95)<500` while the error rate stays under 1%.
- Login has no latency budget copied from reads. Record the rate at which both cores stay near 200% and `p(95)` starts climbing. That rate is the capacity.

### 1. API reads

Cheap path and the list. Confirms the process and the pool before SSR.

```javascript
import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  scenarios: {
    reads: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
}

const BASE = __ENV.BASE || "http://127.0.0.1:3000"

export default function () {
  const ready = http.get(`${BASE}/api/ready`)
  check(ready, { "ready 200": (r) => r.status === 200 })
  const posts = http.get(`${BASE}/api/posts`)
  check(posts, { "posts 200": (r) => r.status === 200 })
  sleep(0.2)
}
```

### 2. Public HTML

This is the anonymous visitor. `/` hits the database once. `/posts` renders the list. `/posts/:id` also increments a view.

```javascript
import http from "k6/http"
import { check, sleep } from "k6"

const POST_IDS = (__ENV.POST_IDS || "").split(",").filter(Boolean)

export const options = {
  scenarios: {
    html: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 25 },
        { duration: "1m", target: 25 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
}

const BASE = __ENV.BASE || "http://127.0.0.1:3000"

export default function () {
  check(http.get(`${BASE}/`), { "home 200": (r) => r.status === 200 })
  check(http.get(`${BASE}/posts`), { "list 200": (r) => r.status === 200 })
  if (POST_IDS.length > 0) {
    const id = POST_IDS[Math.floor(Math.random() * POST_IDS.length)]
    check(http.get(`${BASE}/posts/${id}`), {
      "post 200": (r) => r.status === 200,
    })
  }
  sleep(0.5)
}
```

```bash
k6 run -e POST_IDS=id1,id2,id3,id4,id5,id6,id7,id8 /tmp/load-html.js
```

Start the VU targets lower than the API run. SSR does more CPU per request. If `p(95)` is already over the budget at 10 VUs, the next stage is past the knee. Stop and record that.

### 3. One hot post

Same script as the HTML run, with `POST_IDS` set to a single id, and a flat 25 VUs for one minute. Expect the view update to dominate. Compare `p(95)` with scenario 2. The gap is row contention, not rendering.

### 4. Login capacity

Keep virtual users at or below the core count, then a step above it. Each iteration is one scrypt.

```javascript
import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  scenarios: {
    login: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 1 },
        { duration: "30s", target: 1 },
        { duration: "20s", target: 2 },
        { duration: "30s", target: 2 },
        { duration: "20s", target: 4 },
        { duration: "30s", target: 4 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
}

const BASE = __ENV.BASE || "http://127.0.0.1:3000"

export default function () {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({
      identifier: "load@example.com",
      password: "load-test-password",
    }),
    { headers: { "content-type": "application/json" } }
  )
  check(res, { "login 200": (r) => r.status === 200 })
  sleep(0.1)
}
```

Each success inserts a session. Truncate `sessions` between repeats, or the table grows for no reason:

```bash
psql "$DATABASE_URL" -c "truncate sessions;"
```

`UV_THREADPOOL_SIZE` defaults to 4. With 2 cores, extra threads only add scheduling. Leave it at the default unless you are explicitly testing that knob, and then change one thing.

### 5. Signed-in read

Log in once per VU, then hit `/api/me`, `/api/posts`, and one post. This is the pool and session lookup, with scrypt paid up front.

```javascript
import http from "k6/http"
import { check, sleep } from "k6"

const POST_IDS = (__ENV.POST_IDS || "").split(",").filter(Boolean)

export const options = {
  scenarios: {
    authed: {
      executor: "constant-vus",
      vus: 10,
      duration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:read}": ["p(95)<500"],
  },
}

const BASE = __ENV.BASE || "http://127.0.0.1:3000"

export default function () {
  const login = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({
      identifier: "load@example.com",
      password: "load-test-password",
    }),
    { headers: { "content-type": "application/json" }, tags: { kind: "login" } }
  )
  check(login, { "login 200": (r) => r.status === 200 })

  for (let i = 0; i < 20; i++) {
    check(http.get(`${BASE}/api/me`, { tags: { kind: "read" } }), {
      "me 200": (r) => r.status === 200,
    })
    check(http.get(`${BASE}/api/posts`, { tags: { kind: "read" } }), {
      "posts 200": (r) => r.status === 200,
    })
    if (POST_IDS.length > 0) {
      const id = POST_IDS[i % POST_IDS.length]
      check(http.get(`${BASE}/api/posts/${id}`, { tags: { kind: "read" } }), {
        "post 200": (r) => r.status === 200,
      })
    }
    sleep(0.3)
  }
}
```

k6 stores the `session` cookie on the VU jar automatically.

### 6. Mixed hour

Weight a closed workload the way a small site actually looks. About 70% anonymous HTML, 25% API reads, 5% logins. Use `constant-arrival-rate` so a slow login does not reduce the read rate.

```javascript
import http from "k6/http"
import { check } from "k6"

const POST_IDS = (__ENV.POST_IDS || "").split(",").filter(Boolean)
const BASE = __ENV.BASE || "http://127.0.0.1:3000"

export const options = {
  scenarios: {
    browse: {
      executor: "constant-arrival-rate",
      rate: 15,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: "browse",
    },
    api: {
      executor: "constant-arrival-rate",
      rate: 5,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: "api",
    },
    login: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 4,
      maxVUs: 8,
      exec: "login",
    },
  },
}

export function browse() {
  const id = POST_IDS[Math.floor(Math.random() * POST_IDS.length)]
  const res = http.get(id ? `${BASE}/posts/${id}` : `${BASE}/posts`)
  check(res, { "browse ok": (r) => r.status === 200 })
}

export function api() {
  check(http.get(`${BASE}/api/posts`), { "api ok": (r) => r.status === 200 })
}

export function login() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({
      identifier: "load@example.com",
      password: "load-test-password",
    }),
    { headers: { "content-type": "application/json" } }
  )
  check(res, { "login ok": (r) => r.status === 200 })
}
```

Start at those rates. If CPU sits well under 200% and `p(95)` is inside the budget, double the rates and run again. The useful number is the highest rate that holds the budget, next to the `docker stats` line from that run.

## How to read a run

Record, for each scenario: VUs or arrival rate, requests/s, `p(95)`, error rate, app CPU%, app RSS, and Postgres CPU% if it shares the box.

| What you see                                               | What it means                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CPU near 200%, latency climbing, errors still rare         | Compute ceiling. Login and SSR hit this first.                                             |
| CPU low, `p(95)` high, Postgres CPU high                   | The database is the limit. Re-run with Postgres outside the cap to separate the two.       |
| Timeouts, empty status, or the process gone                | RAM cap or file descriptors. `docker stats` memory at the limit, then an exit, is the OOM. |
| One-post run much slower than the spread-id run            | `views_counter` updates on a single row.                                                   |
| Reads fine at 10 VUs, worse as soon as login is in the mix | scrypt is occupying the cores the renders need.                                            |
| Latency grows in steps of "waiting for a connection"       | The pool is 10. Extra concurrency queues inside the app.                                   |

Dropped iterations in a `constant-arrival-rate` scenario (`dropped_iterations`) mean k6 could not get a VU in time. The server is slower than the requested rate. That rate is above capacity.

## After the run

```bash
psql postgres://postgres:postgres@127.0.0.1:5432/elysia_tanstart_load \
  -c "truncate sessions; update posts set views_counter = 0;"
```

Drop `elysia_tanstart_load` if you do not need the raw rows. Keep the k6 summary and the matching `docker stats` sample with the date and the exact cap (VM 2 CPU / 4 GB, or container-only). Compare later runs only when the cap, the dataset size, and the production build are the same.
