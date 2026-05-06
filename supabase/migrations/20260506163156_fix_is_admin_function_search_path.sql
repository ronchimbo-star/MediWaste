/*
  # Fix is_admin() function search path

  1. Changes
    - Recreate the `is_admin()` function with correct search_path
    - The function was failing because search_path was set to empty string,
      preventing it from finding the `mw_staff` table in the public schema

  2. Notes
    - Uses fully qualified `public.mw_staff` reference for safety
    - Maintains SECURITY DEFINER to allow RLS policy evaluation
*/

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mw_staff 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND status = 'active'
  );
END;
$function$;
