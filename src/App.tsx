import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const WasteServicesPage = lazy(() => import('./pages/WasteServicesPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsArticlePage = lazy(() => import('./pages/NewsArticlePage'));
const NewsCategoryPage = lazy(() => import('./pages/NewsCategoryPage'));
const ServiceAreaPage = lazy(() => import('./pages/ServiceAreaPage'));
const LocationServicePage = lazy(() => import('./pages/LocationServicePage'));
const QuotePage = lazy(() => import('./pages/QuotePage'));
const PublicQuoteView = lazy(() => import('./pages/PublicQuoteView'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CookiePage = lazy(() => import('./pages/CookiePage'));
const InfectiousWastePage = lazy(() => import('./pages/InfectiousWastePage'));
const SharpsWastePage = lazy(() => import('./pages/SharpsWastePage'));
const PharmaceuticalWastePage = lazy(() => import('./pages/PharmaceuticalWastePage'));
const CytotoxicWastePage = lazy(() => import('./pages/CytotoxicWastePage'));
const DentalWastePage = lazy(() => import('./pages/DentalWastePage'));
const AnatomicalWastePage = lazy(() => import('./pages/AnatomicalWastePage'));
const ServiceAgreementPage = lazy(() => import('./pages/ServiceAgreementPage'));
const CompliancePage = lazy(() => import('./pages/CompliancePage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const QuoteRequestsPage = lazy(() => import('./pages/admin/QuoteRequestsPage'));
const QuotesPage = lazy(() => import('./pages/admin/QuotesPage'));
const QuoteEditPage = lazy(() => import('./pages/admin/QuoteEditPage'));
const ContactEnquiriesPage = lazy(() => import('./pages/admin/ContactEnquiriesPage'));
const SiteSettingsPage = lazy(() => import('./pages/admin/SiteSettingsPage'));
const NewsManagementPage = lazy(() => import('./pages/admin/NewsManagementPage'));
const NewsEditPage = lazy(() => import('./pages/admin/NewsEditPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const CustomerProfilePage = lazy(() => import('./pages/admin/CustomerProfilePage'));
const MailingListsPage = lazy(() => import('./pages/admin/MailingListsPage'));
const SubscriptionsPage = lazy(() => import('./pages/admin/SubscriptionsPage'));
const ServiceJobsPage = lazy(() => import('./pages/admin/ServiceJobsPage'));
const StaffManagementPage = lazy(() => import('./pages/admin/StaffManagementPage'));
const InvoicingPage = lazy(() => import('./pages/admin/InvoicingPage'));
const InvoiceEditPage = lazy(() => import('./pages/admin/InvoiceEditPage'));
const InvoicePreviewPage = lazy(() => import('./pages/admin/InvoicePreviewPage'));
const WasteTransferNotesPage = lazy(() => import('./pages/admin/WasteTransferNotesPage'));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const ServiceAgreementsPage = lazy(() => import('./pages/admin/ServiceAgreementsPage'));
const ServiceAgreementEditPage = lazy(() => import('./pages/admin/ServiceAgreementEditPage'));
const EmailInboxPage = lazy(() => import('./pages/admin/EmailInboxPage'));
const CertificatesPage = lazy(() => import('./pages/admin/CertificatesPage'));
const CertificateEditPage = lazy(() => import('./pages/admin/CertificateEditPage'));
const CertificatePreviewPage = lazy(() => import('./pages/admin/CertificatePreviewPage'));
const NotesPage = lazy(() => import('./pages/admin/NotesPage'));
const BackupPage = lazy(() => import('./pages/admin/BackupPage'));
const ResourcesPage = lazy(() => import('./pages/admin/ResourcesPage'));
const CollectionRequestsPage = lazy(() => import('./pages/admin/CollectionRequestsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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
      <Suspense fallback={<PageLoader />}>
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

          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/quote-requests" element={<ProtectedRoute><QuoteRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
          <Route path="/admin/quotes/create" element={<ProtectedRoute><QuoteEditPage /></ProtectedRoute>} />
          <Route path="/admin/quotes/:id" element={<ProtectedRoute><QuoteEditPage /></ProtectedRoute>} />
          <Route path="/admin/quotes/:id/edit" element={<ProtectedRoute><QuoteEditPage /></ProtectedRoute>} />
          <Route path="/admin/contact-enquiries" element={<ProtectedRoute><ContactEnquiriesPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><SiteSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute><NewsManagementPage /></ProtectedRoute>} />
          <Route path="/admin/news/create" element={<ProtectedRoute><NewsEditPage /></ProtectedRoute>} />
          <Route path="/admin/news/:id/edit" element={<ProtectedRoute><NewsEditPage /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
          <Route path="/admin/customers/:id" element={<ProtectedRoute><CustomerProfilePage /></ProtectedRoute>} />
          <Route path="/admin/mailing-lists" element={<ProtectedRoute><MailingListsPage /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
          <Route path="/admin/jobs" element={<ProtectedRoute><ServiceJobsPage /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute><StaffManagementPage /></ProtectedRoute>} />
          <Route path="/admin/invoices" element={<ProtectedRoute><InvoicingPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/create" element={<ProtectedRoute><InvoiceEditPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/:id/edit" element={<ProtectedRoute><InvoiceEditPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/:id/preview" element={<ProtectedRoute><InvoicePreviewPage /></ProtectedRoute>} />
          <Route path="/admin/invoicing" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="/admin/waste-transfer-notes" element={<ProtectedRoute><WasteTransferNotesPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements" element={<ProtectedRoute><ServiceAgreementsPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements/create" element={<ProtectedRoute><ServiceAgreementEditPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements/edit/:id" element={<ProtectedRoute><ServiceAgreementEditPage /></ProtectedRoute>} />
          <Route path="/admin/email-inbox" element={<ProtectedRoute><EmailInboxPage /></ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/create" element={<ProtectedRoute><CertificateEditPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/:id/edit" element={<ProtectedRoute><CertificateEditPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/:id/preview" element={<ProtectedRoute><CertificatePreviewPage /></ProtectedRoute>} />
          <Route path="/admin/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
          <Route path="/admin/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/admin/collection-requests" element={<ProtectedRoute><CollectionRequestsPage /></ProtectedRoute>} />
          <Route path="/staff/dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
          <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
