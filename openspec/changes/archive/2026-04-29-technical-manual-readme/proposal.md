## Why

The project lacks onboarding documentation for new developers. The current README covers basic commands but doesn't explain prerequisites, environment variable configuration, or how to deploy to AWS ECS Fargate. A new developer joining the team cannot get from zero to running locally or deploying without tribal knowledge.

## What Changes

- Extend `README.md` with a complete local development guide (prerequisites, PocketBase setup link, env config, dev server, tests)
- Add an environment variables reference table
- Add AWS ECS Fargate deployment instructions (ECR login, build, push, service update)
- Add a "Further Reading" section linking to existing `/docs/` documentation
- Create `.env.example` with placeholder values (the current `.env` contains real credentials)

## Capabilities

### New Capabilities
- `technical-manual`: Comprehensive README covering local development setup, environment configuration, Docker builds, AWS ECS Fargate deployment, and links to project documentation.

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- `README.md` — rewritten/extended with full onboarding guide
- `.env.example` — new file with placeholder environment variables
- No code changes, no API changes, no dependency changes
