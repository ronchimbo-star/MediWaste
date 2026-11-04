import { supabase } from './supabase';

const DOCUMENT_LINKS = {
  certificate: { table: 'mw_certificate_customers', column: 'certificate_id' },
  wtn: { table: 'mw_wtn_customers', column: 'wtn_id' },
  hwcn: { table: 'mw_hwcn_customers', column: 'hwcn_id' },
} as const;

export type DocumentKind = keyof typeof DOCUMENT_LINKS;

export async function fetchAdditionalCustomerIds(
  kind: DocumentKind,
  documentId: string,
  primaryCustomerId: string,
): Promise<string[]> {
  const { table, column } = DOCUMENT_LINKS[kind];
  const { data, error } = await supabase.from(table).select('customer_id').eq(column, documentId);
  if (error) throw error;
  return (data || []).map((row) => row.customer_id as string).filter((id) => id !== primaryCustomerId);
}

export async function fetchLinkedDocumentIds(kind: DocumentKind, customerIds: string[]): Promise<string[]> {
  if (customerIds.length === 0) return [];
  const { table, column } = DOCUMENT_LINKS[kind];
  const { data, error } = await supabase.from(table).select(column).in('customer_id', customerIds);
  if (error) throw error;
  return [...new Set((data || []).map((row) => (row as Record<string, string>)[column]))];
}

export async function saveSharedCustomerIds(
  kind: DocumentKind,
  documentId: string,
  primaryCustomerId: string,
  additionalIds: string[],
): Promise<void> {
  const { table, column } = DOCUMENT_LINKS[kind];
  const desired = new Set([primaryCustomerId, ...additionalIds]);

  const { data, error } = await supabase.from(table).select('customer_id').eq(column, documentId);
  if (error) throw error;
  const existing = new Set((data || []).map((row) => row.customer_id as string));

  const toRemove = [...existing].filter((id) => !desired.has(id));
  const toAdd = [...desired].filter((id) => !existing.has(id));

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from(table)
      .delete()
      .eq(column, documentId)
      .in('customer_id', toRemove);
    if (removeError) throw removeError;
  }

  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from(table)
      .insert(toAdd.map((customer_id) => ({ [column]: documentId, customer_id })));
    if (addError) throw addError;
  }
}
