/*
# Fix Mutable Search Paths on Trigger and Generator Functions

## Problem
Five functions have a mutable `search_path`, meaning a malicious user could potentially
create objects in their own schema that shadow standard functions, causing unexpected
behaviour when these functions execute.

## Fix
Sets an explicit, fixed `search_path = pg_catalog, public` on each function so they
always resolve identifiers against the standard catalogue first, regardless of the
calling session's search_path.

## Functions Fixed
1. `update_collection_request_timestamp` — trigger function for collection_requests
2. `generate_customer_number` — auto-number trigger for customers
3. `generate_certificate_number` — auto-number trigger for certificates
4. `generate_job_number` — auto-number trigger for service jobs
5. `generate_staff_number` — auto-number trigger for staff records

## Notes
- This is a non-destructive change: `ALTER FUNCTION ... SET search_path` only updates
  the function configuration; it does not modify the function body or behaviour.
- Safe to re-run (idempotent).
*/

ALTER FUNCTION public.update_collection_request_timestamp()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.generate_customer_number()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.generate_certificate_number()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.generate_job_number()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.generate_staff_number()
  SET search_path = pg_catalog, public;
