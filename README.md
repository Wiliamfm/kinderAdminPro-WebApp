# Frontend (Solid + PocketBase)

This app is a SolidJS frontend wired to a PocketBase backend instance.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
VITE_PB_URL=http://127.0.0.1:8090
```

`VITE_PB_URL` is required. The app will fail fast on startup if it is missing or invalid.

## Run

```bash
bun run dev
```

Open `http://localhost:3000`.

## Build

```bash
bun run build
```

```bash
bun run serve
```

## Backend Connectivity Behavior

The home page performs a backend health check against PocketBase and shows:
- `checking` while the request is in flight
- `online` when the backend is reachable
- `offline` when the backend is unreachable or misconfigured
