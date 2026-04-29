## ADDED Requirements

### Requirement: README contains prerequisites section
The README SHALL list all required tools (Bun, Docker, AWS CLI) with version guidance and a link to the PocketBase backend repository.

#### Scenario: Developer reads prerequisites
- **WHEN** a new developer opens the README
- **THEN** they see a prerequisites section listing Bun (or Node + npm alternative), Docker, AWS CLI, and a placeholder link to the PocketBase repo

### Requirement: README contains local development guide
The README SHALL provide step-by-step instructions to run the application locally for development, including dependency installation, environment configuration, starting the dev server, and running tests.

#### Scenario: Developer sets up local environment
- **WHEN** a developer follows the local development steps
- **THEN** they can install dependencies with `bun install`, copy `.env.example` to `.env`, start the dev server with `bun run dev`, and run tests with `bun run test`

### Requirement: README contains environment variables table
The README SHALL document all environment variables in a table with columns for variable name, whether it is required, default value, and description.

#### Scenario: Developer configures environment
- **WHEN** a developer looks up an environment variable
- **THEN** they find its purpose, whether it is required, and its default value (if any) in the table

### Requirement: .env.example file exists with placeholder values
A `.env.example` file SHALL exist at the project root containing all environment variables with safe placeholder values instead of real credentials.

#### Scenario: Developer creates .env from example
- **WHEN** a developer copies `.env.example` to `.env`
- **THEN** the file contains all required variable keys with placeholder values that clearly indicate what to fill in

### Requirement: README contains AWS ECS Fargate deployment section
The README SHALL document the deployment process to AWS ECS Fargate including ECR authentication, Docker image build and push, and ECS service update commands with placeholder values for AWS-specific resources.

#### Scenario: Developer deploys to ECS
- **WHEN** a developer follows the deployment section
- **THEN** they see commands for: AWS ECR login, Docker build and tag, Docker push to ECR, and `aws ecs update-service --force-new-deployment` with placeholders for region, account ID, ECR repo, cluster name, and service name

### Requirement: README links to project documentation
The README SHALL include a "Further Reading" section with links to the existing documentation in `/docs/` (overview, architecture, change management).

#### Scenario: Developer wants to learn about architecture
- **WHEN** a developer finishes the setup and wants to understand the codebase
- **THEN** the README directs them to `docs/overview.md`, `docs/architecture.md`, and `docs/change-management.md`
