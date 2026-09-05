import { FileText, Award, CheckCircle, ShieldCheck } from 'lucide-react';

export interface AuditContent {
  practice_details?: {
    info_table?: string[][];
    functional_areas_table?: string[][];
  };
  waste_streams_summary?: string[][];
  detailed_assessment?: {
    name: string;
    table: string[][];
    findings: string;
  }[];
  segregation_storage?: {
    segregation_table?: string[][];
    storage_table?: string[][];
    training_table?: string[][];
  };
  classification?: string[][];
  compliance?: {
    summary_table?: string[][];
    recommendations_table?: string[][];
  };
  auditor_declaration?: {
    name?: string;
    title?: string;
    signature?: string;
    date?: string;
  };
  practice_declaration?: {
    name?: string;
    title?: string;
    signature?: string;
    date?: string;
  };
}

interface Props {
  content: AuditContent | null;
  practiceName?: string;
  legalEntity?: string;
  address?: string;
  auditNumber?: string;
  auditorName?: string;
  auditorTitle?: string;
  adminSignedAt?: string | null;
  clientSignedAt?: string | null;
  clientRepresentativeName?: string | null;
  clientRepresentativeTitle?: string | null;
  editable?: boolean;
  onContentChange?: (content: AuditContent) => void;
}

export default function AuditRenderer({ content, practiceName, legalEntity, address, auditNumber, auditorName, auditorTitle, adminSignedAt, clientSignedAt, clientRepresentativeName, clientRepresentativeTitle, editable, onContentChange }: Props) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p>No content generated yet</p>
      </div>
    );
  }

  const updateField = (path: string, value: string) => {
    if (!onContentChange || !editable) return;
    const updated = JSON.parse(JSON.stringify(content));
    const keys = path.split('.');
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    onContentChange(updated);
  };

  const updateCell = (tablePath: string, rowIdx: number, colIdx: number, value: string) => {
    if (!onContentChange || !editable) return;
    const updated = JSON.parse(JSON.stringify(content));
    const keys = tablePath.split('.');
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    const table = obj[keys[keys.length - 1]];
    if (table && table[rowIdx]) table[rowIdx][colIdx] = value;
    onContentChange(updated);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0056b3] to-[#004494] px-8 py-6 text-center">
        <h1 className="text-white text-xl font-bold tracking-wide">PRE-ACCEPTANCE WASTE AUDIT</h1>
        {practiceName && <p className="text-blue-100 text-sm mt-1">{practiceName}</p>}
        {legalEntity && legalEntity !== practiceName && <p className="text-blue-200 text-xs mt-0.5">Trading as: {legalEntity}</p>}
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* Meta info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {address && (
            <div><span className="text-gray-500 font-medium">Address:</span> <span className="text-gray-800">{address}</span></div>
          )}
          {auditNumber && (
            <div><span className="text-gray-500 font-medium">Audit No:</span> <span className="text-gray-800 font-mono">{auditNumber}</span></div>
          )}
          {auditorName && (
            <div><span className="text-gray-500 font-medium">Auditor:</span> <span className="text-gray-800">{auditorName}{auditorTitle ? `, ${auditorTitle}` : ''}</span></div>
          )}
        </div>

        {/* Section 1: Practice Details */}
        {content.practice_details?.info_table && (
          <Section number="1" title="Practice & Site Details" icon={<ShieldCheck className="w-4 h-4" />}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">1.1 Practice Information</h4>
            <DataTable rows={content.practice_details.info_table} editable={editable} onCellChange={(r, c, v) => updateCell('practice_details.info_table', r, c, v)} />
            {content.practice_details.functional_areas_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">1.2 Functional Areas & Waste Generation Points</h4>
                <DataTable rows={content.practice_details.functional_areas_table} editable={editable} onCellChange={(r, c, v) => updateCell('practice_details.functional_areas_table', r, c, v)} />
              </>
            )}
          </Section>
        )}

        {/* Section 2: Waste Streams Summary */}
        {content.waste_streams_summary && (
          <Section number="2" title="Waste Streams Identified" icon={<FileText className="w-4 h-4" />}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">2.1 Summary of Waste Streams</h4>
            <DataTable rows={content.waste_streams_summary} editable={editable} onCellChange={(r, c, v) => updateCell('waste_streams_summary', r, c, v)} />
          </Section>
        )}

        {/* Section 3: Detailed Assessment */}
        {content.detailed_assessment && content.detailed_assessment.length > 0 && (
          <Section number="3" title="Detailed Waste Stream Assessment" icon={<Award className="w-4 h-4" />}>
            {content.detailed_assessment.map((stream, idx) => (
              <div key={idx} className="mb-6">
                <h4 className="text-sm font-semibold text-[#0056b3] mb-2">3.{idx + 1} {stream.name}</h4>
                <DataTable rows={stream.table} editable={editable} onCellChange={(r, c, v) => {
                  if (!onContentChange || !editable) return;
                  const updated = JSON.parse(JSON.stringify(content));
                  updated.detailed_assessment[idx].table[r][c] = v;
                  onContentChange(updated);
                }} />
                {stream.findings && (
                  <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Audit Findings: </span>
                      {stream.findings}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Section 4: Segregation & Storage */}
        {content.segregation_storage && (
          <Section number="4" title="Segregation & Storage Observations" icon={<CheckCircle className="w-4 h-4" />}>
            {content.segregation_storage.segregation_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">4.1 Segregation Practices</h4>
                <DataTable rows={content.segregation_storage.segregation_table} editable={editable} onCellChange={(r, c, v) => updateCell('segregation_storage.segregation_table', r, c, v)} />
              </>
            )}
            {content.segregation_storage.storage_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">4.2 Storage Arrangements</h4>
                <DataTable rows={content.segregation_storage.storage_table} editable={editable} onCellChange={(r, c, v) => updateCell('segregation_storage.storage_table', r, c, v)} />
              </>
            )}
            {content.segregation_storage.training_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">4.3 Staff Training</h4>
                <DataTable rows={content.segregation_storage.training_table} editable={editable} onCellChange={(r, c, v) => updateCell('segregation_storage.training_table', r, c, v)} />
              </>
            )}
          </Section>
        )}

        {/* Section 5: Classification */}
        {content.classification && (
          <Section number="5" title="Waste Classification & Coding" icon={<FileText className="w-4 h-4" />}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">5.1 EWC Codes Used</h4>
            <DataTable rows={content.classification} editable={editable} onCellChange={(r, c, v) => updateCell('classification', r, c, v)} />
          </Section>
        )}

        {/* Section 6: Compliance */}
        {content.compliance && (
          <Section number="6" title="Compliance & Recommendations" icon={<ShieldCheck className="w-4 h-4" />}>
            {content.compliance.summary_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">6.1 Summary of Compliance</h4>
                <DataTable rows={content.compliance.summary_table} editable={editable} onCellChange={(r, c, v) => updateCell('compliance.summary_table', r, c, v)} />
              </>
            )}
            {content.compliance.recommendations_table && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">6.2 Recommendations</h4>
                <DataTable rows={content.compliance.recommendations_table} editable={editable} onCellChange={(r, c, v) => updateCell('compliance.recommendations_table', r, c, v)} />
              </>
            )}
          </Section>
        )}

        {/* Section 7: Auditor Declaration */}
        {content.auditor_declaration && (
          <Section number="7" title="Auditor Declaration" icon={<Award className="w-4 h-4" />}>
            <p className="text-sm text-gray-600 mb-3">
              I, {auditorName || content.auditor_declaration.name || '[Name]'}, confirm that the waste streams identified in this audit have been assessed in accordance with the requirements of the Hazardous Waste Regulations 2005, HTM 07-01, and the Environmental Protection Act 1990.
            </p>
            <DeclarationBlock
              label="Auditor"
              name={auditorName || content.auditor_declaration.name || ''}
              title={auditorTitle || content.auditor_declaration.title || ''}
              signedAt={adminSignedAt ?? null}
              editable={editable}
              onNameChange={(v) => updateField('auditor_declaration.name', v)}
              onTitleChange={(v) => updateField('auditor_declaration.title', v)}
            />
          </Section>
        )}

        {/* Section 8: Practice Declaration */}
        {content.practice_declaration && (
          <Section number="8" title="Practice Declaration" icon={<Award className="w-4 h-4" />}>
            <p className="text-sm text-gray-600 mb-3">
              I, {clientRepresentativeName || content.practice_declaration.name || '[Name]'}, confirm that I have reviewed the waste streams identified in this audit and agree to maintain the segregation and storage practices outlined in this report.
            </p>
            <DeclarationBlock
              label="Practice Representative"
              name={clientRepresentativeName || content.practice_declaration.name || ''}
              title={clientRepresentativeTitle || content.practice_declaration.title || ''}
              signedAt={clientSignedAt ?? null}
              editable={editable}
              onNameChange={(v) => updateField('practice_declaration.name', v)}
              onTitleChange={(v) => updateField('practice_declaration.title', v)}
            />
          </Section>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-400">© MediWaste — Clinical Waste Management Solutions</p>
          <p className="text-xs text-gray-400 mt-1">This document is confidential and intended solely for the practice named above.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, icon, children }: { number: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-[#0056b3]">
        <span className="w-6 h-6 rounded-full bg-[#0056b3] text-white text-xs font-bold flex items-center justify-center">{number}</span>
        <h3 className="text-base font-bold text-[#0056b3]">{title}</h3>
        <span className="text-blue-400">{icon}</span>
      </div>
      {children}
    </div>
  );
}

function DataTable({ rows, editable, onCellChange }: { rows: string[][]; editable?: boolean; onCellChange?: (r: number, c: number, v: string) => void }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#0056b3] text-white">
            {rows[0].map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium border border-blue-700">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border border-gray-200 text-gray-700">
                  {editable && onCellChange ? (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => onCellChange(ri + 1, ci, e.target.value)}
                      className="w-full bg-transparent focus:bg-blue-50 focus:outline-none px-1 py-0.5 rounded"
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: formatCell(cell) }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(text: string): string {
  return text
    .replace(/✅/g, '<span style="color:#28a745;font-weight:600;">✅</span>')
    .replace(/⚠️/g, '<span style="color:#fd7e14;font-weight:600;">⚠️</span>')
    .replace(/❌/g, '<span style="color:#dc3545;font-weight:600;">❌</span>')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/✅/g, '<span style="color:#28a745;font-weight:600;">✅</span>')
    .replace(/⚠️/g, '<span style="color:#fd7e14;font-weight:600;">⚠️</span>')
    .replace(/❌/g, '<span style="color:#dc3545;font-weight:600;">❌</span>');
}

function DeclarationBlock({ label, name, title, signedAt, editable, onNameChange, onTitleChange }: {
  label: string;
  name: string;
  title: string;
  signedAt: string | null;
  editable?: boolean;
  onNameChange?: (v: string) => void;
  onTitleChange?: (v: string) => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 font-medium">{label} Name:</span>{' '}
          {editable && onNameChange ? (
            <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} className="bg-white px-2 py-1 border border-gray-300 rounded text-sm" />
          ) : (
            <span className="text-gray-800">{name || '—'}</span>
          )}
        </div>
        <div>
          <span className="text-gray-500 font-medium">Job Title:</span>{' '}
          {editable && onTitleChange ? (
            <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)} className="bg-white px-2 py-1 border border-gray-300 rounded text-sm" />
          ) : (
            <span className="text-gray-800">{title || '—'}</span>
          )}
        </div>
        <div>
          <span className="text-gray-500 font-medium">Signature:</span>{' '}
          {signedAt ? (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Signed on {new Date(signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-gray-400 italic">_________________________</span>
          )}
        </div>
        <div>
          <span className="text-gray-500 font-medium">Date:</span>{' '}
          <span className="text-gray-800">{signedAt ? new Date(signedAt).toLocaleDateString('en-GB') : '—'}</span>
        </div>
      </div>
    </div>
  );
}
