/*
  # Fix generate_certificate_alerts function search path

  ## Summary
  The trigger function had search_path="" which prevented it from resolving
  the mw_certificate_alerts table. Recreating it with schema-qualified table
  references so it works regardless of search_path.
*/

CREATE OR REPLACE FUNCTION public.generate_certificate_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.mw_certificate_alerts WHERE certificate_id = NEW.id;

  IF NEW.status = 'active' THEN
    INSERT INTO public.mw_certificate_alerts (certificate_id, alert_type, alert_date)
    VALUES (NEW.id, '30_days', NEW.expiry_date - INTERVAL '30 days');

    INSERT INTO public.mw_certificate_alerts (certificate_id, alert_type, alert_date)
    VALUES (NEW.id, '14_days', NEW.expiry_date - INTERVAL '14 days');

    INSERT INTO public.mw_certificate_alerts (certificate_id, alert_type, alert_date)
    VALUES (NEW.id, '7_days', NEW.expiry_date - INTERVAL '7 days');

    INSERT INTO public.mw_certificate_alerts (certificate_id, alert_type, alert_date)
    VALUES (NEW.id, 'expired', NEW.expiry_date);
  END IF;

  RETURN NEW;
END;
$$;
