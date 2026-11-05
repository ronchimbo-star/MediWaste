import { renderElementToPDF } from './pdfDownload';

export async function downloadAuditAsPDF(auditNumber: string): Promise<void> {
  await renderElementToPDF({
    elementId: 'audit-render',
    fileName: `waste-audit-${auditNumber}.pdf`,
    scale: 2,
    marginTop: 8,
    marginBottom: 12,
    noBreakSelectors: ['table', '.audit-section', '.declaration-block', '.no-break'],
  });
}
