import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" onClick={closeMobileMenu} className="flex items-center flex-shrink-0">
            <img
              src="/new-mediwaste-logoV1.svg"
              alt="MediWaste"
              className="h-12 md:h-16 w-auto flex-shrink-0"
            />
          </Link>

          <nav className="hidden xl:flex items-center gap-4 2xl:gap-6">
            <Link to="/" className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">Home</Link>
            <Link to="/waste-services" className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">Services</Link>
            <Link to="/service-coverage" className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">Coverage</Link>
            <Link to="/news" className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">News</Link>
            <Link to="/contact" className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">Contact</Link>
            <Link
              to="/quote"
              className="bg-red-600 hover:bg-red-700 text-white px-5 2xl:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Get a FREE Quote
            </Link>
          </nav>

          <button
            onClick={toggleMobileMenu}
            className="xl:hidden p-2 text-gray-700 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden mt-4 pb-4 animate-slide-down">
            <nav className="flex flex-col gap-3">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/waste-services"
                onClick={closeMobileMenu}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Services
              </Link>
              <Link
                to="/service-coverage"
                onClick={closeMobileMenu}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Coverage
              </Link>
              <Link
                to="/news"
                onClick={closeMobileMenu}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                News
              </Link>
              <Link
                to="/contact"
                onClick={closeMobileMenu}
                className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/quote"
                onClick={closeMobileMenu}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-center"
              >
                Get a FREE Quote
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
