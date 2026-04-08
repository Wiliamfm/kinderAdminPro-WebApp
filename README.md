# Frontend (Solid + PocketBase)

This app is a SolidJS frontend wired to a PocketBase backend instance.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
PB_URL=http://127.0.0.1:8090
```

`PB_URL` is optional. If unset, the app defaults to `http://127.0.0.1:8090`.

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

## Docker

Build the image:

```bash
docker build -t tesis-front .
```

Run the container:

```bash
docker run --rm -p 3000:3000 -e PB_URL=http://host.docker.internal:8090 tesis-front
```

Open `http://localhost:3000`.

`PB_URL` is read on the server at runtime. Changing it does not require rebuilding the image.

## Backend Connectivity Behavior

The home page performs a backend health check against PocketBase and shows:
- `checking` while the request is in flight
- `online` when the backend is reachable
- `offline` when the backend is unreachable or misconfigured
