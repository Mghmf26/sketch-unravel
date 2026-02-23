-- Add image_url to business_processes
ALTER TABLE public.business_processes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for process images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('process-images', 'process-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for process-images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'process-images');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'process-images');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'process-images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'process-images');
