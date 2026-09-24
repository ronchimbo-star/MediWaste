import type { InvoiceLineItem } from '../types/invoice';

export function calculateLineTotals(item: {
  quantity: number;
  unit_price: number;
  vat_rate: number;
}): { lineNet: number; lineVat: number; lineTotal: number } {
  const lineNet = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  const lineVat = lineNet * ((Number(item.vat_rate) || 0) / 100);
  const lineTotal = lineNet + lineVat;
  return { lineNet, lineVat, lineTotal };
}

export function calculateInvoiceTotals(items: InvoiceLineItem[], discountAmount: number = 0) {
  let subtotal = 0;
  let vatAmount = 0;

  for (const item of items) {
    const { lineNet, lineVat } = calculateLineTotals(item);
    subtotal += lineNet;
    vatAmount += lineVat;
  }

  const total = subtotal + vatAmount - (Number(discountAmount) || 0);
  return { subtotal, vatAmount, total };
}

export function formatGBP(amount: number): string {
  return `£${(Number(amount) || 0).toFixed(2)}`;
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isOverdue(invoice: { due_date: string; status: string }): boolean {
  if (['paid', 'cancelled', 'void', 'draft'].includes(invoice.status)) return false;
  return new Date(invoice.due_date) < new Date();
}

export function daysOverdue(dueDate: string): number {
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review_required: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  sent: 'bg-indigo-100 text-indigo-700',
  viewed: 'bg-cyan-100 text-cyan-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
  void: 'bg-gray-300 text-gray-500',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  review_required: 'Review Required',
  approved: 'Approved',
  sent: 'Sent',
  viewed: 'Viewed',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  void: 'Void',
};
