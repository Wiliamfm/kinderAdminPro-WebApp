## Context

The current `README.md` has basic setup/run/build/docker commands but lacks a complete onboarding path. New developers need to know prerequisites, how to configure environment variables, how to connect to PocketBase, and how to deploy to AWS ECS Fargate. The existing `/docs/` directory already covers architecture, data models, and change management — the README should link there, not duplicate.

## Goals / Non-Goals

**Goals:**
- A new developer can go from clone to running locally by following the README alone (plus the linked PocketBase repo)
- Deployment steps are documented with placeholder values for AWS resources
- Environment variables are documented in a table with descriptions
- A `.env.example` file exists with safe placeholder values

**Non-Goals:**
- Documenting PocketBase setup (handled in its own repo)
- Documenting CI/CD pipeline automation
- Duplicating architecture or data model docs from `/docs/`
- Rollback or monitoring procedures

## Decisions

**Extend README.md rather than create a new file**
The README is the first thing a developer sees. Splitting into a separate `docs/operations.md` adds indirection. Since the content is not excessively long, a single README with clear sections is preferable.

**Create `.env.example` instead of documenting vars only in README**
Standard convention. Developers copy it to `.env` and fill in values. The README table provides descriptions, `.env.example` provides the template.

**Use placeholders for all AWS-specific values**
Cluster names, ECR URLs, regions, and service names use `<placeholder>` syntax so the README works across environments without leaking infrastructure details.

**Link to `/docs/` for architecture and internals**
A "Further Reading" section at the bottom links to existing documentation rather than summarizing it.

## Risks / Trade-offs

- [Placeholder drift] AWS placeholders may confuse developers if not filled in → Mitigated by clear comments explaining what each placeholder represents
- [Stale docs] README may drift from actual deployment process over time → Mitigated by keeping deployment section minimal (only the core commands)
