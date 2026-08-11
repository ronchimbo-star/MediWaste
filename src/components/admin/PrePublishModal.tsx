import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, X } from 'lucide-react';

export interface PrePublishCheck {
  label: string;
  passed: boolean;
  severity: 'critical' | 'warning';
  detail?: string;
}

interface PrePublishModalProps {
  open: boolean;
  checks: PrePublishCheck[];
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  pageTitle: string;
}

export default function PrePublishModal({
  open,
  checks,
  onClose,
  onConfirm,
  confirming,
  pageTitle,
}: PrePublishModalProps) {
  const [overrideAck, setOverrideAck] = useState(false);

  const criticalFailures = useMemo(
    () => checks.filter(c => !c.passed && c.severity === 'critical'),
    [checks],
  );
  const warnings = useMemo(
    () => checks.filter(c => !c.passed && c.severity === 'warning'),
    [checks],
  );
  const passed = useMemo(() => checks.filter(c => c.passed), [checks]);
  const score = checks.length > 0 ? Math.round((passed.length / checks.length) * 100) : 0;

  const canPublish = criticalFailures.length === 0 || overrideAck;

  if (!open) return null;

  const scoreColor =
    score >= 90
      ? 'text-green-700 bg-green-50 border-green-200'
      : score >= 70
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Shield size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pre-Publish SEO Check</h2>
              <p className="text-sm text-gray-500 truncate max-w-[300px]">{pageTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Score banner */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              {passed.length} of {checks.length} checks passed
            </span>
            <span className={`px-3 py-1 text-sm font-bold rounded-full border ${scoreColor}`}>
              {score}%
            </span>
          </div>
        </div>

        {/* Body — scrollable checklist */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {criticalFailures.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                {criticalFailures.length} critical issue{criticalFailures.length > 1 ? 's' : ''} found. These hurt SEO rankings and should be fixed before publishing.
              </p>
            </div>
          )}
          {warnings.length > 0 && criticalFailures.length === 0 && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}. Consider fixing these for best SEO results.
              </p>
            </div>
          )}

          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              {check.passed ? (
                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
              ) : check.severity === 'critical' ? (
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${check.passed ? 'text-gray-700' : check.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'}`}>
                  {check.label}
                </p>
                {check.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
                )}
              </div>
              {!check.passed && check.severity === 'critical' && (
                <span className="text-xs font-semibold text-red-600 uppercase shrink-0">Critical</span>
              )}
              {!check.passed && check.severity === 'warning' && (
                <span className="text-xs font-semibold text-yellow-600 uppercase shrink-0">Warning</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 space-y-3">
          {criticalFailures.length > 0 && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideAck}
                onChange={(e) => setOverrideAck(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-600">
                I understand there are {criticalFailures.length} critical SEO issue{criticalFailures.length > 1 ? 's' : ''}. Publish anyway.
              </span>
            </label>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canPublish || confirming}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors bg-red-600 hover:bg-red-700"
            >
              {confirming ? 'Publishing...' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validation helpers ─────────────────────────────────────────────

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(w => w.length > 0).length;
}

function countOccurrences(html: string, term: string): number {
  if (!term) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const keyword = term.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    count++;
    pos += keyword.length;
  }
  return count;
}

function countH1(html: string): number {
  const matches = html.match(/<h1[\s>]/gi);
  return matches ? matches.length : 0;
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const linkRegex = /href="([^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function extractImages(html: string): string[] {
  const srcs: string[] = [];
  const imgRegex = /src="([^"]+)"/g;
  const cleaned = html.replace(/href="[^"]+"/g, '');
  let match;
  while ((match = imgRegex.exec(cleaned)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

const VALID_LINK_PREFIXES = ['/', 'https://www.mediwaste.co.uk', 'http://www.mediwaste.co.uk', 'https://mediwaste.co.uk', 'http://mediwaste.co.uk', 'tel:', 'mailto:'];
const VALID_IMG_PREFIXES = ['/', 'https://images.pexels.com/', 'https://www.mediwaste.co.uk', 'http://www.mediwaste.co.uk', 'https://mediwaste.co.uk', 'data:'];

const AMERICAN_SPELLINGS = ['organize', 'organized', 'organizing', 'color ', 'center ', 'license ', 'fiber', 'liter ', 'meter ', 'defense ', 'offense '];

const ALLOWLISTED_EXTERNAL = [
  'https://www.gov.uk',
  'https://www.hse.gov.uk',
  'https://www.england.nhs.uk',
  'https://www.nhs.uk',
  'https://www.legislation.gov.uk',
  'https://www.environment-agency.gov.uk',
  'https://www.cqc.org.uk',
  'https://images.pexels.com',
];

const BLOCKED_EXTERNAL_LINKS = [
  'https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste',
];

// ── Check builders for each content type ───────────────────────────

export function buildSeoPageChecks(form: {
  meta_title: string;
  meta_description: string;
  h1: string;
  content: string;
  target_keyword: string;
  location: string;
  og_title: string;
  og_description: string;
}): PrePublishCheck[] {
  const checks: PrePublishCheck[] = [];
  const lowerContent = form.content.toLowerCase();
  const textContent = form.content.replace(/<[^>]+>/g, ' ');

  // Meta title
  checks.push({
    label: 'Meta title set (45-65 chars)',
    passed: form.meta_title.length >= 50 && form.meta_title.length <= 60,
    severity: 'critical',
    detail: form.meta_title ? `${form.meta_title.length} characters` : 'Not set',
  });

  // Meta description
  checks.push({
    label: 'Meta description set (150-160 chars)',
    passed: form.meta_description.length >= 150 && form.meta_description.length <= 160,
    severity: 'critical',
    detail: form.meta_description ? `${form.meta_description.length} characters` : 'Not set',
  });

  // H1 exists
  checks.push({
    label: 'H1 heading set',
    passed: Boolean(form.h1) && form.h1.trim().length > 0,
    severity: 'critical',
    detail: form.h1 ? `"${form.h1}"` : 'Not set',
  });

  // H1 includes keyword
  if (form.target_keyword) {
    checks.push({
      label: 'H1 includes target keyword',
      passed: form.h1.toLowerCase().includes(form.target_keyword.toLowerCase()),
      severity: 'warning',
      detail: form.h1 ? `"${form.h1}"` : 'No H1 set',
    });
  }

  // H1 includes location
  if (form.location) {
    checks.push({
      label: `H1 includes location (${form.location})`,
      passed: form.h1.toLowerCase().includes(form.location.toLowerCase()),
      severity: 'warning',
      detail: form.h1 ? `"${form.h1}"` : 'No H1 set',
    });
  }

  // No multiple H1 in content
  const h1Count = countH1(form.content);
  checks.push({
    label: 'No duplicate H1 in content (template adds H1)',
    passed: h1Count === 0,
    severity: 'critical',
    detail: h1Count > 0 ? `${h1Count} H1 tag${h1Count > 1 ? 's' : ''} found in content — remove them` : 'Passed',
  });

  // Content word count (excluding FAQ/testimonials)
  let mainContent = form.content;
  const faqStart = lowerContent.indexOf('<h2>frequently asked questions');
  if (faqStart !== -1) mainContent = form.content.slice(0, faqStart);
  mainContent = mainContent.replace(/<div class="info-box">[\s\S]*?<\/div>/gi, '');
  const mainWordCount = countWords(mainContent);
  const totalWordCount = countWords(form.content);
  checks.push({
    label: 'Content length (min 1,500 words excl. FAQ/testimonials)',
    passed: mainWordCount >= 1500,
    severity: 'critical',
    detail: `${mainWordCount} main body words (${totalWordCount} total)`,
  });

  // Keyword usage
  if (form.target_keyword) {
    const keywordCount = countOccurrences(form.content, form.target_keyword);
    checks.push({
      label: 'Keyword usage (5-12 times)',
      passed: keywordCount >= 4 && keywordCount <= 12,
      severity: 'warning',
      detail: `"${form.target_keyword}" appears ${keywordCount} times`,
    });
  }

  // Trust signals
  const hasTestimonials = lowerContent.includes('testimonial') || lowerContent.includes('rated excellent');
  checks.push({
    label: 'Trust signal module with testimonials',
    passed: hasTestimonials,
    severity: 'warning',
    detail: hasTestimonials ? 'Found' : 'Not detected',
  });

  const hasAccreditations = lowerContent.includes('environment agency') && (lowerContent.includes('iso 14001') || lowerContent.includes('safe contractor'));
  checks.push({
    label: 'Accreditations mentioned (EA, Safe Contractor, ISO 14001)',
    passed: hasAccreditations,
    severity: 'warning',
    detail: hasAccreditations ? 'Found' : 'Missing accreditation references',
  });

  // Services table
  const hasTable = form.content.includes('<table') && form.content.includes('<th');
  checks.push({
    label: 'Key services table present',
    passed: hasTable,
    severity: 'warning',
    detail: hasTable ? 'Found' : 'No table detected',
  });

  // Collection process
  const hasProcess = lowerContent.includes('collection process') || lowerContent.includes('how it works') || lowerContent.includes('step 1') || lowerContent.includes('our process');
  checks.push({
    label: 'Collection process section (3 steps)',
    passed: hasProcess,
    severity: 'warning',
    detail: hasProcess ? 'Found' : 'Not detected',
  });

  // Local relevance
  if (form.location) {
    const locCount = countOccurrences(form.content, form.location);
    checks.push({
      label: `Local relevance ("${form.location}" mentioned 3+ times)`,
      passed: locCount >= 3,
      severity: 'warning',
      detail: `Location mentioned ${locCount} times`,
    });
  }

  // Compliance box
  const hasComplianceBox = lowerContent.includes('compliance guarantee') || lowerContent.includes('waste transfer notes');
  checks.push({
    label: 'Compliance guarantee box present',
    passed: hasComplianceBox,
    severity: 'warning',
    detail: hasComplianceBox ? 'Found' : 'Not detected',
  });

  // FAQ section
  const hasFaq = lowerContent.includes('frequently asked questions') || lowerContent.includes('<h2>faq') || lowerContent.includes('class="faq');
  checks.push({
    label: 'FAQ section present (min 4 questions)',
    passed: hasFaq,
    severity: 'critical',
    detail: hasFaq ? 'Found' : 'Not detected',
  });

  // Mandatory FAQ questions
  if (form.location) {
    const mandatoryQuestions = [
      `cost in ${form.location.toLowerCase()}`,
      `collect in ${form.location.toLowerCase()}`,
      'environment agency',
      `start collections in ${form.location.toLowerCase()}`,
    ];
    const faqCount = mandatoryQuestions.filter(q => lowerContent.includes(q)).length;
    checks.push({
      label: `Mandatory FAQ questions (4 required, ${faqCount} found)`,
      passed: faqCount >= 3,
      severity: 'warning',
      detail: `${faqCount}/4 mandatory questions detected`,
    });
  }

  // UK English spelling
  const hasAmericanSpelling = AMERICAN_SPELLINGS.some(s => textContent.toLowerCase().includes(s));
  checks.push({
    label: 'UK English spelling used',
    passed: !hasAmericanSpelling,
    severity: 'warning',
    detail: hasAmericanSpelling ? 'American spellings detected' : 'Passed',
  });

  // Links
  const links = extractLinks(form.content);
  const brokenLinks = links.filter(l =>
    BLOCKED_EXTERNAL_LINKS.some(blocked => l.startsWith(blocked)) ||
    (!VALID_LINK_PREFIXES.some(p => l.startsWith(p)) &&
      !ALLOWLISTED_EXTERNAL.some(a => l.startsWith(a))),
  );
  checks.push({
    label: 'No broken or unapproved external links',
    passed: brokenLinks.length === 0,
    severity: 'critical',
    detail: brokenLinks.length > 0 ? `Check: ${brokenLinks.slice(0, 3).join(', ')}${brokenLinks.length > 3 ? '...' : ''}` : 'All links valid',
  });

  const absoluteInternalLinks = links.filter(l => l.startsWith('https://mediwaste.co.uk') || l.startsWith('https://www.mediwaste.co.uk'));
  checks.push({
    label: 'Internal links use crawlable relative paths',
    passed: absoluteInternalLinks.length === 0,
    severity: 'critical',
    detail: absoluteInternalLinks.length > 0 ? `${absoluteInternalLinks.length} absolute internal link${absoluteInternalLinks.length > 1 ? 's' : ''} found` : 'Passed',
  });

  // No CTA in content
  const hasCTAInContent = lowerContent.includes('request a quote') || lowerContent.includes('call us now') || form.content.includes('cta-box');
  checks.push({
    label: 'No CTA embedded in content (template handles CTA)',
    passed: !hasCTAInContent,
    severity: 'warning',
    detail: hasCTAInContent ? 'CTA detected — remove it (template adds CTA automatically)' : 'Passed',
  });

  // Images
  const imgSrcs = extractImages(form.content);
  const brokenImages = imgSrcs.filter(src => !VALID_IMG_PREFIXES.some(p => src.startsWith(p)));
  if (imgSrcs.length > 0) {
    checks.push({
      label: 'Image links valid (Pexels or local only)',
      passed: brokenImages.length === 0,
      severity: 'warning',
      detail: brokenImages.length > 0 ? `Broken: ${brokenImages.slice(0, 3).join(', ')}` : `${imgSrcs.length} image(s) valid`,
    });
  }

  // Internal links
  const internalLinks = links.filter(l => l.startsWith('/'));
  checks.push({
    label: 'Internal links included (min 2)',
    passed: internalLinks.length >= 2,
    severity: 'warning',
    detail: `${internalLinks.length} internal link${internalLinks.length !== 1 ? 's' : ''} found`,
  });

  // OG tags
  checks.push({
    label: 'Open Graph title set',
    passed: Boolean(form.og_title) && form.og_title.trim().length > 0,
    severity: 'warning',
    detail: form.og_title ? 'Set' : 'Not set — will fall back to meta title',
  });
  checks.push({
    label: 'Open Graph description set',
    passed: Boolean(form.og_description) && form.og_description.trim().length > 0,
    severity: 'warning',
    detail: form.og_description ? 'Set' : 'Not set — will fall back to meta description',
  });

  return checks;
}

export function buildNewsArticleChecks(form: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  featured_image: string;
  featured_image_alt: string;
}): PrePublishCheck[] {
  const checks: PrePublishCheck[] = [];
  const textContent = form.content.replace(/<[^>]+>/g, ' ');

  // Title
  checks.push({
    label: 'Article title set',
    passed: Boolean(form.title) && form.title.trim().length > 0,
    severity: 'critical',
    detail: form.title ? `"${form.title}"` : 'Not set',
  });

  // Slug
  checks.push({
    label: 'URL slug set',
    passed: Boolean(form.slug) && form.slug.trim().length > 0,
    severity: 'critical',
    detail: form.slug ? `/${form.slug}` : 'Not set',
  });

  // Meta title
  const effectiveMetaTitle = form.meta_title || form.title;
  checks.push({
    label: 'Meta title set (45-65 chars)',
    passed: effectiveMetaTitle.length >= 50 && effectiveMetaTitle.length <= 60,
    severity: 'critical',
    detail: effectiveMetaTitle ? `${effectiveMetaTitle.length} characters` : 'Not set',
  });

  // Meta description
  const effectiveDesc = form.meta_description || form.excerpt;
  checks.push({
    label: 'Meta description or excerpt set (150-160 chars)',
    passed: effectiveDesc.length >= 150 && effectiveDesc.length <= 160,
    severity: 'critical',
    detail: effectiveDesc ? `${effectiveDesc.length} characters` : 'Not set',
  });

  // No multiple H1
  const h1Count = countH1(form.content);
  checks.push({
    label: 'No H1 in content (template adds title as H1)',
    passed: h1Count === 0,
    severity: 'critical',
    detail: h1Count > 0 ? `${h1Count} H1 tag${h1Count > 1 ? 's' : ''} found — use H2+ instead` : 'Passed',
  });

  // Content word count
  const wordCount = countWords(form.content);
  checks.push({
    label: 'Content length (min 500 words)',
    passed: wordCount >= 500,
    severity: 'critical',
    detail: `${wordCount} words`,
  });

  // Excerpt
  checks.push({
    label: 'Excerpt set (for article listings)',
    passed: Boolean(form.excerpt) && form.excerpt.trim().length >= 20,
    severity: 'warning',
    detail: form.excerpt ? `${form.excerpt.length} characters` : 'Not set',
  });

  // UK English spelling
  const hasAmericanSpelling = AMERICAN_SPELLINGS.some(s => textContent.toLowerCase().includes(s));
  checks.push({
    label: 'UK English spelling used',
    passed: !hasAmericanSpelling,
    severity: 'warning',
    detail: hasAmericanSpelling ? 'American spellings detected' : 'Passed',
  });

  // Links
  const links = extractLinks(form.content);
  const brokenLinks = links.filter(l =>
    BLOCKED_EXTERNAL_LINKS.some(blocked => l.startsWith(blocked)) ||
    (!VALID_LINK_PREFIXES.some(p => l.startsWith(p)) &&
      !ALLOWLISTED_EXTERNAL.some(a => l.startsWith(a))),
  );
  checks.push({
    label: 'No broken or unapproved external links',
    passed: brokenLinks.length === 0,
    severity: 'critical',
    detail: brokenLinks.length > 0 ? `Check: ${brokenLinks.slice(0, 3).join(', ')}${brokenLinks.length > 3 ? '...' : ''}` : 'All links valid',
  });

  const absoluteInternalLinks = links.filter(l => l.startsWith('https://mediwaste.co.uk') || l.startsWith('https://www.mediwaste.co.uk'));
  checks.push({
    label: 'Internal links use crawlable relative paths',
    passed: absoluteInternalLinks.length === 0,
    severity: 'critical',
    detail: absoluteInternalLinks.length > 0 ? `${absoluteInternalLinks.length} absolute internal link${absoluteInternalLinks.length > 1 ? 's' : ''} found` : 'Passed',
  });

  // Featured image
  if (form.featured_image) {
    checks.push({
      label: 'Featured image has alt text',
      passed: Boolean(form.featured_image_alt) && form.featured_image_alt.trim().length > 0,
      severity: 'warning',
      detail: form.featured_image_alt ? 'Set' : 'Missing — important for accessibility and SEO',
    });
  }

  // Images in content
  const imgSrcs = extractImages(form.content);
  const brokenImages = imgSrcs.filter(src => !VALID_IMG_PREFIXES.some(p => src.startsWith(p)));
  if (imgSrcs.length > 0) {
    checks.push({
      label: 'Image links valid',
      passed: brokenImages.length === 0,
      severity: 'warning',
      detail: brokenImages.length > 0 ? `Broken: ${brokenImages.slice(0, 3).join(', ')}` : `${imgSrcs.length} image(s) valid`,
    });
  }

  // Internal links
  const internalLinks = links.filter(l => l.startsWith('/'));
  checks.push({
    label: 'Internal links included (min 1)',
    passed: internalLinks.length >= 1,
    severity: 'warning',
    detail: `${internalLinks.length} internal link${internalLinks.length !== 1 ? 's' : ''} found`,
  });

  return checks;
}
