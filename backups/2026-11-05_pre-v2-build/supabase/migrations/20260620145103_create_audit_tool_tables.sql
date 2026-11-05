
-- Audit sessions: one per user submission
CREATE TABLE mw_audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  -- Business details
  sector TEXT,
  business_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  town TEXT,
  county TEXT,
  site_address TEXT,
  postcode TEXT,
  -- Audit metadata
  current_step INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  -- Consent
  consent_data BOOLEAN DEFAULT FALSE,
  consent_marketing BOOLEAN DEFAULT FALSE,
  -- Tracking
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit answers: structured answers from the wizard
CREATE TABLE mw_audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mw_audit_sessions(id) ON DELETE CASCADE,
  -- Staff & premises
  staff_count TEXT,
  treatment_rooms INTEGER,
  sites_count INTEGER,
  -- Waste streams (JSON array of {type, volume, unit})
  waste_streams JSONB DEFAULT '[]',
  -- Current setup
  current_contractor TEXT,
  collection_frequency TEXT,
  container_types TEXT[],
  segregation_method TEXT,
  -- Storage
  storage_location TEXT,
  storage_conditions TEXT,
  -- Compliance
  has_waste_policy BOOLEAN,
  staff_trained BOOLEAN,
  last_audit_date TEXT,
  compliance_concerns TEXT,
  -- Pain points
  pain_points TEXT[],
  pain_points_other TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated audit reports
CREATE TABLE mw_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mw_audit_sessions(id) ON DELETE CASCADE,
  -- AI generated content
  executive_summary TEXT,
  compliance_risks JSONB DEFAULT '[]',
  waste_stream_breakdown JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  risk_rating TEXT CHECK (risk_rating IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  -- Full report HTML for PDF generation
  report_html TEXT,
  -- AI model used
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_tokens_used INTEGER,
  -- Status
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'complete', 'failed', 'fallback')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote requests from audit flow
CREATE TABLE mw_audit_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mw_audit_sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'lost')),
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download events
CREATE TABLE mw_audit_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mw_audit_sessions(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'word', 'email')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE mw_audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_audit_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_audit_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_audit_download_events ENABLE ROW LEVEL SECURITY;

-- Public can insert and read their own session by token
CREATE POLICY "anon_insert_audit_sessions" ON mw_audit_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_own_audit_sessions" ON mw_audit_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_own_audit_sessions" ON mw_audit_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_audit_answers" ON mw_audit_answers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_audit_answers" ON mw_audit_answers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_audit_answers" ON mw_audit_answers FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_audit_reports" ON mw_audit_reports FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_audit_reports" ON mw_audit_reports FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_insert_quote_requests" ON mw_audit_quote_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_quote_requests" ON mw_audit_quote_requests FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_download_events" ON mw_audit_download_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_download_events" ON mw_audit_download_events FOR SELECT TO anon USING (true);

-- Authenticated (admin) can do everything
CREATE POLICY "auth_all_audit_sessions" ON mw_audit_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_audit_answers" ON mw_audit_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_audit_reports" ON mw_audit_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_quote_requests" ON mw_audit_quote_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_download_events" ON mw_audit_download_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_audit_sessions_email ON mw_audit_sessions(email);
CREATE INDEX idx_audit_sessions_sector ON mw_audit_sessions(sector);
CREATE INDEX idx_audit_sessions_status ON mw_audit_sessions(status);
CREATE INDEX idx_audit_sessions_created ON mw_audit_sessions(created_at DESC);
CREATE INDEX idx_audit_answers_session ON mw_audit_answers(session_id);
CREATE INDEX idx_audit_reports_session ON mw_audit_reports(session_id);
CREATE INDEX idx_audit_quote_requests_session ON mw_audit_quote_requests(session_id);
CREATE INDEX idx_audit_download_events_session ON mw_audit_download_events(session_id);
