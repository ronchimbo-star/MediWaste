import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface SiteSettings {
  phone_number: string;
  contact_email: string;
  service_areas: string;
  site_title: string;
  default_meta_description: string;
  default_meta_keywords: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  tiktok_url: string;
  youtube_url: string;
  google_business_url: string;
  company_legal_name: string | null;
  company_registered_address: string | null;
  company_number: string | null;
  waste_carrier_licence: string | null;
  company_contact_name: string | null;
  company_contact_email: string | null;
  company_contact_phone: string | null;
  company_contact_position: string | null;
}

export function useSiteSettings() {
  const { data: settings = null, isLoading: loading } = useQuery<SiteSettings | null>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
      return data;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  return { settings, loading };
}
