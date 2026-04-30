## ADDED Requirements

> **Note:** This spec outlined the general objective for future proposal #4 (KPI Summary Cards). It has since been fully explored and designed as its own change: `student-kpi-cards`. See `openspec/changes/student-kpi-cards/` for the authoritative spec, design, and tasks.

### Key decisions made during exploration

- **Scoped to 2 cards** (not 5): "Estudiantes únicos" and "Promedio nota". Total reports, grades with data, and semesters with data were dropped to keep the UI focused.
- **Filter-aware** (not global): KPI values are computed from the filtered analytics dataset using the table's applied filters (year, grade, semester, specific students), not from the full unfiltered dataset. This was a deliberate reversal from the original outline.
- **Error state**: Cards are hidden when the analytics resource errors — the existing error banner handles it.
- **Inline implementation**: No separate component; computed directly in the reports page.
