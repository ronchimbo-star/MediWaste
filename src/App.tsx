import { lazy, Suspense, Component } from 'react';
import type { ComponentType, ReactNode, ErrorInfo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';

function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const retryKey = `chunk-retry:${window.location.pathname}`;
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, '1');
        const url = new URL(window.location.href);
        url.searchParams.set('refresh', Date.now().toString());
        window.location.replace(url.toString());
        await new Promise<never>(() => {});
      }
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });
}

const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage'));
const WasteServicesPage = lazyWithRetry(() => import('./pages/WasteServicesPage'));
const NewsPage = lazyWithRetry(() => import('./pages/NewsPage'));
const NewsArticlePage = lazyWithRetry(() => import('./pages/NewsArticlePage'));
const NewsCategoryPage = lazyWithRetry(() => import('./pages/NewsCategoryPage'));
const ServiceAreaPage = lazyWithRetry(() => import('./pages/ServiceAreaPage'));
const LocationServicePage = lazyWithRetry(() => import('./pages/LocationServicePage'));
const QuotePage = lazyWithRetry(() => import('./pages/QuotePage'));
const PublicQuoteView = lazyWithRetry(() => import('./pages/PublicQuoteView'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const CookiePage = lazyWithRetry(() => import('./pages/CookiePage'));
const InfectiousWastePage = lazyWithRetry(() => import('./pages/InfectiousWastePage'));
const SharpsWastePage = lazyWithRetry(() => import('./pages/SharpsWastePage'));
const PharmaceuticalWastePage = lazyWithRetry(() => import('./pages/PharmaceuticalWastePage'));
const CytotoxicWastePage = lazyWithRetry(() => import('./pages/CytotoxicWastePage'));
const DentalWastePage = lazyWithRetry(() => import('./pages/DentalWastePage'));
const AnatomicalWastePage = lazyWithRetry(() => import('./pages/AnatomicalWastePage'));
const ServiceAgreementPage = lazyWithRetry(() => import('./pages/ServiceAgreementPage'));
const CompliancePage = lazyWithRetry(() => import('./pages/CompliancePage'));
const ComplianceInfoPage = lazyWithRetry(() => import('./pages/ComplianceInfoPage'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const QuoteRequestsPage = lazyWithRetry(() => import('./pages/admin/QuoteRequestsPage'));
const QuotesPage = lazyWithRetry(() => import('./pages/admin/QuotesPage'));
const QuoteEditPage = lazyWithRetry(() => import('./pages/admin/QuoteEditPage'));
const ContactEnquiriesPage = lazyWithRetry(() => import('./pages/admin/ContactEnquiriesPage'));
const SiteSettingsPage = lazyWithRetry(() => import('./pages/admin/SiteSettingsPage'));
const NewsManagementPage = lazyWithRetry(() => import('./pages/admin/NewsManagementPage'));
const NewsEditPage = lazyWithRetry(() => import('./pages/admin/NewsEditPage'));
const CustomersPage = lazyWithRetry(() => import('./pages/admin/CustomersPage'));
const CustomerProfilePage = lazyWithRetry(() => import('./pages/admin/CustomerProfilePage'));
const MailingListsPage = lazyWithRetry(() => import('./pages/admin/MailingListsPage'));
const SubscriptionsPage = lazyWithRetry(() => import('./pages/admin/SubscriptionsPage'));
const ServiceJobsPage = lazyWithRetry(() => import('./pages/admin/ServiceJobsPage'));
const StaffManagementPage = lazyWithRetry(() => import('./pages/admin/StaffManagementPage'));
const InvoicingPage = lazyWithRetry(() => import('./pages/admin/InvoicingPage'));
const InvoiceEditPage = lazyWithRetry(() => import('./pages/admin/InvoiceEditPage'));
const InvoicePreviewPage = lazyWithRetry(() => import('./pages/admin/InvoicePreviewPage'));
const ConversationIntakePage = lazyWithRetry(() => import('./pages/admin/ConversationIntakePage'));
const InvoiceReviewPage = lazyWithRetry(() => import('./pages/admin/InvoiceReviewPage'));
const PaymentSettingsPage = lazyWithRetry(() => import('./pages/admin/PaymentSettingsPage'));
const FinancialPinSettingsPage = lazyWithRetry(() => import('./pages/admin/FinancialPinSettingsPage'));
const PendingPaymentsPage = lazyWithRetry(() => import('./pages/admin/PendingPaymentsPage'));
const PublicInvoicePage = lazyWithRetry(() => import('./pages/PublicInvoicePage'));
const WasteTransferNotesPage = lazyWithRetry(() => import('./pages/admin/WasteTransferNotesPage'));
const WasteCarriersPage = lazyWithRetry(() => import('./pages/admin/WasteCarriersPage'));
const StaffDashboard = lazyWithRetry(() => import('./pages/staff/StaffDashboard'));
const CustomerDashboard = lazyWithRetry(() => import('./pages/customer/CustomerDashboard'));
const ServiceAgreementsPage = lazyWithRetry(() => import('./pages/admin/ServiceAgreementsPage'));
const ServiceAgreementEditPage = lazyWithRetry(() => import('./pages/admin/ServiceAgreementEditPage'));
const EmailInboxPage = lazyWithRetry(() => import('./pages/admin/EmailInboxPage'));
const AiBriefingPage = lazyWithRetry(() => import('./pages/admin/AiBriefingPage'));
const AiQuoteDraftsPage = lazyWithRetry(() => import('./pages/admin/AiQuoteDraftsPage'));
const AiCustomerDraftsPage = lazyWithRetry(() => import('./pages/admin/AiCustomerDraftsPage'));
const WasteAuditsPage = lazyWithRetry(() => import('./pages/admin/WasteAuditsPage'));
const WasteAuditEditPage = lazyWithRetry(() => import('./pages/admin/WasteAuditEditPage'));
const PublicAuditView = lazyWithRetry(() => import('./pages/PublicAuditView'));
const CertificatesPage = lazyWithRetry(() => import('./pages/admin/CertificatesPage'));
const CertificateEditPage = lazyWithRetry(() => import('./pages/admin/CertificateEditPage'));
const CertificatePreviewPage = lazyWithRetry(() => import('./pages/admin/CertificatePreviewPage'));
const NotesPage = lazyWithRetry(() => import('./pages/admin/NotesPage'));
const BackupPage = lazyWithRetry(() => import('./pages/admin/BackupPage'));
const ResourcesPage = lazyWithRetry(() => import('./pages/admin/ResourcesPage'));
const CollectionRequestsPage = lazyWithRetry(() => import('./pages/admin/CollectionRequestsPage'));
const SeoPagesPage = lazyWithRetry(() => import('./pages/admin/SeoPagesPage'));
const SeoPageEditPage = lazyWithRetry(() => import('./pages/admin/SeoPageEditPage'));
const BrokenLinksPage = lazyWithRetry(() => import('./pages/admin/BrokenLinksPage'));
const SeoPage = lazyWithRetry(() => import('./pages/SeoPage'));
const DirectoryListingsPage = lazyWithRetry(() => import('./pages/DirectoryListingsPage'));
const DirectoryListingsAdminPage = lazyWithRetry(() => import('./pages/admin/DirectoryListingsPage'));
const SitemapPage = lazyWithRetry(() => import('./pages/admin/SitemapPage'));
const AuditPage = lazyWithRetry(() => import('./pages/AuditPage'));
const AdminAuditsPage = lazyWithRetry(() => import('./pages/admin/AdminAuditsPage'));
const AdminAuditDetailPage = lazyWithRetry(() => import('./pages/admin/AdminAuditDetailPage'));
const DriverUploadPage = lazyWithRetry(() => import('./pages/DriverUploadPage'));
const MarkdownForAgentsPage = lazyWithRetry(() => import('./pages/admin/MarkdownForAgentsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-8">Please try refreshing the page.</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
      <ErrorBoundary>
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
          <Route path="/compliance" element={<ComplianceInfoPage />} />
          <Route path="/compliance/:token" element={<CompliancePage />} />
          <Route path="/directory-listings" element={<DirectoryListingsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/audit/:token" element={<PublicAuditView />} />
          <Route path="/driver-upload" element={<DriverUploadPage />} />
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
          <Route path="/admin/invoices/new-from-conversation" element={<ProtectedRoute><ConversationIntakePage /></ProtectedRoute>} />
          <Route path="/admin/invoices/review" element={<ProtectedRoute><InvoiceReviewPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/create" element={<ProtectedRoute><InvoiceEditPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/:id/edit" element={<ProtectedRoute><InvoiceEditPage /></ProtectedRoute>} />
          <Route path="/admin/invoices/:id/preview" element={<ProtectedRoute><InvoicePreviewPage /></ProtectedRoute>} />
          <Route path="/admin/finance/pending-payments" element={<ProtectedRoute><PendingPaymentsPage /></ProtectedRoute>} />
          <Route path="/admin/settings/payment-details" element={<ProtectedRoute><PaymentSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/settings/financial-pin" element={<ProtectedRoute><FinancialPinSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/invoicing" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="/admin/waste-transfer-notes" element={<ProtectedRoute><WasteTransferNotesPage /></ProtectedRoute>} />
          <Route path="/admin/waste-carriers" element={<ProtectedRoute><WasteCarriersPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements" element={<ProtectedRoute><ServiceAgreementsPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements/create" element={<ProtectedRoute><ServiceAgreementEditPage /></ProtectedRoute>} />
          <Route path="/admin/service-agreements/edit/:id" element={<ProtectedRoute><ServiceAgreementEditPage /></ProtectedRoute>} />
          <Route path="/admin/email-inbox" element={<ProtectedRoute><EmailInboxPage /></ProtectedRoute>} />
          <Route path="/admin/ai-briefing" element={<ProtectedRoute><AiBriefingPage /></ProtectedRoute>} />
          <Route path="/admin/ai-quote-drafts" element={<ProtectedRoute><AiQuoteDraftsPage /></ProtectedRoute>} />
          <Route path="/admin/ai-customer-setup" element={<ProtectedRoute><AiCustomerDraftsPage /></ProtectedRoute>} />
          <Route path="/admin/waste-audits" element={<ProtectedRoute><WasteAuditsPage /></ProtectedRoute>} />
          <Route path="/admin/waste-audits/:id/edit" element={<ProtectedRoute><WasteAuditEditPage /></ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/create" element={<ProtectedRoute><CertificateEditPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/:id/edit" element={<ProtectedRoute><CertificateEditPage /></ProtectedRoute>} />
          <Route path="/admin/certificates/:id/preview" element={<ProtectedRoute><CertificatePreviewPage /></ProtectedRoute>} />
          <Route path="/admin/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
          <Route path="/admin/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/admin/collection-requests" element={<ProtectedRoute><CollectionRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/seo-pages" element={<ProtectedRoute><SeoPagesPage /></ProtectedRoute>} />
          <Route path="/admin/seo-pages/create" element={<ProtectedRoute><SeoPageEditPage /></ProtectedRoute>} />
          <Route path="/admin/seo-pages/:id/edit" element={<ProtectedRoute><SeoPageEditPage /></ProtectedRoute>} />
          <Route path="/admin/seo-pages/broken-links" element={<ProtectedRoute><BrokenLinksPage /></ProtectedRoute>} />
          <Route path="/admin/directory-listings" element={<ProtectedRoute><DirectoryListingsAdminPage /></ProtectedRoute>} />
          <Route path="/admin/sitemap" element={<ProtectedRoute><SitemapPage /></ProtectedRoute>} />
          <Route path="/admin/audits" element={<ProtectedRoute><AdminAuditsPage /></ProtectedRoute>} />
          <Route path="/admin/audits/:id" element={<ProtectedRoute><AdminAuditDetailPage /></ProtectedRoute>} />
          <Route path="/staff/dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
          <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/invoice/:token" element={<PublicInvoicePage />} />
          <Route path="/c/:slug" element={<SeoPage />} />
          <Route path="/admin/markdown-for-agents" element={<ProtectedRoute><MarkdownForAgentsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
