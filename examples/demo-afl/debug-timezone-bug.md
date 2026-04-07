---
id: "debug-timezone-bug"
type: memory
tags: ["bug", "timezone", "database"]
summary: "Timezone bug: order timestamps off by 8h for US users. Fix: UTC storage + frontend locale conversion."
refs:
  - "diary-2026-04-05"
---

# 2026-04-05 Timezone Bug Fix

## Symptom
US users reported order creation time was 8 hours ahead of actual time.

## Root Cause
Server timezone was UTC+8. `new Date()` returned local time, stored without timezone conversion.

## Fix
1. DB column changed to `TIMESTAMP WITH TIME ZONE`
2. Server stores UTC: `new Date().toISOString()`
3. Frontend converts to user locale for display

## Impact
~200 existing orders had timestamps off by 8h. Wrote migration script for batch correction. @attr(affected_rows: 200, data_migration: true)
