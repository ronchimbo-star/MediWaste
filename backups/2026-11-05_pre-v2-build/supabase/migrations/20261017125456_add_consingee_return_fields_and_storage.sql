/*
# Add Consignee Return Reference, Document Upload, and Storage Bucket

## Purpose
When the consignee facility returns their copy of a hazardous waste consignment note, the admin needs to record:
1. A reference number from the returned document
2. An uploaded image/scan of the returned consignee copy

## Changes

### 1. New columns on `mw_hw_consignment_notes`
- `consignee_return_reference` (text) — reference number from the consignee's returned copy
- `consignee_return_document_url` (text) — storage URL for an uploaded scan/photo of the consignee return

### 2. New storage bucket
- `hwcn-documents` (public) — stores uploaded consignee return documents (scans/photos)

### 3. Storage policies
- Public read access to `hwcn-documents` bucket (so customers can view returned documents)
- Authenticated upload access (admin only uploads)

## Security
- New columns inherit existing RLS policies on `mw_hw_consignment_notes` (public read, authenticated write)
- Storage bucket: public read, authenticated upload only
*/

-- Add new columns to mw_hw_consignment_notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_hw_consignment_notes' AND column_name = 'consignee_return_reference') THEN
    ALTER TABLE mw_hw_consignment_notes ADD COLUMN consignee_return_reference text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_hw_consignment_notes' AND column_name = 'consignee_return_document_url') THEN
    ALTER TABLE mw_hw_consignment_notes ADD COLUMN consignee_return_document_url text;
  END IF;
END $$;

-- Create storage bucket for HWCN consignee return documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('hwcn-documents', 'hwcn-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hwcn-documents bucket
DROP POLICY IF EXISTS "public_read_hwcn_documents" ON storage.objects;
CREATE POLICY "public_read_hwcn_documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'hwcn-documents');

DROP POLICY IF EXISTS "auth_upload_hwcn_documents" ON storage.objects;
CREATE POLICY "auth_upload_hwcn_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hwcn-documents');

DROP POLICY IF EXISTS "auth_update_hwcn_documents" ON storage.objects;
CREATE POLICY "auth_update_hwcn_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hwcn-documents') WITH CHECK (bucket_id = 'hwcn-documents');

DROP POLICY IF EXISTS "auth_delete_hwcn_documents" ON storage.objects;
CREATE POLICY "auth_delete_hwcn_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hwcn-documents');
