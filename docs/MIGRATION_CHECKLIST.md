# Database Migration Checklist

## Before migration
- Review schema changes and confirm backward compatibility.
- Update application code if new NOT NULL columns lack defaults.
- Verify data backfill queries for existing rows.
- Confirm index/constraint impact and expected lock times.
- Plan rollback (SQL to revert or compensating migration).

## Run migration
- Apply migrations in staging first.
- Validate row counts, nullability, and constraints.
- Run smoke tests on critical flows (create session, add bill, recalc debts).
- Check performance for queries that use new columns.

## After migration
- Update docs and release notes.
- Monitor error logs for constraint violations.
- Backfill any remaining nulls if required.
