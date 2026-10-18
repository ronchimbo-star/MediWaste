import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEO
        title="Page Not Found | MediWaste"
        description="The page you're looking for could not be found."
        canonical="https://mediwaste.co.uk/404"
        noindex={true}
      />
      <Header />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-red-600 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
