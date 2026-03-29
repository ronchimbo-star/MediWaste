import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import WasteServicesPage from './pages/WasteServicesPage';
import ServiceAreaPage from './pages/ServiceAreaPage';
import LocationServicePage from './pages/LocationServicePage';
import NewsPage from './pages/NewsPage';
import NewsArticlePage from './pages/NewsArticlePage';
import FAQPage from './pages/FAQPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CookiePage from './pages/CookiePage';
import InfectiousWastePage from './pages/InfectiousWastePage';
import SharpsWastePage from './pages/SharpsWastePage';
import PharmaceuticalWastePage from './pages/PharmaceuticalWastePage';
import CytotoxicWastePage from './pages/CytotoxicWastePage';
import DentalWastePage from './pages/DentalWastePage';
import AnatomicalWastePage from './pages/AnatomicalWastePage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/quote" element={<ContactPage />} />
        <Route path="/waste-services" element={<WasteServicesPage />} />
        <Route path="/waste-services/infectious-waste" element={<InfectiousWastePage />} />
        <Route path="/waste-services/sharps-waste" element={<SharpsWastePage />} />
        <Route path="/waste-services/pharmaceutical-waste" element={<PharmaceuticalWastePage />} />
        <Route path="/waste-services/cytotoxic-waste" element={<CytotoxicWastePage />} />
        <Route path="/waste-services/dental-waste" element={<DentalWastePage />} />
        <Route path="/waste-services/anatomical-waste" element={<AnatomicalWastePage />} />
        <Route path="/service-coverage" element={<ServiceAreaPage />} />
        <Route path="/service-areas/london" element={<LocationServicePage />} />
        <Route path="/service-areas/kent" element={<LocationServicePage />} />
        <Route path="/service-areas/essex" element={<LocationServicePage />} />
        <Route path="/service-areas/surrey" element={<LocationServicePage />} />
        <Route path="/service-areas/sussex" element={<LocationServicePage />} />
        <Route path="/service-areas/hampshire" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-london" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-kent" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-essex" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-surrey" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-sussex" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-hampshire" element={<LocationServicePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsArticlePage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
