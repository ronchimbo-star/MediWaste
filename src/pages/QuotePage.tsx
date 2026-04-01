import Header from '../components/Header';
import Footer from '../components/Footer';
import QuoteForm from '../components/QuoteForm';
import SEO from '../components/SEO';

export default function QuotePage() {
  return (
    <>
      <SEO
        title="Get a Free Quote - Clinical Waste Disposal | MediWaste"
        description="Request a free quote for clinical waste disposal services. Fast response, competitive pricing, and compliant waste management solutions for your healthcare facility."
        canonical="https://mediwaste.co.uk/quote"
      />
      <div className="min-h-screen bg-white">
        <Header />

        <div className="bg-red-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get a Free Quote</h1>
            <p className="text-lg opacity-95 max-w-2xl mx-auto">
              Request a personalized quote for your clinical waste disposal needs. Our team will respond within 24 hours.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request a Quote</h2>
              <p className="text-gray-600">
                Fill out the detailed form below to receive a personalized quote for your medical waste disposal needs.
              </p>
            </div>
            <QuoteForm />
          </div>

          <div className="max-w-4xl mx-auto mt-16">
            <div className="grid md:grid-cols-3 gap-8 text-center mb-16">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="text-red-600 text-4xl font-bold mb-2">2-4hrs</div>
                <div className="text-gray-600 font-medium">Quote Response Time</div>
              </div>
              <div>
                <div className="text-red-600 text-4xl font-bold mb-2">100%</div>
                <div className="text-gray-600 font-medium">Compliant Service</div>
              </div>
              <div>
                <div className="text-red-600 text-4xl font-bold mb-2">£0</div>
                <div className="text-gray-600 font-medium">No Quote Fees</div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Quote FAQs
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How quickly will I receive a quote?
                </h3>
                <p className="text-gray-600">
                  Most quotes are provided within 2-4 hours during business hours. For urgent requirements, call us directly for an immediate quote over the phone.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What information do I need to provide?
                </h3>
                <p className="text-gray-600">
                  For an accurate quote, we need your facility type, estimated waste volumes, preferred collection frequency, types of waste you generate, and your location including postcode.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Is there a minimum contract period?
                </h3>
                <p className="text-gray-600">
                  No, we offer flexible contracts including rolling monthly agreements with no long-term lock-ins. There are no penalties for changing service levels or cancelling with appropriate notice.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How quickly can you start service?
                </h3>
                <p className="text-gray-600">
                  We can typically set up new services within 2-3 working days including container delivery and staff training. For urgent requirements, same-day or next-day setup is available in many areas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
