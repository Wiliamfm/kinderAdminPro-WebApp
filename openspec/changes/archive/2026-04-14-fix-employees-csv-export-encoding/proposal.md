## Why

The employees report export functionality throws an "Invalid character" error when attempting to download CSV files. This occurs because the export uses `btoa()` to encode the CSV content to base64, but `btoa()` only handles ASCII characters and fails on UTF-8 characters (like Spanish accented letters in "Trimestre", "Empleado", etc.). Users cannot export employee reports.

## What Changes

- Replace the UTF-8 unsafe `btoa(csvContent)` call with UTF-8 safe base64 encoding: `btoa(unescape(encodeURIComponent(csvContent)))`
- This change is isolated to the single server function `exportEmployeesReport` in `src/lib/server/exports/employees-export.ts`

## Capabilities

### New Capabilities
(none - this is a bug fix)

### Modified Capabilities
(none - no spec-level behavior changes)

## Impact

- **File affected**: `src/lib/server/exports/employees-export.ts`
- **Users affected**: Staff users trying to export employee reports at `/reports/employees`
- **No breaking changes**: Output remains CSV with same content, just properly encoded