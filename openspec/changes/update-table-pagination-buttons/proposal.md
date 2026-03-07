## Why

The current table pagination only exposes `Anterior` and `Siguiente`, which makes large result sets slow to navigate because users cannot jump directly to distant pages or understand their position relative to the beginning and end of the list. We need a richer pagination pattern now because the shared control is reused across many admin tables, so one improvement can make navigation faster and more predictable everywhere.

## What Changes

- Update the shared table pagination behavior to render direct page buttons in addition to the existing previous/next controls.
- Always show the first and last page buttons when more than one page exists.
- Show the current page with adjacent intermediate pages so users can move within the local page range without stepping one page at a time.
- Render non-interactive gap markers when hidden page ranges exist between the edge pages and the visible intermediate pages.
- Preserve current disabled and busy behavior so navigation requests remain blocked while table data is loading.

## Capabilities

### New Capabilities
- `shared-pagination-navigation`: Defines how reusable table pagination controls expose first, last, nearby, and gap states across paginated tables.

### Modified Capabilities
- None.

## Impact

- Affected UI component: `src/components/PaginationControls.tsx`.
- Affected consumers: all page and modal tables that already use the shared pagination control.
- Affected tests: pagination behavior coverage in page-level or component-level tests will need updates or new assertions.
- No backend, API, or PocketBase schema changes.
