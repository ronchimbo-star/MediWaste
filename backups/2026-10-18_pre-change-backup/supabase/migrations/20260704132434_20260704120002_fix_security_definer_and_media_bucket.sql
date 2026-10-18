/*
# Fix SECURITY DEFINER Function Execute Permissions and Media Bucket Listing

## Problem 1: SECURITY DEFINER Functions Callable by anon
Several SECURITY DEFINER functions (which run with elevated database owner privileges)
were callable by the anonymous role via the REST API. This is a security risk because
an unauthenticated user can trigger functions that execute with superuser-level access.

## Problem 2: Media Bucket Allows File Listing
The `media` storage bucket had a broad SELECT policy for the `public` role, allowing
anyone to list all files in the bucket via the Supabase storage API. This exposes the
full file manifest of the bucket even if individual files are not sensitive.

## Fix 1: Revoke EXECUTE from anon on sensitive functions

Functions fixed:
- `generate_certificate_alerts()` — revoke anon; keep for authenticated admins
- `get_active_certificate_alerts()` — revoke anon; keep for authenticated admins
- `handle_new_user()` — revoke from BOTH anon and authenticated; this is a trigger-only
  function and must never be called directly via RPC
- `is_admin()` — revoke anon; an anon user calling is_admin() always returns false
  but the function runs SECURITY DEFINER and should not be exposed

`increment_seo_page_views(page_slug text)` is intentionally left with anon EXECUTE
because it is called on every public page load for legitimate view counting.

## Fix 2: Remove media bucket file-listing SELECT policy
The "Public can view media files" SELECT policy is removed from `storage.objects`.
Public buckets in Supabase serve object URLs directly via the CDN without needing
a storage RLS SELECT policy — removing this policy stops clients from listing all
files in the bucket while file URLs continue to work normally.

## Notes
- Safe to re-run (REVOKE on a role that already lacks the privilege is a no-op).
- The storage policy DROP is idempotent (DROP POLICY IF EXISTS).
*/

-- ============================================================
-- Revoke anon EXECUTE from sensitive SECURITY DEFINER functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.generate_certificate_alerts()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_active_certificate_alerts()
  FROM anon;

-- handle_new_user is a trigger-only function; nobody should call it via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin()
  FROM anon;

-- ============================================================
-- Remove the broad SELECT (file-listing) policy on media bucket
-- ============================================================

DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
