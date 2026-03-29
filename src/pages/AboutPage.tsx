import { Link } from 'react-router-dom';
import { Check, Shield, Users, Award } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MediWaste',
  description: 'Professional clinical waste disposal services for healthcare providers across the UK.',
  url: 'https://mediwaste.co.uk',
  telephone: '+447757664788',
  email: 'hello@mediwaste.co.uk',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB'
  },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex']
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="About MediWaste | Professional Medical Waste Services"
        description="Learn about MediWaste's professional clinical waste disposal services. Fully licensed and compliant waste management for healthcare and beauty industries across the UK."
        canonical="https://mediwaste.co.uk/about"
        schema={organizationSchema}
      />
      <Header />

      <div className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About MediWaste</h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto">
            Your trusted partner in safe, compliant medical waste disposal across the UK
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Who We Are</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              MediWaste is a leading provider of clinical and medical waste disposal services across the UK. With years of experience in the healthcare waste management industry, we specialize in providing safe, compliant, and reliable waste collection and disposal solutions for healthcare facilities of all sizes.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              From GP surgeries and dental practices to hospitals, care homes, and veterinary clinics, we serve a wide range of healthcare providers across London, Kent, Sussex, Essex, and Surrey. Our commitment to excellence, regulatory compliance, and customer service has made us a trusted partner for hundreds of healthcare facilities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fully Compliant</h3>
              <p className="text-gray-600 text-sm">
                100% compliant with all UK waste regulations and healthcare standards
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Experienced Team</h3>
              <p className="text-gray-600 text-sm">
                Highly trained professionals with extensive healthcare waste management expertise
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quality Service</h3>
              <p className="text-gray-600 text-sm">
                Committed to providing the highest level of service and customer satisfaction
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our mission is to provide healthcare facilities with safe, reliable, and compliant medical waste disposal services that protect public health, staff safety, and the environment. We strive to make medical waste management simple, stress-free, and affordable for all our clients.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe that proper waste management is essential to healthcare operations, and we're committed to being a partner you can rely on for consistent, professional service every time.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Choose MediWaste?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Fully Licensed & Insured</h3>
                  <p className="text-sm text-gray-600">
                    All necessary licenses, permits, and comprehensive insurance coverage
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">24/7 Emergency Service</h3>
                  <p className="text-sm text-gray-600">
                    Round-the-clock emergency collection available when you need it most
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Complete Documentation</h3>
                  <p className="text-sm text-gray-600">
                    Full audit trail with consignment notes and disposal certificates
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Flexible Contracts</h3>
                  <p className="text-sm text-gray-600">
                    No long-term lock-ins - choose monthly rolling or fixed-term contracts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Competitive Pricing</h3>
                  <p className="text-sm text-gray-600">
                    Transparent, fair pricing with no hidden fees or surcharges
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Environmental Responsibility</h3>
                  <p className="text-sm text-gray-600">
                    Committed to environmentally responsible waste disposal practices
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions About MediWaste
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How long have you been providing clinical waste services?
                </h3>
                <p className="text-gray-600">
                  MediWaste has years of experience in the healthcare waste management industry. Our team has extensive expertise in clinical waste collection and disposal, serving hundreds of healthcare facilities across the UK. We've built our reputation on reliability, compliance, and excellent customer service.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Are you fully licensed and insured?
                </h3>
                <p className="text-gray-600">
                  Yes, we are fully licensed by the Environment Agency as an Upper Tier Waste Carrier with all necessary permits to collect and transport clinical waste. We carry comprehensive public and professional liability insurance covering all our operations. Our facilities partners hold appropriate environmental permits for waste treatment and disposal.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What makes MediWaste different from other waste companies?
                </h3>
                <p className="text-gray-600">
                  We specialize exclusively in healthcare waste, unlike general waste companies. We offer flexible contracts with no long-term lock-ins, transparent pricing with no hidden fees, 24/7 emergency service, complete documentation for audit trails, and dedicated account managers. Our team understands healthcare regulations and provides staff training on proper waste segregation.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide waste containers and sharps bins?
                </h3>
                <p className="text-gray-600">
                  Yes, we provide all necessary containers as part of our service including color-coded clinical waste bags and bins, puncture-proof sharps containers in various sizes (1L to 10L), pharmaceutical waste containers, cytotoxic waste containers, and dental amalgam containers. All containers comply with UN3291 specifications and UK regulations.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can you help with staff training on waste management?
                </h3>
                <p className="text-gray-600">
                  Yes, we provide comprehensive staff training on clinical waste segregation, color coding systems, proper container usage, and regulatory compliance. Training can be conducted on-site at your facility or remotely. We also provide ongoing support, written procedures, and visual guides to ensure your team follows best practices.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How do you ensure environmental responsibility?
                </h3>
                <p className="text-gray-600">
                  We are committed to environmental protection through proper waste segregation to maximize recycling where possible, use of licensed incineration facilities with energy recovery, optimized collection routes to reduce carbon emissions, strict compliance with environmental regulations, and proper handling of hazardous substances to prevent pollution. All our disposal facilities hold appropriate environmental permits.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg opacity-95 mb-6">
              Join hundreds of healthcare facilities who trust MediWaste for their medical waste disposal needs
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-red-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Get a Quote
              </Link>
              <a
                href="tel:+441322879713"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors"
              >
                Call Us Now
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
