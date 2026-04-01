import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function SiteSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from('site_settings')
        .update(values)
        .eq('id', 'default');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values = Object.fromEntries(formData.entries());
    updateSettings.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">MediWaste Admin</h1>
          <button
            onClick={() => navigate('/admin')}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Site Settings</h2>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    id="company_name"
                    defaultValue={settings?.company_name || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="site_title" className="block text-sm font-medium text-gray-700 mb-2">
                    Site Title (Browser Tab)
                  </label>
                  <input
                    type="text"
                    name="site_title"
                    id="site_title"
                    defaultValue={settings?.site_title || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="service_areas" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Areas
                  </label>
                  <input
                    type="text"
                    name="service_areas"
                    id="service_areas"
                    defaultValue={settings?.service_areas || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Contact Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                    General Contact Email
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    id="contact_email"
                    defaultValue={settings?.contact_email || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="quote_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Quote Requests Email
                  </label>
                  <input
                    type="email"
                    name="quote_email"
                    id="quote_email"
                    defaultValue={settings?.quote_email || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="service_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Enquiries Email
                  </label>
                  <input
                    type="email"
                    name="service_email"
                    id="service_email"
                    defaultValue={settings?.service_email || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    id="phone_number"
                    defaultValue={settings?.phone_number || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp_number" className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    name="whatsapp_number"
                    id="whatsapp_number"
                    defaultValue={settings?.whatsapp_number || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Social Media</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="facebook_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    name="facebook_url"
                    id="facebook_url"
                    defaultValue={settings?.facebook_url || ''}
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="instagram_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    name="instagram_url"
                    id="instagram_url"
                    defaultValue={settings?.instagram_url || ''}
                    placeholder="https://instagram.com/yourpage"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    id="linkedin_url"
                    defaultValue={settings?.linkedin_url || ''}
                    placeholder="https://linkedin.com/company/yourcompany"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="tiktok_url" className="block text-sm font-medium text-gray-700 mb-2">
                    TikTok URL
                  </label>
                  <input
                    type="url"
                    name="tiktok_url"
                    id="tiktok_url"
                    defaultValue={settings?.tiktok_url || ''}
                    placeholder="https://tiktok.com/@yourpage"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">SEO Settings</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="default_meta_description" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Meta Description
                  </label>
                  <textarea
                    name="default_meta_description"
                    id="default_meta_description"
                    rows={3}
                    defaultValue={settings?.default_meta_description || ''}
                    placeholder="A brief description of your website (150-160 characters)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="default_meta_keywords" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Meta Keywords
                  </label>
                  <input
                    type="text"
                    name="default_meta_keywords"
                    id="default_meta_keywords"
                    defaultValue={settings?.default_meta_keywords || ''}
                    placeholder="clinical waste, medical waste disposal, healthcare waste"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Copyright Pages</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="copyright_last_review_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Review Date
                  </label>
                  <input
                    type="date"
                    name="copyright_last_review_date"
                    id="copyright_last_review_date"
                    defaultValue={settings?.copyright_last_review_date || '2026-02-07'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">This date will appear on all copyright pages</p>
                </div>

                <div>
                  <label htmlFor="terms_of_service" className="block text-sm font-medium text-gray-700 mb-2">
                    Terms of Service Content (HTML)
                  </label>
                  <textarea
                    name="terms_of_service"
                    id="terms_of_service"
                    rows={12}
                    defaultValue={settings?.terms_of_service || ''}
                    placeholder="Enter HTML content for Terms of Service page"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use HTML formatting: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, etc.</p>
                </div>

                <div>
                  <label htmlFor="privacy_policy" className="block text-sm font-medium text-gray-700 mb-2">
                    Privacy Policy Content (HTML)
                  </label>
                  <textarea
                    name="privacy_policy"
                    id="privacy_policy"
                    rows={12}
                    defaultValue={settings?.privacy_policy || ''}
                    placeholder="Enter HTML content for Privacy Policy page"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use HTML formatting: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, etc.</p>
                </div>

                <div>
                  <label htmlFor="cookie_policy" className="block text-sm font-medium text-gray-700 mb-2">
                    Cookie Policy Content (HTML)
                  </label>
                  <textarea
                    name="cookie_policy"
                    id="cookie_policy"
                    rows={12}
                    defaultValue={settings?.cookie_policy || ''}
                    placeholder="Enter HTML content for Cookie Policy page"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use HTML formatting: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;table&gt;, etc.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={updateSettings.isPending}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
