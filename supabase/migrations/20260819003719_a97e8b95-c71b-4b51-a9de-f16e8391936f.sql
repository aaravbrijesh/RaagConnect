CREATE POLICY "Guests can upload event images to guest folder"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'event-images' AND (storage.foldername(name))[1] = 'guest');