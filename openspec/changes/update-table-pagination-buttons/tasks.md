## 1. Shared Pagination Behavior

- [x] 1.1 Add a compact page-window calculation in `src/components/PaginationControls.tsx` that always includes first/last pages, the current page, adjacent pages, and ellipsis gaps when ranges are hidden.
- [x] 1.2 Update the shared pagination control markup and styles to render numbered page buttons, highlight the active page, and preserve previous/next disabled behavior during busy or out-of-range states.

## 2. Validation And Documentation

- [x] 2.1 Add or update automated tests that cover middle-range pagination, near-start and near-end ranges, and blocked navigation while the control is busy.
- [x] 2.2 Update shared documentation if needed to reflect the numbered pagination standard and verify existing paginated tables continue working without consumer prop changes.
