ALTER TABLE public.mainframe_imports ADD COLUMN IF NOT EXISTS file_url text DEFAULT NULL;

-- Create storage bucket for import files
INSERT INTO storage.buckets (id, name, public) VALUES ('import-files', 'import-files', true) ON CONFLICT (id) DO NOTHING;

-- RLS for import-files bucket
CREATE POLICY "Allow public read import files" ON storage.objects FOR SELECT USING (bucket_id = 'import-files');
CREATE POLICY "Allow public insert import files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'import-files');
CREATE POLICY "Allow public delete import files" ON storage.objects FOR DELETE USING (bucket_id = 'import-files');