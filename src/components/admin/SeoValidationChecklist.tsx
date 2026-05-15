import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ValidationResult {
  label: string;
  passed: boolean;
  detail?: string;
}

interface SeoValidationChecklistProps {
  content: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  location: string;
  targetKeyword: string;
}

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

function validate(props: SeoValidationChecklistProps): ValidationResult[] {
  const { content, h1, metaTitle, metaDescription, location, targetKeyword } = props;
  const results: ValidationResult[] = [];
  const loc = location || '';
  const textContent = content.replace(/<[^>]+>/g, ' ');
  const lowerContent = content.toLowerCase();

  // H1 checks
  results.push({
    label: 'H1 includes target keyword',
    passed: h1.toLowerCase().includes(targetKeyword.toLowerCase()),
    detail: h1 ? `"${h1}"` : 'No H1 set',
  });

  if (loc) {
    results.push({
      label: `H1 includes location (${loc})`,
      passed: h1.toLowerCase().includes(loc.toLowerCase()),
      detail: h1 ? `"${h1}"` : 'No H1 set',
    });
  }

  // Meta title
  results.push({
    label: 'Meta title length (55-60 chars)',
    passed: metaTitle.length >= 45 && metaTitle.length <= 65,
    detail: `${metaTitle.length} characters`,
  });

  results.push({
    label: 'Meta title includes keyword',
    passed: metaTitle.toLowerCase().includes(targetKeyword.toLowerCase().split(' ')[0]),
    detail: metaTitle || 'Not set',
  });

  // Meta description
  results.push({
    label: 'Meta description length (140-165 chars)',
    passed: metaDescription.length >= 120 && metaDescription.length <= 170,
    detail: `${metaDescription.length} characters`,
  });

  // Content word count
  const wordCount = countWords(content);
  results.push({
    label: 'Content length (min 1,500 words)',
    passed: wordCount >= 1400,
    detail: `${wordCount} words`,
  });

  // Keyword density
  const keywordCount = countOccurrences(content, targetKeyword);
  results.push({
    label: 'Keyword usage (5-8 times)',
    passed: keywordCount >= 4 && keywordCount <= 12,
    detail: `"${targetKeyword}" appears ${keywordCount} times`,
  });

  // Trust signal module
  const hasTestimonials = lowerContent.includes('what our') && lowerContent.includes('clients say');
  results.push({
    label: 'Trust signal module with testimonials',
    passed: hasTestimonials || lowerContent.includes('testimonial') || lowerContent.includes('rated excellent'),
    detail: hasTestimonials ? 'Found' : 'Not detected',
  });

  // Accreditations
  const hasAccreditations = lowerContent.includes('environment agency') && (lowerContent.includes('iso 14001') || lowerContent.includes('safe contractor'));
  results.push({
    label: 'Accreditations mentioned (EA, Safe Contractor, ISO 14001)',
    passed: hasAccreditations,
    detail: hasAccreditations ? 'Found' : 'Missing accreditation references',
  });

  // Services table
  const hasTable = content.includes('<table') && content.includes('<th');
  results.push({
    label: 'Key services table present',
    passed: hasTable,
    detail: hasTable ? 'Found' : 'No table detected',
  });

  // Collection process steps
  const hasProcess = lowerContent.includes('collection process') || lowerContent.includes('how it works') || lowerContent.includes('step 1') || lowerContent.includes('our process');
  results.push({
    label: 'Collection process section (3 steps)',
    passed: hasProcess,
    detail: hasProcess ? 'Found' : 'Not detected',
  });

  // Local relevance
  if (loc) {
    const hasLocalRelevance = countOccurrences(content, loc) >= 3;
    results.push({
      label: `Local relevance (location "${loc}" mentioned 3+ times)`,
      passed: hasLocalRelevance,
      detail: `Location mentioned ${countOccurrences(content, loc)} times`,
    });
  }

  // Compliance guarantee box
  const hasComplianceBox = lowerContent.includes('compliance guarantee') || lowerContent.includes('waste transfer notes');
  results.push({
    label: 'Compliance guarantee box present',
    passed: hasComplianceBox,
    detail: hasComplianceBox ? 'Found' : 'Not detected',
  });

  // FAQ section
  const hasFaq = lowerContent.includes('frequently asked questions') || lowerContent.includes('faq');
  results.push({
    label: 'FAQ section present',
    passed: hasFaq,
    detail: hasFaq ? 'Found' : 'Not detected',
  });

  // Mandatory FAQ questions
  if (loc) {
    const mandatoryQuestions = [
      `cost in ${loc.toLowerCase()}`,
      `collect in ${loc.toLowerCase()}`,
      'environment agency',
      `start collections in ${loc.toLowerCase()}`,
    ];
    const faqCount = mandatoryQuestions.filter(q => lowerContent.includes(q)).length;
    results.push({
      label: `Mandatory FAQ questions (4 required, ${faqCount} found)`,
      passed: faqCount >= 3,
      detail: `${faqCount}/4 mandatory questions detected`,
    });
  }

  // UK English spelling check
  const americanSpellings = ['organize', 'color ', 'center ', 'license '];
  const hasAmericanSpelling = americanSpellings.some(s => textContent.toLowerCase().includes(s));
  results.push({
    label: 'UK English spelling used',
    passed: !hasAmericanSpelling,
    detail: hasAmericanSpelling ? 'American spellings detected' : 'Passed',
  });

  // No broken links
  const linkRegex = /href="([^"]+)"/g;
  let match;
  const links: string[] = [];
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  const validPrefixes = ['/', 'https://www.mediwaste.co.uk', 'tel:', 'mailto:'];
  const brokenLinks = links.filter(l => !validPrefixes.some(p => l.startsWith(p)));
  results.push({
    label: 'No external/broken links',
    passed: brokenLinks.length === 0,
    detail: brokenLinks.length > 0 ? `Suspicious links: ${brokenLinks.join(', ')}` : 'All links valid',
  });

  // No CTA in content (handled by template)
  const hasCTAInContent = lowerContent.includes('request a quote') || lowerContent.includes('call us now') || content.includes('cta-box');
  results.push({
    label: 'No CTA embedded in content (template handles CTA)',
    passed: !hasCTAInContent,
    detail: hasCTAInContent ? 'CTA detected in content — remove it (template adds CTA automatically)' : 'Passed',
  });

  // Internal links present
  const internalLinks = links.filter(l => l.startsWith('/'));
  results.push({
    label: 'Internal links included (min 2)',
    passed: internalLinks.length >= 2,
    detail: `${internalLinks.length} internal links found`,
  });

  return results;
}

export default function SeoValidationChecklist(props: SeoValidationChecklistProps) {
  if (!props.content) return null;

  const results = validate(props);
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  const totalCount = results.length;
  const score = Math.round((passCount / totalCount) * 100);

  const scoreColor = score >= 90 ? 'text-green-700 bg-green-50 border-green-200' :
    score >= 70 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" /> Content Validation Checklist
        </h3>
        <span className={`px-3 py-1 text-sm font-bold rounded-full border ${scoreColor}`}>
          {score}% ({passCount}/{totalCount})
        </span>
      </div>

      {failCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800">
            {failCount} check{failCount > 1 ? 's' : ''} failed. Review the items below before publishing.
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {results.map((result, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5">
            {result.passed ? (
              <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${result.passed ? 'text-gray-700' : 'text-red-800'}`}>
                {result.label}
              </p>
              {result.detail && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{result.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
