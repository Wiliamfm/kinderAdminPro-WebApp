## Context

The employees report export feature at `/reports/employees` uses a server function to generate CSV exports. The current implementation uses `btoa()` to encode the CSV content to base64, but `btoa()` only handles ASCII characters. When CSV content contains UTF-8 characters (Spanish accented letters like á, é, í, ó, ú, ñ), the encoding fails with "Invalid character" error.

## Goals / Non-Goals

**Goals:**
- Fix the "Invalid character" error when exporting employees report
- Ensure CSV files with Spanish characters encode correctly
- Maintain identical output format (CSV) and content

**Non-Goals:**
- Not changing export format from CSV to PDF (per user request)
- Not modifying any other export functionality
- Not adding new features

## Decisions

**Decision: Use UTF-8 safe base64 encoding instead of btoa()**

```typescript
// Before (broken)
const base64Data = btoa(csvContent);

// After (fixed)
const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
```

**Rationale:**
- This is a minimal, isolated change that fixes the encoding issue
- Keeps the CSV format (unlike switching to PDF like students export)
- The technique `btoa(unescape(encodeURIComponent(str)))` is a well-known pattern for UTF-8 safe base64 encoding in JavaScript

**Alternative considered: Switch to PDF export**
- Would make output consistent with students report
- But loses CSV format which users may prefer for data analysis
- More changes (adding jspdf, changing client-side download logic)

## Risks / Trade-offs

- **Risk**: None - this is a well-known encoding technique
- **Trade-off**: Using this encoding means the client must decode with the reverse: `decodeURIComponent(escape(atob(base64)))` - but the existing client-side code handles this via the `downloadBase64File` utility which already works for this encoding pattern