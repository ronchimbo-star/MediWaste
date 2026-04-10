import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import WasteServicesPage from './pages/WasteServicesPage';
import NewsPage from './pages/NewsPage';
import NewsArticlePage from './pages/NewsArticlePage';
import NewsCategoryPage from './pages/NewsCategoryPage';
import ServiceAreaPage from './pages/ServiceAreaPage';
import LocationServicePage from './pages/LocationServicePage';
import QuotePage from './pages/QuotePage';
import PublicQuoteView from './pages/PublicQuoteView';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiePage from './pages/CookiePage';
import InfectiousWastePage from './pages/InfectiousWastePage';
import SharpsWastePage from './pages/SharpsWastePage';
import PharmaceuticalWastePage from './pages/PharmaceuticalWastePage';
import CytotoxicWastePage from './pages/CytotoxicWastePage';
import DentalWastePage from './pages/DentalWastePage';
import AnatomicalWastePage from './pages/AnatomicalWastePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuoteRequestsPage from './pages/admin/QuoteRequestsPage';
import QuotesPage from './pages/admin/QuotesPage';
import QuoteEditPage from './pages/admin/QuoteEditPage';
import ContactEnquiriesPage from './pages/admin/ContactEnquiriesPage';
import SiteSettingsPage from './pages/admin/SiteSettingsPage';
import NewsManagementPage from './pages/admin/NewsManagementPage';
import NewsEditPage from './pages/admin/NewsEditPage';
import CustomersPage from './pages/admin/CustomersPage';
import CustomerProfilePage from './pages/admin/CustomerProfilePage';
import MailingListsPage from './pages/admin/MailingListsPage';
import SubscriptionsPage from './pages/admin/SubscriptionsPage';
import ServiceJobsPage from './pages/admin/ServiceJobsPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import InvoicingPage from './pages/admin/InvoicingPage';
import WasteTransferNotesPage from './pages/admin/WasteTransferNotesPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ServiceAgreementPage from './pages/ServiceAgreementPage';
import ServiceAgreementsPage from './pages/admin/ServiceAgreementsPage';
import ServiceAgreementEditPage from './pages/admin/ServiceAgreementEditPage';
import EmailInboxPage from './pages/admin/EmailInboxPage';
import CertificatesPage from './pages/admin/CertificatesPage';
import CertificateEditPage from './pages/admin/CertificateEditPage';
import CertificatePreviewPage from './pages/admin/CertificatePreviewPage';
import NotesPage from './pages/admin/NotesPage';
import BackupPage from './pages/admin/BackupPage';
import ResourcesPage from './pages/admin/ResourcesPage';
import CompliancePage from './pages/CompliancePage';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';
import NotFound from './pages/NotFound';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
      <CookieConsent />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FAQPage />} />
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
        <Route path="/service-areas/:countySlug" element={<ServiceAreaPage />} />
        <Route path="/clinical-waste-disposal-london" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-kent" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-essex" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-surrey" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-sussex" element={<LocationServicePage />} />
        <Route path="/clinical-waste-disposal-hampshire" element={<LocationServicePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/category/:categorySlug" element={<NewsCategoryPage />} />
        <Route path="/news/:slug" element={<NewsArticlePage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/quote/:token" element={<PublicQuoteView />} />
        <Route path="/service-agreement/:token" element={<ServiceAgreementPage />} />
        <Route path="/compliance/:token" element={<CompliancePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiePage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quote-requests"
          element={
            <ProtectedRoute>
              <QuoteRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotes"
          element={
            <ProtectedRoute>
              <QuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotes/create"
          element={
            <ProtectedRoute>
              <QuoteEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotes/:id"
          element={
            <ProtectedRoute>
              <QuoteEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotes/:id/edit"
          element={
            <ProtectedRoute>
              <QuoteEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/contact-enquiries"
          element={
            <ProtectedRoute>
              <ContactEnquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <SiteSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/news"
          element={
            <ProtectedRoute>
              <NewsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/news/create"
          element={
            <ProtectedRoute>
              <NewsEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/news/:id/edit"
          element={
            <ProtectedRoute>
              <NewsEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/mailing-lists"
          element={
            <ProtectedRoute>
              <MailingListsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <ProtectedRoute>
              <ServiceJobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute>
              <StaffManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <ProtectedRoute>
              <InvoicingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/invoicing" element={<Navigate to="/admin/invoices" replace />} />
        <Route
          path="/admin/waste-transfer-notes"
          element={
            <ProtectedRoute>
              <WasteTransferNotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/service-agreements"
          element={
            <ProtectedRoute>
              <ServiceAgreementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/service-agreements/create"
          element={
            <ProtectedRoute>
              <ServiceAgreementEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/service-agreements/edit/:id"
          element={
            <ProtectedRoute>
              <ServiceAgreementEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/email-inbox"
          element={
            <ProtectedRoute>
              <EmailInboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates/create"
          element={
            <ProtectedRoute>
              <CertificateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates/:id/edit"
          element={
            <ProtectedRoute>
              <CertificateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates/:id/preview"
          element={
            <ProtectedRoute>
              <CertificatePreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute>
              <BackupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/resources"
          element={
            <ProtectedRoute>
              <ResourcesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
