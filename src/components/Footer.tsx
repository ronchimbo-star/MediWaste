import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Instagram, MapPin } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

export default function Footer() {
  const { settings } = useSiteSettings();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img
              src="/footer.png"
              alt="MediWaste"
              className="h-12 mb-4"
            />
            <p className="text-sm text-gray-400 mb-3">
              Professional clinical waste management solutions for healthcare facilities across the UK.
            </p>
            <a
              href="https://medicalwastedirectory.co.uk/directory/1ee6c307-808d-4ade-b4e1-cccc03514144"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-500 hover:text-red-400 transition-colors inline-block mb-4"
            >
              As featured on Medical Waste Directory
            </a>
            {(settings?.linkedin_url || settings?.facebook_url || settings?.instagram_url || settings?.google_business_url || settings?.tiktok_url) && (
              <div className="mt-4">
                <p className="text-sm font-bold text-white mb-2">We're social. Visit us at</p>
                <div className="flex gap-3">
                  {settings?.linkedin_url && (
                    <a
                      href={settings.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label="Follow us on LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {settings?.google_business_url && (
                    <a
                      href={settings.google_business_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label="Visit our Google Business Profile"
                    >
                      <MapPin className="w-5 h-5" />
                    </a>
                  )}
                  {settings?.facebook_url && (
                    <a
                      href={settings.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label="Follow us on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {settings?.instagram_url && (
                    <a
                      href={settings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label="Follow us on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {settings?.tiktok_url && (
                    <a
                      href={settings.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label="Follow us on TikTok"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11v-3.5a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.6a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.4a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.83z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/waste-services/infectious-waste" className="hover:text-white">Infectious Waste</Link></li>
              <li><Link to="/waste-services/sharps-waste" className="hover:text-white">Sharps Disposal</Link></li>
              <li><Link to="/waste-services/pharmaceutical-waste" className="hover:text-white">Pharmaceutical Waste</Link></li>
              <li><Link to="/waste-services/anatomical-waste" className="hover:text-white">Anatomical Waste</Link></li>
              <li><Link to="/compliance" className="hover:text-white">Compliance</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/quote" className="hover:text-white">Get a Quote</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contact Info</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Phone: {settings?.phone_number || '+44 7757 664788'}</li>
              <li>Email: {settings?.contact_email || 'hello@mediwaste.co.uk'}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-wrap justify-center gap-4 mb-4 text-sm">
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/cookies" className="text-gray-400 hover:text-white transition-colors">
              Cookie Policy
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 mb-4 text-sm text-gray-400">
            <span className="font-bold text-white">Service Areas</span>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/london" className="hover:text-white transition-colors">
              London
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/kent" className="hover:text-white transition-colors">
              Kent
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/surrey" className="hover:text-white transition-colors">
              Surrey
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/sussex" className="hover:text-white transition-colors">
              Sussex
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/hampshire" className="hover:text-white transition-colors">
              Hampshire
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/service-areas/essex" className="hover:text-white transition-colors">
              Essex
            </Link>
          </div>

          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MediWaste. All rights reserved. | Professional Clinical Waste Disposal UK
          </p>
          <p className="text-center text-xs text-gray-500 mt-3">
            MediWaste is a trading name of Circular Horizons International Ltd, registered in England and Wales under company number 15821509. Registered office: Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, England, DA17 6BJ
          </p>
        </div>
      </div>
    </footer>
  );
}
