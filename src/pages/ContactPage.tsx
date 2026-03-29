import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QuoteForm from '../components/QuoteForm';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSiteSettings } from '../hooks/useSiteSettings';
import SEO from '../components/SEO';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MediWaste',
  telephone: '+447757664788',
  email: 'hello@mediwaste.co.uk',
  url: 'https://mediwaste.co.uk',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB'
  },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex']
};

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const [formType, setFormType] = useState<'general' | 'quote'>('general');

  useEffect(() => {
    if (location.pathname === '/quote') {
      setFormType('quote');
    }
  }, [location.pathname]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submissionData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        message: `${formData.subject}\n\n${formData.message}`,
        status: 'new'
      };

      const { error: insertError } = await supabase
        .from('contact_submissions')
        .insert(submissionData);

      if (insertError) throw insertError;

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`;
        const emailResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            message: `${formData.subject}\n\n${formData.message}`,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Email notification failed:', await emailResponse.text());
        }
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('Failed to submit your message. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Contact MediWaste | Get a Free Waste Disposal Quote"
        description="Contact MediWaste for a free clinical waste disposal quote. Call +44 7757 664788 or fill in our online form. Serving London, Kent, Essex, Surrey and Sussex."
        canonical="https://mediwaste.co.uk/contact"
        schema={organizationSchema}
      />
      <Header />

      <div className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get In Touch</h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto">
            Have a question or need a quote? We're here to help with all your medical waste disposal needs.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Phone</h3>
            <p className="text-gray-600 text-sm mb-2">Call us for immediate assistance</p>
            <a
              href={`tel:${settings?.phone_number?.replace(/\s/g, '') || '+447757664788'}`}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              {settings?.phone_number || '+44 7757 664788'}
            </a>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600 text-sm mb-2">Send us an email anytime</p>
            <a
              href={`mailto:${settings?.contact_email || 'hello@mediwaste.co.uk'}`}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              {settings?.contact_email || 'hello@mediwaste.co.uk'}
            </a>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Service Areas</h3>
            <p className="text-gray-600 text-sm">{settings?.service_areas || 'London, Kent, Sussex, Essex, Surrey'}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 p-2 rounded-lg flex gap-2 mb-8">
            <button
              onClick={() => setFormType('general')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                formType === 'general'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              General Enquiry
            </button>
            <button
              onClick={() => setFormType('quote')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                formType === 'quote'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Request a Quote
            </button>
          </div>

          {formType === 'general' ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              {success ? (
                <div className="text-center py-12">
                  <div className="text-green-600 text-5xl mb-4">✓</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600 mb-6">
                    Your message has been received. We'll respond within 24 hours.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGeneralSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Send Us a Message</h3>
                    <p className="text-gray-600">
                      Fill out the form below and we'll get back to you as soon as possible.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="+44"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="How can we help?"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Tell us more about your enquiry..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Request a Quote</h3>
                <p className="text-gray-600">
                  Fill out the detailed form below to receive a personalized quote for your medical waste disposal needs.
                </p>
              </div>
              <QuoteForm />
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Contact & Quote FAQs
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                How quickly will I receive a quote?
              </h3>
              <p className="text-gray-600">
                Most quotes are provided within 2-4 hours during business hours. For urgent requirements, call us directly for an immediate quote over the phone. We'll ask about your waste types, volumes, collection frequency, and location to provide accurate pricing with no hidden fees.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                What information do I need to provide for a quote?
              </h3>
              <p className="text-gray-600">
                For an accurate quote, we need your facility type (GP surgery, dental practice, care home, etc.), estimated waste volumes, preferred collection frequency, types of waste you generate (infectious, sharps, pharmaceutical, etc.), and your location including postcode. The more details you provide, the more accurate your quote will be.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Is there a minimum contract period?
              </h3>
              <p className="text-gray-600">
                No, we offer flexible contracts including rolling monthly agreements with no long-term lock-ins. You can also choose fixed-term contracts if you prefer price stability. There are no penalties for changing service levels or cancelling with appropriate notice.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Can I speak to someone directly about my requirements?
              </h3>
              <p className="text-gray-600">
                Yes, our customer service team is available during business hours. Call us on {settings?.phone_number || '+44 7757 664788'} to speak directly with a waste management specialist who can answer your questions, provide immediate quotes, and arrange service setup. We also offer video calls for more detailed consultations.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                What areas do you cover?
              </h3>
              <p className="text-gray-600">
                We currently provide clinical waste collection services across {settings?.service_areas || 'London, Kent, Sussex, Essex, Surrey'} and surrounding areas. We're expanding our coverage across the UK. Contact us to check if we serve your specific location - we may be able to accommodate areas outside our standard service regions.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                How quickly can you start service after I accept a quote?
              </h3>
              <p className="text-gray-600">
                We can typically set up new services within 2-3 working days including container delivery and staff training. For urgent requirements, same-day or next-day setup is available in many areas. Once you accept a quote, we'll arrange a convenient time to deliver containers and commence collections on your preferred schedule.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
