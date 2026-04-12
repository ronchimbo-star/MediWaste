import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Download, Printer, Mail, Phone, HelpCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

interface WasteItem {
  description: string;
  frequency: string;
}

interface ServiceAgreement {
  id: string;
  agreement_number: string;
  client_name: string;
  client_address: string;
  collection_address: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  waste_types: string[];
  waste_items: WasteItem[] | null;
  collection_frequency: string;
  containers: string;
  initial_term_months: number;
  payment_terms_days: number;
  bin_rental: boolean;
  start_date: string;
  end_date: string;
  annual_value: number;
  status: string;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_by_position: string | null;
  accepted_by_date: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  created_at: string;
}

export default function ServiceAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const [agreement, setAgreement] = useState<ServiceAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [acceptForm, setAcceptForm] = useState({
    name: '',
    position: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (token) {
      fetchAgreement();
    }
  }, [token]);

  const fetchAgreement = async () => {
    try {
      const { data, error } = await supabase
        .from('service_agreements')
        .select('*')
        .eq('secure_token', token)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Service agreement not found');
      } else {
        setAgreement(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!acceptForm.name.trim() || !acceptForm.position.trim() || !acceptForm.date) {
      setError('Please enter your name, position, and date');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('service_agreements')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by_name: acceptForm.name,
          accepted_by_position: acceptForm.position,
          accepted_by_date: acceptForm.date
        })
        .eq('id', agreement?.id);

      if (error) throw error;

      await fetchAgreement();
      setAcceptForm({ name: '', position: '', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('service_agreements')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: declineReason
        })
        .eq('id', agreement?.id);

      if (error) throw error;

      await fetchAgreement();
      setShowDeclineModal(false);
      setDeclineReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <SEO
          title="Service Agreement - MediWaste"
          description="View your MediWaste service agreement"
          canonical="https://mediwaste.co.uk/service-agreement"
          noindex={true}
        />
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agreement...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !agreement) {
    return (
      <>
        <SEO
          title="Service Agreement Not Found - MediWaste"
          description="Service agreement not found"
          canonical="https://mediwaste.co.uk/service-agreement"
          noindex={true}
        />
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Agreement Not Found</h1>
            <p className="text-gray-600">{error || 'The service agreement you are looking for could not be found.'}</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isAccepted = agreement.status === 'accepted';
  const isDeclined = agreement.status === 'declined';
  const canTakeAction = agreement.status === 'sent';

  return (
    <>
      <SEO
        title={`Service Agreement #${agreement.agreement_number} - MediWaste`}
        description={`Service agreement for ${agreement.client_name}`}
        canonical={`https://mediwaste.co.uk/service-agreement/${token}`}
        noindex={true}
      />
      <div className="print:hidden">
        <Header />
      </div>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Status Banner */}
          {isAccepted && (
            <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                <div>
                  <p className="font-semibold text-green-900">Agreement Accepted</p>
                  <p className="text-sm text-green-700">
                    Accepted by {agreement.accepted_by_name} on {new Date(agreement.accepted_at!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDeclined && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center">
                <XCircle className="w-6 h-6 text-red-500 mr-3" />
                <div>
                  <p className="font-semibold text-red-900">Agreement Declined</p>
                  <p className="text-sm text-red-700">
                    Declined on {new Date(agreement.declined_at!).toLocaleDateString()}
                  </p>
                  {agreement.decline_reason && (
                    <p className="text-sm text-red-600 mt-1">Reason: {agreement.decline_reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Print Version Hidden */}
          <div className="mb-6 flex gap-4 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>

          {/* Agreement Document */}
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 mb-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-8 border-b">
              <div>
                <img
                  src="/mediwaste-logo.png"
                  alt="MediWaste"
                  className="h-12 mb-4"
                />
                <p className="text-sm text-gray-600">Agreement No: {agreement.agreement_number}</p>
                <p className="text-sm text-gray-600">Date: {new Date(agreement.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Service Agreement
            </h1>

            <div className="space-y-8 text-gray-700">
              {/* Parties */}
              <div>
                <p className="font-semibold text-gray-900 mb-4">This Service Agreement is made between:</p>

                <div className="mb-6">
                  <p className="font-semibold text-gray-900">Supplier:</p>
                  <p>Circular Horizons International LTD T/A MediWaste</p>
                  <p>Unit A 82 James Carter Road, Mildenhall, IP28 7DE</p>
                  <p>Company No: 15821509</p>
                  <p>Contact: Sarah Benson – sarah.benson@mediwaste.co.uk / 01322 879 713</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900">Client:</p>
                  <p className="font-medium">{agreement.client_name}</p>
                  <p>{agreement.client_address}</p>
                  <p>Contact: {agreement.contact_name} – {agreement.contact_email} / {agreement.contact_phone}</p>
                </div>
              </div>

              {/* Section 1 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Services Provided</h2>
                <p className="mb-2">MediWaste agrees to provide the following waste collection and disposal services:</p>

                {agreement.collection_address && (
                  <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="font-semibold text-gray-900">Collection Address:</p>
                    <p className="text-gray-700">{agreement.collection_address}</p>
                  </div>
                )}

                {agreement.waste_items && agreement.waste_items.length > 0 ? (
                  <div className="mb-4">
                    <p className="font-semibold mb-2">Waste Collection Items:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      {agreement.waste_items.map((item, index) => (
                        <li key={index}>
                          <span className="font-medium">{item.description}</span> - <span className="text-gray-600">{item.frequency}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <span className="font-semibold">Waste types:</span>{' '}
                      {agreement.waste_types.length > 0 ? agreement.waste_types.join(', ') : 'As specified'}
                    </li>
                    <li>
                      <span className="font-semibold">Collection frequency:</span> {agreement.collection_frequency}
                    </li>
                  </ul>
                )}

                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>
                    <span className="font-semibold">Containers:</span> {agreement.containers}
                  </li>
                  <li>
                    <span className="font-semibold">Documentation:</span> Full hazardous waste consignment notes, waste transfer notes, and online compliance dashboard access.
                  </li>
                </ul>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. Term & Cancellation</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <span className="font-semibold">Initial term:</span> {agreement.initial_term_months} months from the first collection date (if scheduled service). For Flexi/on-demand plans, the agreement is valid for {agreement.initial_term_months} months from the date of invoice.
                  </li>
                  <li>
                    <span className="font-semibold">Cancellation:</span> 30 days' written notice. Unused prepaid collections will be refunded pro-rata, minus a £25 admin fee.
                  </li>
                  {agreement.bin_rental && (
                    <li>
                      <span className="font-semibold">Bin rental:</span> Rolling monthly contract – 30 days' notice to cancel.
                    </li>
                  )}
                </ul>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. Payment Terms</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Invoices are due within {agreement.payment_terms_days} days of issue.</li>
                  <li>Late payments may incur a 5% late fee and suspension of service.</li>
                  <li>For Flexi plans, payment is required before the first collection.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Client Obligations</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Store all waste securely in appropriate containers.</li>
                  <li>Do not overfill containers.</li>
                  <li>Inform MediWaste of any changes to waste types or volumes.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Liability & Compliance</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>MediWaste holds a valid Upper Tier Waste Carrier Licence (CBDU123456) and £5m public liability insurance.</li>
                  <li>MediWaste will provide all legally required documentation and ensure waste is disposed of at permitted facilities.</li>
                  <li>The client remains responsible for accurate waste classification.</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Service Guarantee</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>MediWaste guarantees a 2-hour collection window with 24 hours' notice.</li>
                  <li>If we miss a scheduled collection without 24 hours' notice, the next collection is free.</li>
                </ul>
              </div>

              {/* Signatures */}
              <div className="mt-12 pt-8 border-t">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="font-semibold text-gray-900 mb-4">Accepted by:</p>
                    {isAccepted ? (
                      <>
                        <p className="mb-2">Signature: <span className="italic font-semibold">{agreement.accepted_by_name}</span></p>
                        <p className="mb-2">Date: {agreement.accepted_by_date ? new Date(agreement.accepted_by_date).toLocaleDateString() : new Date(agreement.accepted_at!).toLocaleDateString()}</p>
                        <p className="mb-2">Name: {agreement.accepted_by_name}</p>
                        <p>Position: {agreement.accepted_by_position}</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">Signature: _________________</p>
                        <p className="mb-2">Date: ________</p>
                        <p className="mb-2">Name: _________________</p>
                        <p>Position: ________</p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 mb-4">For and on behalf of MediWaste:</p>
                    <p className="mb-2">Signature: <span className="italic font-semibold">Sarah Benson</span></p>
                    <p className="mb-2">Date: {new Date(agreement.created_at).toLocaleDateString()}</p>
                    <p>Sarah Benson, Key Account Manager</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Accept/Decline Section */}
          {canTakeAction && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8 print:hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Agreement Action Required</h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                {/* Accept Section */}
                <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Accept Agreement
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        value={acceptForm.name}
                        onChange={(e) => setAcceptForm({ ...acceptForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., John Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={acceptForm.date}
                        onChange={(e) => setAcceptForm({ ...acceptForm, date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Position *
                      </label>
                      <input
                        type="text"
                        value={acceptForm.position}
                        onChange={(e) => setAcceptForm({ ...acceptForm, position: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Practice Manager"
                      />
                    </div>

                    <button
                      onClick={handleAccept}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Accept Agreement'}
                    </button>
                  </div>
                </div>

                {/* Decline Section */}
                <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <XCircle className="w-6 h-6 text-red-600" />
                    Decline Agreement
                  </h3>

                  <p className="text-gray-700 mb-4">
                    If you have concerns or need to decline this agreement, please let us know.
                  </p>

                  <button
                    onClick={() => setShowDeclineModal(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Decline Agreement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-600" />
                  What happens after I accept the agreement?
                </h3>
                <p className="text-gray-700 pl-7">
                  Once you accept, our team will be notified immediately and will begin arranging your first collection. You'll receive a confirmation email with your collection schedule and access to your online compliance dashboard.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-600" />
                  Can I modify the agreement terms?
                </h3>
                <p className="text-gray-700 pl-7">
                  If you need to discuss any changes to the agreement terms, please contact us before accepting. We're happy to work with you to ensure the agreement meets your needs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-600" />
                  How do I cancel the service?
                </h3>
                <p className="text-gray-700 pl-7">
                  You can cancel with 30 days' written notice at any time after the initial term. Simply email us at sarah.benson@mediwaste.co.uk with your cancellation request.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-600" />
                  What documentation will I receive?
                </h3>
                <p className="text-gray-700 pl-7">
                  You'll receive full hazardous waste consignment notes, waste transfer notes for every collection, and access to our online compliance dashboard where you can view and download all documentation at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6 print:hidden">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this service agreement, our team is here to help.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-red-600" />
                <a href="mailto:sarah.benson@mediwaste.co.uk" className="text-red-600 hover:text-red-700 font-medium">
                  sarah.benson@mediwaste.co.uk
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-red-600" />
                <a href="tel:01322879713" className="text-red-600 hover:text-red-700 font-medium">
                  01322 879 713
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Decline Service Agreement</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please tell us why you're declining (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., Terms not suitable, found alternative provider, etc."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
