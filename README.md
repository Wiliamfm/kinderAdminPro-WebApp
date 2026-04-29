# Frontend (Solid + PocketBase)

SolidJS frontend wired to a PocketBase backend instance. This guide covers local development setup, building, and deploying to AWS ECS Fargate.

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| [Bun](https://bun.sh) | Package manager & runtime | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://docs.docker.com/get-docker/) | Container builds | Follow official docs |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) | ECS deployment | Follow official docs |

You also need the **PocketBase backend** running. See the [PocketBase repo](https://github.com/Wiliamfm/kinderAdminPro-PocketBase) for setup and deployment instructions.

## Local Development

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/Wiliamfm/kinderAdminPro-WebApp
cd front
bun install
```

2. Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values. See [Environment Variables](#environment-variables) for details.

3. Start PocketBase (see [PocketBase repo](https://github.com/Wiliamfm/kinderAdminPro-PocketBase)).

4. Start the dev server:

```bash
bun run dev
```

Open `http://localhost:3000`.

5. Run tests:

```bash
bun run test
```

Or in watch mode:

```bash
bun run test:watch
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PB_URL` | No | `http://127.0.0.1:8090` | PocketBase backend URL |
| `SMTP_USER` | No | — | SMTP username for sending emails |
| `SMTP_PASSWORD` | No | — | SMTP app password |
| `SMTP_HOST` | No | — | SMTP server host |
| `SMTP_PORT` | No | — | SMTP server port |
| `SMTP_FROM` | No | — | Sender name and email |
| `BASE_ADMIN_EMAIL` | No | — | Initial admin email |
| `BASE_ADMIN_PASSWORD` | No | — | Initial admin password |

The `SMTP_*` variables are only needed for email features. The `BASE_ADMIN_*` variables are used for initial admin account setup.

## Build

Production build:

```bash
bun run build
```

Serve the build locally:

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

## Deployment (AWS ECS Fargate)

### Prerequisites

- AWS CLI configured with credentials (`aws configure`)
- An ECR repository created for this project
- An ECS cluster and service already set up

### 1. Authenticate with ECR

```bash
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com
```

### 2. Build and tag the image

```bash
docker build -t <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/<ECR_REPO_NAME>:latest .
```

### 3. Push to ECR

```bash
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/<ECR_REPO_NAME>:latest
```

### 4. Deploy to ECS

```bash
aws ecs update-service --cluster <ECS_CLUSTER_NAME> --service <ECS_SERVICE_NAME> --force-new-deployment
```

Environment variables (`PB_URL`, `SMTP_*`, etc.) are configured in the ECS task definition, not in the image.

## Backend Connectivity

The home page performs a backend health check against PocketBase and shows:
- `checking` while the request is in flight
- `online` when the backend is reachable
- `offline` when the backend is unreachable or misconfigured

## Further Reading

- [Project Overview](docs/overview.md) — scope, workflows, and tech stack
- [Architecture](docs/architecture.md) — routes, components, data models, and authorization
- [Change Management](docs/change-management.md) — process for making changes
