## Context

The `/reports/students` page displays bulletin student records with filtering by grade, semester, and specific students. The page includes two Chart.js bar charts:
1. "Estudiantes por grado" - shows distinct student count per grade
2. "Estudiantes por trimestre" - shows distinct student count per semester

Semesters have `start_date` and `end_date` fields that define their academic period. These dates can span calendar years (e.g., November 2025 to March 2026).

**Current filter state:**
```typescript
type ReportFilters = {
  gradeId: string;
  semesterId: string;
  studentIds: string[];
};
```

**Current semester data in form options:**
```typescript
type SemesterOption = {
  id: string;
  label: string;  // e.g., "2026-1"
};
```

## Goals / Non-Goals

**Goals:**
- Add year-based filtering to group semesters by academic year
- Derive years from semester `start_date` and `end_date` fields
- Support cross-year semesters (show in both years)
- Add chart grouping toggle for year-based aggregation

**Non-Goals:**
- No changes to the main table view or its behavior
- No changes to create/edit/delete modals
- No backend schema changes
- Not adding year filtering to employee reports (separate scope)

## Decisions

### 1. Year Derivation from Semester Dates

**Decision:** Derive year options from both `start_date` and `end_date` fields. A semester belongs to a year if either its start or end date falls within that year.

**Rationale:** Academic years don't always align with calendar years. A semester spanning Nov 2025 - Mar 2026 should appear under both 2025 and 2026, allowing users to see it regardless of which year's filter they select.

**Alternative considered:** Only use `start_date`. Rejected because it would miss the cross-year semester visibility issue.

### 2. Year Filter Position

**Decision:** Place year filter before semester filter in the UI.

**Rationale:** This creates a natural hierarchy: Year → Semester. Users select year first, then choose specific semester from that year's options.

### 3. Semester Filter Behavior When Year Selected

**Decision:** When a year is selected, semester dropdown shows only semesters that overlap with that year. When no year is selected, show all semesters.

**Rationale:** Reduces cognitive load by filtering irrelevant semesters. The semester filter remains independent (user can still select any semester regardless of year).

### 4. Chart Grouping Toggle

**Decision:** Add a segmented control/toggle above the "Estudiantes por trimestre" chart: `[Trimestre | Año]`

**Rationale:** Non-breaking change that preserves existing behavior while adding new capability. Toggle is more discoverable than a dropdown.

### 5. Year Grouping in Chart

**Decision:** When "Año" is selected, aggregate distinct student counts by year (sum of all semesters in that year that have data for the selected grade).

**Rationale:** Provides a higher-level trend view. Each year shows cumulative enrollment across all its semesters.

## Data Flow

```
Semesters (from PB)
    │
    ▼
┌─────────────────────────────┐
│ Derive unique years from    │
│ start_date and end_date     │
│ (collect both year values)   │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Year options for dropdown  │
│ Sort: descending           │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ When year selected:        │
│ Filter semesters to only   │
│ those overlapping year     │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Table/Chart query uses     │
│ semester IDs from filter   │
└─────────────────────────────┘
```

## Type Changes

### New Types

```typescript
type YearOption = {
  id: string;      // the year as string, e.g., "2026"
  label: string;  // same as id for display
};

type SemesterOption = {
  id: string;
  label: string;
  years: number[];  // derived from start_date and end_date
};

type ExtendedFormOptions = {
  bulletins: BulletinStudentOption[];
  students: BulletinStudentOption[];
  grades: BulletinStudentOption[];
  semesters: SemesterOption[];
  years: YearOption[];  // NEW
};
```

### Extended Filter Type

```typescript
type ReportFilters = {
  gradeId: string;
  yearId: string;      // NEW: filter by year
  semesterId: string;
  studentIds: string[];
};
```

### Chart Grouping State

```typescript
type SemesterChartGrouping = 'semester' | 'year';
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Cross-year semesters create duplicate semester options in UI | Acceptable - each semester has unique ID, filters work correctly |
| Year filter combined with semester filter creates confusion | Document behavior; semester filter shows year-filtered list |
| Chart grouping change affects existing dashboard habits | Toggle preserves existing "Trimestre" view as default |
| Large number of years in dropdown | Sort descending, show recent years first |

## Open Questions

None at this time. The design is complete based on current understanding.
