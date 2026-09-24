export interface ConversationSource {
  id: string;
  customer_id: string | null;
  source_type: 'email' | 'form' | 'manual';
  subject: string | null;
  sender_email: string | null;
  conversation_text: string;
  extracted_json: AIExtractionResult | null;
  ai_warnings: string[];
  missing_information: string[];
  conflicts: string[];
  confidence_score: AIConfidence;
  created_by: string | null;
  created_at: string;
}

export interface AIExtractionResult {
  customer: {
    name: string;
    company_name: string;
    email: string;
    telephone: string;
    billing_address: string;
    site_address: string;
    company_registration_number: string;
    vat_number: string;
  };
  invoice: {
    currency: string;
    invoice_date: string;
    due_date: string;
    payment_terms_days: number | null;
    customer_reference: string;
    purchase_order_number: string;
    notes: string;
  };
  line_items: Array<{
    description: string;
    waste_type: string;
    service_type: string;
    quantity: number;
    unit: string;
    unit_price: number | null;
    vat_rate: number | null;
    line_total: number | null;
    pricing_status: 'confirmed' | 'estimated' | 'missing' | 'conflicting';
    source_text: string;
  }>;
  totals: {
    subtotal: number | null;
    vat_amount: number | null;
    total: number | null;
    calculation_status: 'complete' | 'incomplete' | 'requires_review';
  };
  payment: {
    payment_reference: string;
    payment_method_notes: string;
    bank_transfer_requested: boolean;
    card_payment_requested: boolean;
  };
  email: {
    recipient_name: string;
    subject: string;
    salutation: string;
    body: string;
    sign_off: string;
  };
  warnings: string[];
  missing_information: string[];
  conflicts: string[];
  confidence: AIConfidence;
}

export interface AIConfidence {
  overall: number;
  customer_details: number;
  service_details: number;
  pricing: number;
  email_details: number;
}

export interface InvoiceLineItem {
  id?: string;
  invoice_id?: string;
  sort_order: number;
  description: string;
  waste_type: string;
  service_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  total_price: number;
  pricing_status: string;
  source_text: string;
  po_number: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  public_token: string;
  customer_id: string;
  source_type: string;
  source_conversation_id: string | null;
  source_quote_id: string | null;
  source_enquiry_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  payment_terms: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  discount_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_reference: string | null;
  payment_url: string | null;
  bank_details_snapshot: any;
  billing_address: string | null;
  site_address: string | null;
  po_number: string | null;
  vat_number: string | null;
  customer_reference: string | null;
  notes: string | null;
  internal_notes: string | null;
  pdf_storage_path: string | null;
  pdf_file_name: string | null;
  recipient_email: string | null;
  email_subject: string | null;
  email_salutation: string | null;
  email_body: string | null;
  email_sign_off: string | null;
  cc_emails: string | null;
  bcc_emails: string | null;
  created_by: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  last_viewed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  line_items?: InvoiceLineItem[];
  customer?: CustomerInfo;
}

export type InvoiceStatus =
  | 'draft'
  | 'review_required'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void';

export interface CustomerInfo {
  id: string;
  customer_number: string;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  collection_address: string | null;
  payment_terms_days: number | null;
  postcode: string | null;
}

export interface InvoiceSettings {
  id: string;
  bank_name: string;
  account_name: string;
  sort_code: string;
  account_number: string;
  vat_number: string;
  payment_instructions: string | null;
  trading_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_phone: string | null;
  website: string | null;
  company_registration_number: string | null;
  vat_rate_default: number;
  payment_link_url: string | null;
  default_payment_terms_days: number;
  invoice_prefix: string;
  invoice_include_year: boolean;
  invoice_padding: number;
  invoice_next_sequence: number;
}

export interface InvoiceEvent {
  id: string;
  invoice_id: string;
  event_type: string;
  event_data: any;
  previous_status: string | null;
  new_status: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  transaction_date: string;
  description: string;
  category: string;
  customer_id: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  payment_number: string;
  customer_id: string;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}
