## Context

`src/components/PaginationControls.tsx` is the shared pagination control used by the application tables and modal lists documented in `docs/architecture.md`. Today it only renders `Anterior` and `Siguiente`, so users must step through large result sets one page at a time. The requested behavior adds direct page selection while preserving the existing page state contract (`page`, `totalPages`, `busy`, `onPageChange`) so all current consumers can benefit without page-level API changes.

## Goals / Non-Goals

**Goals:**
- Add numbered page navigation to the shared pagination control used by table views.
- Always expose first and last page buttons when multiple pages exist.
- Show the current page and its immediate neighbors as intermediate navigation targets.
- Collapse skipped ranges into visual gap markers so pagination stays compact on mobile and desktop.
- Preserve current busy and bounds protections so disabled navigation cannot trigger invalid page changes.

**Non-Goals:**
- Changing table page size, server-side pagination queries, or sorting behavior.
- Introducing route-based pagination state or deep-linkable page parameters.
- Customizing pagination behavior separately per page.
- Redesigning the surrounding table layout beyond the shared pagination control.

## Decisions

### Use the shared component as the single implementation point
The numbered navigation will be implemented inside `src/components/PaginationControls.tsx` instead of duplicating logic in each page. This keeps behavior consistent across all paginated tables and avoids touching every consumer beyond any necessary snapshot or interaction tests.

Alternative considered: page-specific pagination rendering. Rejected because the architecture already centralizes pagination UI and a per-page approach would create inconsistent behavior and duplicate logic.

### Keep the existing component props unchanged
The component will continue to accept `page`, `totalPages`, `busy`, `class`, and `onPageChange`. The visible page model can be derived entirely from `page` and `totalPages`, so new props are unnecessary for this change.

Alternative considered: adding props for sibling count or edge count. Rejected because there is no current requirement for per-table tuning, and extra configuration would complicate every caller.

### Use a compact windowed pagination model
When more than one page exists, the control will render:
- previous and next buttons,
- the first page button,
- the last page button,
- the current page button,
- one adjacent page button on each side of the current page when those pages are not already represented by the edges,
- non-interactive ellipsis markers where hidden page ranges remain.

This yields the requested pattern such as `1 … 4 5 6 … 10` for page 5 of 10 while still expanding naturally to all pages when the total count is small enough that no gaps are needed.

Alternative considered: always rendering every page button. Rejected because it becomes unwieldy for large datasets and does not fit narrow layouts.

### Treat the current page as active and non-disruptive during loading
The active page button will be visually distinct. Navigation buttons and numbered page buttons will be disabled when `busy === true`, and clicking the already active page will not fire `onPageChange`.

Alternative considered: leaving numbered buttons active while loading. Rejected because the existing control already treats loading as a disabled state and allowing repeated requests would create unnecessary churn.

## Risks / Trade-offs

- [Pagination density on small screens] -> Keep the visible window compact and use ellipsis markers instead of rendering full ranges.
- [Off-by-one or duplicate-page rendering bugs near the start/end of the range] -> Generate the visible page list from a deduplicated set and cover edge scenarios in tests.
- [Behavior drift across table pages] -> Implement the logic only in the shared component and validate through targeted tests on the component or representative consumers.

## Migration Plan

- Update the shared pagination component in place.
- Adjust or add tests covering representative page ranges and disabled states.
- No data migration, API rollout, or backward-compatibility shim is required because the consumer props remain unchanged.

## Open Questions

- None. The default compact window of one adjacent page on each side of the current page is sufficient for the requested behavior.
