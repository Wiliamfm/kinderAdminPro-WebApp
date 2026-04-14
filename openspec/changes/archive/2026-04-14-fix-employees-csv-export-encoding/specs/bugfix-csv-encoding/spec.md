## Context

This is a bug fix with no capability or requirement changes. The employees CSV export functionality already works correctly - the only issue is improper UTF-8 encoding in the base64 transformation.

## No Spec Changes Required

This change does not introduce new requirements or modify existing ones. The system already has the correct behavior:
- Export employees report to CSV
- Include Spanish characters in column headers and data

The bug is purely in the implementation (btoa() doesn't handle UTF-8), not in the requirements.

## ADDED Requirements

(None - bug fix only, no new capabilities)

## MODIFIED Requirements

(None - no existing requirement behavior changes)

## REMOVED Requirements

(None)