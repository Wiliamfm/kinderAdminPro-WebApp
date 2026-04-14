## 1. Fix UTF-8 encoding in employees CSV export

- [x] 1.1 Replace `btoa(csvContent)` with `btoa(unescape(encodeURIComponent(csvContent)))` in `src/lib/server/exports/employees-export.ts` line 83

## 2. Verify the fix

- [x] 2.1 Run the development server and test the export functionality at `/reports/employees`
- [x] 2.2 Verify the downloaded CSV file contains correctly encoded Spanish characters (Trimestre, Empleado, etc.)
